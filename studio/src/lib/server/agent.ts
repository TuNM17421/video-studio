import { randomUUID } from "node:crypto";
import type { AgentProvider, StageId } from "../types";
import { agentProviderLabel } from "../agent-providers";
import { antigravityExecArgs, antigravityStdin, claudeExecArgs, codexExecArgs, sanitizedAgentEnv } from "./agent-cli";
import { finishJob, log, recordJobMetrics, run, setProgress, startJob, wasStopped } from "./jobs";
import { REPO } from "./paths";
import { beginHarness, endHarness, HARNESS_STEPS, stepDone, stepError, stepStart } from "./harness";
import { runCuesGate, runFinalGate, runSceneQa } from "./qa";
import { readState, setStage, styleName, updateState } from "./videos";
import { readFeedback, recordFeedback, updateFeedback, updateFeedbackWhere } from "./workflow";

interface AgentStreamBlock {
  type?: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
  is_error?: boolean;
  content?: unknown;
}

interface AgentStreamMessage {
  type?: string;
  subtype?: string;
  session_id?: string;
  message?: { content?: AgentStreamBlock[] };
  total_cost_usd?: number;
  num_turns?: number;
  usage?: {
    input_tokens?: number;
    cache_read_input_tokens?: number;
    output_tokens?: number;
  };
  is_error?: boolean;
  result?: string;
  model?: string;
}

interface CodexStreamItem {
  type?: string;
  text?: string;
  command?: string;
  status?: string;
  exit_code?: number | null;
  aggregated_output?: string;
  server?: string;
  tool?: string;
  query?: string;
  changes?: { path?: string; kind?: string }[];
}

interface CodexStreamMessage {
  type?: string;
  thread_id?: string;
  item?: CodexStreamItem;
  message?: string;
  error?: string | { message?: string };
  usage?: {
    input_tokens?: number;
    cached_input_tokens?: number;
    output_tokens?: number;
  };
}

/** agy --output-format stream-json: one `init`, any number of `step_update`, exactly one `result`. */
interface AntigravityStreamMessage {
  event?: string;
  conversation_id?: string;
  init?: { cwd?: string; permission_mode?: string };
  step_update?: {
    conversation_id?: string;
    step_index?: number;
    state?: string;
    step_type?: string;
    text_delta?: string;
    tool_name?: string;
    tool_info?: {
      name?: string;
      parameters?: Record<string, unknown>;
      output?: string;
      error?: { type?: string; message?: string };
    };
  };
  result?: {
    conversation_id?: string;
    status?: string;
    response?: string;
    error?: string;
    num_turns?: number;
  };
}

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
    `Việc cần làm lần này — ${STAGE_TASK[stage].replace("<id>", id)}`,
    `Preview server (dùng làm <base> khi chụp QA): ${base}/ds`,
    feedbackContext(id, stage),
    "Chỉ tạo/sửa nội dung của stage này rồi dừng. Không chạy build, verify, shoot, render, TTS, không đọc .env, không git commit/push, không /design-sync.",
    "Kết thúc bằng một bản tóm tắt ngắn bằng tiếng Việt: đã làm gì, điểm cần người dùng xem, câu hỏi còn mở.",
  ].join("\n");
}

function feedbackPrompt(id: string, stage: AgentStage, message: string) {
  return [
    `Góp ý của người dùng cho stage "${stage}" (Video Studio):`,
    `"""${message.trim()}"""`,
    feedbackContext(id, stage),
    "Sửa theo góp ý, chỉ trong phạm vi stage này. Runner sẽ chạy mọi gate deterministic và QA ảnh; bạn không chạy các bước đó. Dừng và tóm tắt ngắn bằng tiếng Việt.",
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
    ...items.map((item) => `- ${item.id} [${item.severity}] ${item.scope || ""}${item.code ? ` · ${item.code}` : ""}: ${item.message}${item.evidence ? ` | Bằng chứng: ${item.evidence}` : ""}${item.acceptance ? ` | Nghiệm thu: ${item.acceptance}` : ""}`),
    ...(note?.trim() ? ["Ghi chú thêm của người dùng:", `"""${note.trim()}"""`] : []),
    "Runner sẽ build, verify, chụp ảnh và review lại sau khi bạn dừng; bạn không chạy các bước đó. Dừng và tóm tắt ngắn bằng tiếng Việt: đã sửa gì ở từng lỗi.",
  ].join("\n");
}

function short(value: unknown, max = 160) {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function describeTool(name: string, input: Record<string, unknown>) {
  if (name === "Bash" || name === "PowerShell") return `$ ${short(input.command, 200)}`;
  if (name === "Read" || name === "Write" || name === "Edit") return `${name} ${short(input.file_path)}`;
  if (name === "Glob" || name === "Grep") return `${name} ${short(input.pattern)}`;
  if (name === "Task" || name === "Agent") return `Agent phụ: ${short(input.description || input.prompt, 120)}`;
  if (name === "TodoWrite") return "Cập nhật danh sách việc";
  return `${name}`;
}

function errorText(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "message" in value) return String(value.message || "");
  return short(value);
}

function saveSession(id: string, provider: AgentProvider, sessionId: string) {
  updateState(id, (state) => {
    // Provider is immutable after creation; an event can only update its own provider's session.
    if (state.agent.provider === provider) state.agent.sessionId = sessionId;
  });
}

async function runClaude(id: string, prompt: string, sessionId: string | null) {
  const resume = Boolean(sessionId);
  const nextSessionId = sessionId ?? randomUUID();
  let ok = false;
  let tools = 0;
  const metrics: { inputTokens?: number; cachedInputTokens?: number; outputTokens?: number; costUsd?: number; turns?: number; toolCalls: number; model?: string } = { toolCalls: 0 };
  const configuredModel = process.env.STUDIO_CLAUDE_MODEL?.trim() || undefined;
  const code = await run(id, process.env.CLAUDE_BIN || "claude", claudeExecArgs(nextSessionId, resume, ALLOWED, DENIED, configuredModel), {
    env: sanitizedAgentEnv(),
    input: prompt,
    onLine(line, stream) {
      if (stream === "stderr") return log(id, "error", short(line, 400));
      let msg: AgentStreamMessage;
      try { msg = JSON.parse(line); } catch { return; }
      if (msg.type === "system" && msg.subtype === "init" && msg.session_id) {
        saveSession(id, "claude", msg.session_id);
        if (msg.model) metrics.model = msg.model;
      } else if (msg.type === "assistant") {
        for (const block of msg.message?.content || []) {
          if (block.type === "text" && block.text?.trim()) log(id, "agent", block.text.trim());
          if (block.type === "tool_use" && block.name) {
            tools++;
            log(id, "tool", describeTool(block.name, block.input || {}));
            setProgress(id, null, `Claude Code đang làm việc · ${tools} thao tác`);
          }
        }
      } else if (msg.type === "user") {
        for (const block of msg.message?.content || []) {
          if (block.type === "tool_result" && block.is_error) log(id, "error", short(typeof block.content === "string" ? block.content : JSON.stringify(block.content), 300));
        }
      } else if (msg.type === "result") {
        ok = msg.subtype === "success" && !msg.is_error;
        const turns = typeof msg.total_cost_usd === "number" ? ` · ${msg.num_turns ?? "?"} lượt` : "";
        log(id, ok ? "result" : "error", `${ok ? "Claude Code đã dừng" : "Claude Code báo lỗi"}${turns}${msg.result ? `\n${msg.result}` : ""}`);
        metrics.inputTokens = msg.usage?.input_tokens;
        metrics.cachedInputTokens = msg.usage?.cache_read_input_tokens;
        metrics.outputTokens = msg.usage?.output_tokens;
        metrics.costUsd = msg.total_cost_usd;
        metrics.turns = msg.num_turns;
      }
    },
  });
  metrics.toolCalls = tools;
  return { ok, code, metrics };
}

function describeCodexItem(item: CodexStreamItem) {
  if (item.type === "command_execution") return `$ ${short(item.command, 200)}`;
  if (item.type === "file_change") {
    const files = item.changes?.map((change) => change.path).filter(Boolean).join(", ");
    return files ? `Cập nhật file: ${short(files, 180)}` : "Cập nhật file";
  }
  if (item.type === "mcp_tool_call") return `MCP ${[item.server, item.tool].filter(Boolean).join(" · ") || "tool"}`;
  if (item.type === "web_search") return `Tìm web: ${short(item.query, 160)}`;
  return `Codex: ${item.type || "thao tác"}`;
}

async function runCodex(id: string, prompt: string, sessionId: string | null) {
  let ok = false;
  let terminalEvent = false;
  let tools = 0;
  let finalText = "";
  const configuredModel = process.env.STUDIO_CODEX_MODEL?.trim() || undefined;
  const metrics: { inputTokens?: number; cachedInputTokens?: number; outputTokens?: number; toolCalls: number; model?: string } = {
    toolCalls: 0,
    model: configuredModel || "(mặc định CLI, chưa rõ)",
  };
  const noteTool = (item: CodexStreamItem) => {
    tools++;
    log(id, "tool", describeCodexItem(item));
    setProgress(id, null, `Codex đang làm việc · ${tools} thao tác`);
  };
  const code = await run(id, process.env.CODEX_BIN || "codex", codexExecArgs(sessionId, configuredModel), {
    env: sanitizedAgentEnv(),
    input: prompt,
    onLine(line, stream) {
      // In JSON mode stdout is the protocol; stderr can contain ordinary CLI diagnostics.
      if (stream === "stderr") return log(id, "system", short(line, 400));
      let msg: CodexStreamMessage;
      try { msg = JSON.parse(line); } catch { return; }
      if (msg.type === "thread.started" && msg.thread_id) {
        saveSession(id, "codex", msg.thread_id);
      } else if (msg.type === "item.started" && ["command_execution", "mcp_tool_call", "web_search"].includes(msg.item?.type || "")) {
        noteTool(msg.item || {});
      } else if (msg.type === "item.completed") {
        const item = msg.item || {};
        if (item.type === "agent_message" && item.text?.trim()) {
          finalText = item.text.trim();
          log(id, "agent", finalText);
        } else if (item.type === "file_change") {
          noteTool(item);
        } else if (item.type === "command_execution" && (item.status === "failed" || (typeof item.exit_code === "number" && item.exit_code !== 0))) {
          log(id, "error", short(item.aggregated_output || `${item.command || "Lệnh"} kết thúc với mã ${item.exit_code}.`, 400));
        }
      } else if (msg.type === "turn.completed") {
        ok = true;
        terminalEvent = true;
        log(id, "result", `Codex đã dừng${finalText ? `\n${finalText}` : "."}`);
        metrics.inputTokens = msg.usage?.input_tokens;
        metrics.cachedInputTokens = msg.usage?.cached_input_tokens;
        metrics.outputTokens = msg.usage?.output_tokens;
      } else if (msg.type === "turn.failed") {
        terminalEvent = true;
        log(id, "error", `Codex báo lỗi: ${errorText(msg.error || msg.message) || "không có chi tiết."}`);
      } else if (msg.type === "error") {
        log(id, "error", `Codex: ${errorText(msg.error || msg.message) || "lỗi không xác định."}`);
      }
    },
  });
  if (!ok && !terminalEvent && !wasStopped(id)) log(id, "error", `Codex kết thúc với mã ${code} nhưng không có sự kiện turn.completed.`);
  metrics.toolCalls = tools;
  return { ok, code, metrics };
}

/** agy names its own tools; `run_command` carries the command under a capitalised parameter. */
function describeAntigravityTool(tool: NonNullable<NonNullable<AntigravityStreamMessage["step_update"]>["tool_info"]>, fallback: string) {
  const p = tool.parameters || {};
  const name = tool.name || fallback || "thao tác";
  const arg = p.CommandLine ?? p.command ?? p.Path ?? p.path ?? p.file_path ?? p.AbsolutePath ?? p.query ?? p.Query;
  return arg ? `${name === "run_command" ? "$" : name} ${short(arg, 200)}` : name;
}

async function runAntigravity(id: string, prompt: string, sessionId: string | null) {
  let ok = false;
  let terminalEvent = false;
  let tools = 0;
  let finalText = "";
  const configuredModel = process.env.STUDIO_ANTIGRAVITY_MODEL?.trim() || undefined;
  const metrics: { turns?: number; toolCalls: number; model?: string } = {
    toolCalls: 0,
    model: configuredModel || "(mặc định CLI, chưa rõ)",
  };
  /**
   * agy streams an answer as `text_delta` fragments across the ACTIVE updates of one step, and the DONE
   * update carries only the trailing newline — reading the text off DONE alone (as a tool step is read)
   * would log whitespace and drop the message. Accumulate per step, flush when the step finishes.
   */
  const saying = new Map<number, string>();
  const code = await run(id, process.env.ANTIGRAVITY_BIN || "agy", antigravityExecArgs(sessionId, configuredModel), {
    env: sanitizedAgentEnv(),
    input: antigravityStdin(prompt),
    onLine(line, stream) {
      // stdout is the NDJSON protocol; stderr carries ordinary diagnostics and permission notices.
      if (stream === "stderr") return log(id, "system", short(line, 400));
      let msg: AntigravityStreamMessage;
      try { msg = JSON.parse(line); } catch { return; }
      if (msg.event === "init") {
        if (msg.conversation_id) saveSession(id, "antigravity", msg.conversation_id);
      } else if (msg.event === "step_update") {
        const step = msg.step_update || {};
        const index = step.step_index ?? -1;
        if (step.step_type === "agent_response") {
          if (step.text_delta) saying.set(index, (saying.get(index) ?? "") + step.text_delta);
          if (step.state === "DONE") {
            const said = (saying.get(index) ?? "").trim();
            saying.delete(index);
            if (said) log(id, "agent", said);
          }
          return;
        }
        // A tool repeats as ACTIVE then DONE; only the finished one carries its output.
        if (step.state !== "DONE") return;
        if (step.step_type === "tool") {
          tools++;
          log(id, "tool", describeAntigravityTool(step.tool_info || {}, step.tool_name || ""));
          setProgress(id, null, `Antigravity đang làm việc · ${tools} thao tác`);
          const failure = step.tool_info?.error;
          if (failure) log(id, "error", short(failure.message || failure.type || "Tool lỗi.", 300));
        }
      } else if (msg.event === "result") {
        const r = msg.result || {};
        if (r.conversation_id) saveSession(id, "antigravity", r.conversation_id);
        ok = r.status === "SUCCESS";
        terminalEvent = true;
        finalText = r.response?.trim() || "";
        const turns = typeof r.num_turns === "number" ? ` · ${r.num_turns} lượt` : "";
        metrics.turns = r.num_turns;
        if (ok) log(id, "result", `Antigravity đã dừng${turns}${finalText ? `\n${finalText}` : "."}`);
        else log(id, "error", `Antigravity báo lỗi (${r.status || "không rõ"})${turns}: ${r.error || finalText || "không có chi tiết."}`);
      }
    },
  });
  if (!ok && !terminalEvent && !wasStopped(id)) log(id, "error", `Antigravity kết thúc với mã ${code} nhưng không có sự kiện result.`);
  metrics.toolCalls = tools;
  return { ok, code, metrics };
}

/** Run one agent stage (or a feedback round on it) as the video's job; resolves when the agent stops. */
export async function runAgent(id: string, stage: AgentStage, base: string, message?: string, opts: { focus?: string[] } = {}) {
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

  const runner = { codex: runCodex, antigravity: runAntigravity, claude: runClaude }[provider] ?? runClaude;
  const result = await runner(id, prompt, state.agent.sessionId);
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
