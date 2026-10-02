import { randomUUID } from "node:crypto";
import type { AgentProvider, StageId } from "../types";
import { agentProviderLabel } from "../agent-providers";
import { antigravityExecArgs, antigravityStdin, claudeExecArgs, codexExecArgs, sanitizedAgentEnv } from "./agent-cli";
import { resolveAgentBin } from "./agent-step";
import { createStreamParser, short, type AgentEvent } from "./agent-stream";
import { finishJob, log, ownJob, recordJobMetrics, run, setProgress, startJob, wasStopped } from "./jobs";
import { REPO } from "./paths";
import { beginHarness, endHarness, HARNESS_STEPS, stepDone, stepError, stepStart } from "./harness";
import { runCuesGate, runFinalGate, runSceneQa } from "./qa";
import { styleGuideLine } from "./style-guides";
import { scenesImagesLine } from "./images";
import { readState, setStage, styleName, updateState } from "./videos";
import { readFeedback, recordFeedback, updateFeedback, updateFeedbackWhere } from "./workflow";

export type AgentStage = Extract<StageId, "cues" | "scenes" | "deliver">;

/**
 * Claude uses an explicit command/tool allowlist in addition to the repository instructions.
 *
 * On Windows the CLI's shell tool is PowerShell, not Bash — mirror every shell pattern to both so an
 * allowed command isn't silently denied just because it ran through the other shell tool.
 */
const shellPatterns = (cmds: string[]) => cmds.flatMap((c) => [`Bash(${c})`, `PowerShell(${c})`]);

const ALLOWED = [
  "Read", "Edit", "Write", "Glob", "Grep", "TodoWrite", "Task", "Agent",
  ...shellPatterns([
    "cd *", "node tools/*",
    "ls *", "mkdir *", "cp *", "mv *", "wc *", "head *", "sort *",
  ]),
];
/**
 * What the shell allowlist above actually lets through, told to the agent up front. Measured on a real run
 * (d3-01-lab, issue #71): 35 of 104 Bash calls were refused and cost ~17% of the scene window in refusals and
 * retries — 19 were `cd <dir> && …` (the allowlist matches the command AFTER `cd`, and a relative `../tools/…`
 * path is not `tools/*`), 10 were `node -e`. Widening the list for `node -e` would allow arbitrary code (it could
 * read `.env`, which `Read` denies), so the agent is told the rules instead.
 */
export const SHELL_RULES_LINE =
  "Quy tắc shell (lệnh sai bị chặn và tốn thêm một lượt): thư mục làm việc đã là gốc repo nên KHÔNG `cd`; chỉ chạy `node tools/<script>` (đường dẫn bắt đầu bằng `tools/`), `ls`, `mkdir`, `cp`, `mv`, `wc`, `head`, `sort`. KHÔNG `node -e`, heredoc hay `python`: đọc file bằng Read/Grep, sửa bằng Edit/Write.";

const DENIED = [
  "Read(**/.env)", "Read(**/.env.*)",
  ...shellPatterns(["*.env*", "git push*", "git commit*"]),
  "DesignSync", "RemoteTrigger", "CronCreate", "SendMessage", "WebFetch", "WebSearch",
];

const STAGE_TASK: Record<AgentStage, string> = {
  cues: "Stage 1 · cues: đọc kịch bản và improvement plan, viết cues.js (lời nguyên văn), voice.js rỗng, pronounce.json nếu cần. KHÔNG dựng cảnh. Runner tự chạy TTS dry-run (miễn phí) sau khi bạn dừng để bắt speaker/delivery sai.",
  scenes: "Stage 3 · scenes: giọng đã được ghi và gắn (voice.js có mốc từng từ, cues.js đã có frames/speech thật). Chỉ dựng/sửa toàn bộ cảnh theo đúng thời lượng này. Runner sẽ build, verify, chụp ảnh và giao một phiên QA độc lập (chỉ đọc) sau khi bạn dừng.",
  deliver: "Stage 5 · deliver: MP4 và transcript đã có. Chỉ viết file chương và PROMPTS.md. Runner chịu final gate.",
};

function feedbackContext(id: string, stage: AgentStage) {
  const items = readFeedback(REPO, id).filter((item: { stage: string; status: string }) =>
    item.stage === stage && ["open", "planned", "applied"].includes(item.status));
  if (!items.length) return "Không có feedback đang mở cho stage này.";
  return [
    "Improvement plan đang mở:",
    ...items.map((item: { id: string; severity: string; message: string; evidence?: string; acceptance: string }) =>
      `- ${item.id} [${item.severity}]${item.evidence ? ` (${item.evidence})` : ""}: ${item.message} | Nghiệm thu: ${item.acceptance}`),
  ].join("\n");
}

function stagePrompt(id: string, stage: AgentStage, base: string) {
  const { state } = readState(id);
  const r = state.request;
  return [
    `Bạn đang chạy trong Video Studio (web local) cho video \`${id}\` (${r.day}, style ${styleName(r.style)}).`,
    "Dùng skill make-video: đọc `.claude/skills/make-video/SKILL.md` và làm đúng chỉ dẫn ở đó.",
    `Yêu cầu của video: \`projects/${id}/REQUEST.md\`. Style: \`styles/${r.style}.json\` (luật của style được ưu tiên).`,
    styleGuideLine(r.style),
    `Việc cần làm lần này — ${STAGE_TASK[stage].replace("<id>", id)}`,
    ...(stage === "scenes" ? [scenesImagesLine(id, r.modules)].filter((line): line is string => Boolean(line)) : []),
    `Preview server (dùng làm <base> khi chụp QA): ${base}/ds`,
    feedbackContext(id, stage),
    SHELL_RULES_LINE,
    ...(stage === "scenes"
      ? [selfCheckLine(id), "Chỉ tạo/sửa nội dung của stage này rồi dừng. Không chạy shoot, render, TTS, không đọc .env, không git commit/push, không /design-sync."]
      : ["Chỉ tạo/sửa nội dung của stage này rồi dừng. Không chạy build, verify, shoot, render, TTS, không đọc .env, không git commit/push, không /design-sync."]),
    "Kết thúc bằng một bản tóm tắt ngắn bằng tiếng Việt: đã làm gì, điểm cần người dùng xem, câu hỏi còn mở.",
  ].filter(Boolean).join("\n");
}

/**
 * The scenes gate (build + verify) only ran AFTER the agent stopped, so every defect it caught cost a whole new
 * agent turn: the session is re-read from cache and the context re-loaded just to fix one id. verify takes
 * about a second; the turn takes minutes. Let the agent run the same two commands itself before it stops.
 * `node tools/*` is already in the allowlist, and these are the commands `npm run build` / `verify` wrap.
 */
const selfCheckLine = (id: string) =>
  `Trước khi dừng, tự chạy \`node tools/build.mjs && node tools/verify.mjs --video ${id}\` (mỗi lần ~vài giây). Có "problem" thì sửa rồi chạy lại, tối đa 3 lần; warning thì bỏ qua. Runner vẫn chạy lại build + verify + chụp ảnh + QA sau khi bạn dừng, nên chỉ chạy hai lệnh này, không chạy shoot, render hay TTS.`;

function feedbackPrompt(id: string, stage: AgentStage, message: string) {
  return [
    `Góp ý của người dùng cho stage "${stage}" (Video Studio):`,
    `"""${message.trim()}"""`,
    feedbackContext(id, stage),
    SHELL_RULES_LINE,
    ...(stage === "scenes"
      ? ["Sửa theo góp ý, chỉ trong phạm vi stage này.", selfCheckLine(id), "Dừng và tóm tắt ngắn bằng tiếng Việt."]
      : ["Sửa theo góp ý, chỉ trong phạm vi stage này. Runner sẽ chạy mọi gate deterministic và QA ảnh; bạn không chạy các bước đó. Dừng và tóm tắt ngắn bằng tiếng Việt."]),
  ].join("\n");
}

type FocusItem = { id: string; severity: string; scope?: string; code?: string; message: string; evidence?: string; acceptance?: string };

/**
 * A fix round the user picked from the review's findings: only those, each with the still it is about
 * and its acceptance check. Skipped findings are not mentioned — the user already decided on them.
 */
function focusPrompt(stage: AgentStage, items: FocusItem[], note?: string) {
  return [
    `Người dùng đã rà kết quả review chéo cho stage "${stage}" và chọn ${items.length} lỗi dưới đây để sửa.`,
    "Chỉ sửa đúng những lỗi này; đừng đổi các cảnh khác. Ảnh của mỗi cảnh ở `projects/<id>/qa/auto/cue-NN.png`.",
    SHELL_RULES_LINE,
    ...items.map((item) => `- ${item.id} [${item.severity}] ${item.scope || ""}${item.code ? ` · ${item.code}` : ""}: ${item.message}${item.evidence ? ` | Bằng chứng: ${item.evidence}` : ""}${item.acceptance ? ` | Nghiệm thu: ${item.acceptance}` : ""}`),
    ...(note?.trim() ? ["Ghi chú thêm của người dùng:", `"""${note.trim()}"""`] : []),
    "Runner sẽ build, verify, chụp ảnh và review lại sau khi bạn dừng; bạn không chạy các bước đó. Dừng và tóm tắt ngắn bằng tiếng Việt: đã sửa gì ở từng lỗi.",
  ].join("\n");
}

function saveSession(id: string, provider: AgentProvider, sessionId: string) {
  // Called from the agent's output stream, where a throw is caught by nobody: it would drop the rest of
  // that chunk's log lines. Not saving only costs the next feedback round its --resume.
  try {
    updateState(id, (state) => {
      // Provider is immutable after creation; an event can only update its own provider's session.
      if (state.agent.provider === provider) state.agent.sessionId = sessionId;
    });
  } catch (error) {
    log(id, "error", `Không lưu được phiên agent: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** What the workflow ledger keeps about one agent run (`recordJobMetrics`). */
interface AgentMetrics {
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  turns?: number;
  toolCalls: number;
  model?: string;
}

/** The model a CLI is told to use for video stages; unset leaves it to the CLI's own default. */
function configuredModel(provider: AgentProvider) {
  const name = { claude: "STUDIO_CLAUDE_MODEL", codex: "STUDIO_CODEX_MODEL", antigravity: "STUDIO_ANTIGRAVITY_MODEL" }[provider];
  return process.env[name]?.trim() || undefined;
}

/** How each CLI is started for a video stage: arguments, and what goes on stdin. */
function invocation(provider: AgentProvider, prompt: string, sessionId: string | null, model: string | undefined) {
  if (provider === "codex") return { args: codexExecArgs(sessionId, model), input: prompt };
  if (provider === "antigravity") return { args: antigravityExecArgs(sessionId, model), input: antigravityStdin(prompt) };
  return {
    args: claudeExecArgs(sessionId ?? randomUUID(), Boolean(sessionId), ALLOWED, DENIED, model),
    input: prompt,
  };
}

/** The line a finished agent leaves in the log — worded per CLI, as it always has been. */
function resultLine(provider: AgentProvider, e: Extract<AgentEvent, { type: "result" }>) {
  if (provider === "codex") return e.ok ? `Codex đã dừng${e.text ? `\n${e.text}` : "."}` : `Codex báo lỗi: ${e.text}`;
  const turns = typeof e.turns === "number" && (provider !== "claude" || typeof e.costUsd === "number") ? ` · ${e.turns} lượt` : "";
  if (provider === "antigravity") {
    return e.ok ? `Antigravity đã dừng${turns}${e.text ? `\n${e.text}` : "."}` : `Antigravity báo lỗi (${e.status})${turns}: ${e.text}`;
  }
  return `${e.ok ? "Claude Code đã dừng" : "Claude Code báo lỗi"}${turns}${e.text ? `\n${e.text}` : ""}`;
}

/** One agent process for a video: streams its events into the video's log, keeps its session for resume. */
async function runProvider(id: string, provider: AgentProvider, prompt: string, sessionId: string | null) {
  const label = agentProviderLabel(provider);
  const parse = createStreamParser(provider);
  const model = configuredModel(provider);
  // The binary as the research steps find it: a CLI installed through npm is only `codex.cmd` on Windows,
  // and spawning the bare name failed with ENOENT while the picker still offered that agent.
  const bin = await resolveAgentBin(provider);
  if (!bin) {
    log(id, "error", `Không tìm thấy ${label} trên máy này (PATH).`);
    return { ok: false, code: 127, metrics: { toolCalls: 0 } as AgentMetrics };
  }
  const { args, input } = invocation(provider, prompt, sessionId, model);
  // Claude names the model it ran in its init line; Codex and agy never say, so record what was asked for.
  const metrics: AgentMetrics = { toolCalls: 0, ...(provider === "claude" ? {} : { model: model || "(mặc định CLI, chưa rõ)" }) };
  let ok = false;
  let terminal = false;
  let tools = 0;
  const code = await run(id, bin, args, {
    env: sanitizedAgentEnv(),
    input,
    onLine(line, stream) {
      // Claude's stderr is a failure; the other two use stderr for ordinary diagnostics.
      if (stream === "stderr") return log(id, provider === "claude" ? "error" : "system", short(line, 400));
      for (const e of parse(line)) {
        if (e.type === "session") {
          saveSession(id, provider, e.id);
          if (e.model) metrics.model = e.model;
        } else if (e.type === "say") log(id, "agent", e.text);
        else if (e.type === "tool") {
          tools++;
          log(id, "tool", e.detail);
          setProgress(id, null, `${label} đang làm việc · ${tools} thao tác`);
        } else if (e.type === "toolError") log(id, "error", e.text);
        else if (e.type === "error") log(id, "error", `${label}: ${e.text}`);
        else if (e.type === "result") {
          terminal = true;
          ok = e.ok;
          log(id, e.ok ? "result" : "error", resultLine(provider, e));
          if (e.usage) {
            metrics.inputTokens = e.usage.input;
            metrics.cachedInputTokens = e.usage.cacheRead;
            metrics.outputTokens = e.usage.output;
          }
          if (e.costUsd !== undefined) metrics.costUsd = e.costUsd;
          if (e.turns !== undefined) metrics.turns = e.turns;
        }
      }
    },
  });
  if (!ok && !terminal && provider !== "claude" && !wasStopped(id)) {
    log(id, "error", `${label} kết thúc với mã ${code} nhưng không có sự kiện ${provider === "codex" ? "turn.completed" : "result"}.`);
  }
  metrics.toolCalls = tools;
  return { ok, code, metrics };
}

/** Run one agent stage (or a feedback round on it) as the video's job; resolves when the agent stops. */
export function runAgent(id: string, stage: AgentStage, base: string, message?: string, opts: { focus?: string[] } = {}) {
  return ownJob(id, () => agentStage(id, stage, base, message, opts), (error) => {
    try { setStage(id, stage, "error", error); } catch {}
    endHarness(id, "error", error);
  });
}

async function agentStage(id: string, stage: AgentStage, base: string, message: string | undefined, opts: { focus?: string[] }) {
  const { state } = readState(id);
  const provider = state.agent.provider;
  const providerLabel = agentProviderLabel(provider);
  const focus: FocusItem[] = opts.focus?.length
    ? readFeedback(REPO, id).filter((item: FocusItem) => opts.focus!.includes(item.id))
    : [];
  for (const item of focus) updateFeedback(REPO, id, item.id, { status: "planned" });
  const feedback = message && !focus.length ? recordFeedback(REPO, id, {
    stage,
    source: "user",
    severity: "major",
    message,
    owner: "coding-agent",
  }) : null;
  const prompt = focus.length ? focusPrompt(stage, focus, message) : message ? feedbackPrompt(id, stage, message) : stagePrompt(id, stage, base);
  const fixing = focus.length ? `sửa ${focus.length} lỗi review` : message ? "sửa theo góp ý" : null;
  startJob(id, stage, { actor: provider, mode: "agent", label: fixing ? `${stage} feedback` : stage });
  setStage(id, stage, "running");
  beginHarness(id, stage, "agent", HARNESS_STEPS[stage]);
  stepStart(id, "agent", fixing ? `${providerLabel} · ${fixing}` : providerLabel);
  setProgress(id, null, fixing ? `${providerLabel} đang ${fixing}…` : `${providerLabel} đang làm việc…`);
  log(id, "system", focus.length
    ? `Góp ý gửi agent (${stage}) · ${providerLabel}: sửa ${focus.map((item) => `${item.scope || item.id} · ${item.code || item.severity}`).join(", ")}${message ? ` — ${short(message, 200)}` : ""}`
    : message ? `Góp ý gửi agent (${stage}) · ${providerLabel}: ${short(message, 300)}` : `Bắt đầu agent · ${stage} · ${providerLabel}`);

  const result = await runProvider(id, provider, prompt, state.agent.sessionId);
  recordJobMetrics(id, result.metrics);

  if (wasStopped(id)) {
    setStage(id, stage, "error", "Đã dừng agent.");
    log(id, "system", "Đã dừng agent.");
    endHarness(id, "stopped");
    finishJob(id, "stopped");
    return false;
  }
  let success = result.ok && result.code === 0;
  let failureMessage = `${providerLabel} kết thúc với mã ${result.code}.`;
  if (success) stepDone(id, "agent", [providerLabel, result.metrics.toolCalls ? `${result.metrics.toolCalls} thao tác` : ""].filter(Boolean).join(" · "));
  else stepError(id, "agent", failureMessage);
  if (success && feedback) updateFeedback(REPO, id, feedback.id, { status: "applied" });
  // Picked findings wait for the review that runs next; one it still sees reopens (ledger), one it no
  // longer sees is verified. A failed agent turn leaves them planned, so the user can send them again.
  if (success) for (const item of focus) updateFeedback(REPO, id, item.id, { status: "applied" });
  if (success && stage === "cues") {
    try {
      await runCuesGate(id);
    } catch (error) {
      success = false;
      failureMessage = error instanceof Error ? error.message : String(error);
      log(id, "error", failureMessage);
    }
  }
  if (success && stage === "scenes") {
    try {
      await runSceneQa(id, base);
    } catch (error) {
      success = false;
      failureMessage = error instanceof Error ? error.message : String(error);
      log(id, "error", failureMessage);
    }
  }
  if (success && stage === "deliver") {
    try {
      await runFinalGate(id);
      updateFeedbackWhere(
        REPO,
        id,
        (item: { stage: string; status: string }) => item.stage === "deliver" && ["open", "planned", "applied"].includes(item.status),
        { status: "verified", evidence: "Final gate (build + verify) đã xanh." },
      );
    } catch (error) {
      success = false;
      failureMessage = error instanceof Error ? error.message : String(error);
      log(id, "error", failureMessage);
    }
  }
  setStage(id, stage, success ? (stage === "deliver" ? "done" : "review") : "error", success ? null : failureMessage);
  endHarness(id, success ? "done" : wasStopped(id) ? "stopped" : "error", failureMessage);
  finishJob(id, success ? "done" : "error");
  return success;
}
