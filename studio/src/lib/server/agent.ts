import { randomUUID } from "node:crypto";
import type { AgentProvider, StageId } from "../types";
import { agentProviderLabel } from "../agent-providers";
import { antigravityExecArgs, antigravityStdin, claudeExecArgs, codexExecArgs } from "./agent-cli";
import { createStreamParser, short, type AgentEvent } from "./agent-stream";
import { finishJob, log, run, setProgress, startJob, wasStopped } from "./jobs";
import { readState, setStage, styleName, updateState } from "./videos";

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
    "npm run build", "npm run verify", "npm run build && npm run verify",
    "node tts-elevenlabs/tts.mjs generate * --dry-run",
    "node tts-elevenlabs/tts.mjs --help*",
    "ls *", "mkdir *", "cp *", "mv *", "wc *", "head *", "sort *",
    "ffprobe *", "ffmpeg *", "node_modules/ffmpeg-static/ffmpeg *",
  ]),
];
const DENIED = [
  "Read(**/.env)", "Read(**/.env.*)",
  ...shellPatterns(["*.env*", "git push*", "git commit*"]),
  "DesignSync", "RemoteTrigger", "CronCreate", "SendMessage", "WebFetch", "WebSearch",
];

const STAGE_TASK: Record<AgentStage, string> = {
  cues: "Stage 1 · cues: chép/đọc kịch bản, đọc feedback và video cũ (nếu có), viết cues.js (lời nguyên văn), voice.js rỗng, pronounce.json nếu cần, rồi chạy tts --dry-run để kiểm tra. KHÔNG dựng cảnh.",
  scenes: "Stage 3 · scenes: giọng đã được ghi và gắn (voice.js có mốc từng từ, cues.js đã có frames/speech thật). Dựng toàn bộ cảnh theo đúng thời lượng này, build + verify, chụp ảnh QA vào projects/<id>/qa/ và tự sửa lỗi thấy được.",
  deliver: "Stage 5 · deliver: MP4 và transcript đã có. Viết file chương, PROMPTS.md, kiểm tra lần cuối (build + verify).",
};

function stagePrompt(id: string, stage: AgentStage, base: string) {
  const { state } = readState(id);
  const r = state.request;
  return [
    `Bạn đang chạy trong Video Studio (web local) cho video \`${id}\` (${r.day}, style ${styleName(r.style)}).`,
    "Dùng skill make-video: đọc `.claude/skills/make-video/SKILL.md` và làm đúng chỉ dẫn ở đó.",
    `Yêu cầu của video: \`projects/${id}/REQUEST.md\`. Style: \`styles/${r.style}.json\` (luật của style được ưu tiên).`,
    `Việc cần làm lần này — ${STAGE_TASK[stage].replace("<id>", id)}`,
    `Preview server (dùng làm <base> khi chụp QA): ${base}/ds`,
    "Chỉ làm stage này rồi dừng. Không chạy tts.mjs generate (trừ --dry-run), không đọc .env, không git commit/push, không /design-sync.",
    "Kết thúc bằng một bản tóm tắt ngắn bằng tiếng Việt: đã làm gì, điểm cần người dùng xem, câu hỏi còn mở.",
  ].join("\n");
}

function feedbackPrompt(stage: AgentStage, message: string) {
  return [
    `Góp ý của người dùng cho stage "${stage}" (Video Studio):`,
    `"""${message.trim()}"""`,
    "Sửa theo góp ý, chỉ trong phạm vi stage này. Chạy lại kiểm tra cần thiết (build + verify, chụp lại ảnh QA nếu là stage scenes), rồi dừng và tóm tắt ngắn bằng tiếng Việt.",
  ].join("\n");
}

function saveSession(id: string, provider: AgentProvider, sessionId: string) {
  updateState(id, (state) => {
    // Provider is immutable after creation; an event can only update its own provider's session.
    if (state.agent.provider === provider) state.agent.sessionId = sessionId;
  });
}

export function sanitizedAgentEnv() {
  const env = { ...process.env };
  // The Studio's paid TTS credential must never enter either agent process.
  for (const key of Object.keys(env)) if (key.startsWith("ELEVENLABS_")) delete env[key];
  return env;
}

/** How each CLI is started for a video stage: binary, arguments, and what goes on stdin. */
function invocation(provider: AgentProvider, prompt: string, sessionId: string | null) {
  if (provider === "codex") return { bin: process.env.CODEX_BIN || "codex", args: codexExecArgs(sessionId), input: prompt };
  if (provider === "antigravity") return { bin: process.env.ANTIGRAVITY_BIN || "agy", args: antigravityExecArgs(sessionId), input: antigravityStdin(prompt) };
  return {
    bin: process.env.CLAUDE_BIN || "claude",
    args: claudeExecArgs(sessionId ?? randomUUID(), Boolean(sessionId), ALLOWED, DENIED),
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
  const { bin, args, input } = invocation(provider, prompt, sessionId);
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
        if (e.type === "session") saveSession(id, provider, e.id);
        else if (e.type === "say") log(id, "agent", e.text);
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
        }
      }
    },
  });
  if (!ok && !terminal && provider !== "claude" && !wasStopped(id)) {
    log(id, "error", `${label} kết thúc với mã ${code} nhưng không có sự kiện ${provider === "codex" ? "turn.completed" : "result"}.`);
  }
  return { ok, code };
}

/** Run one agent stage (or a feedback round on it) as the video's job; resolves when the agent stops. */
export async function runAgent(id: string, stage: AgentStage, base: string, message?: string) {
  const { state } = readState(id);
  const provider = state.agent.provider;
  const providerLabel = agentProviderLabel(provider);
  const prompt = message ? feedbackPrompt(stage, message) : stagePrompt(id, stage, base);
  startJob(id, stage);
  setStage(id, stage, "running");
  setProgress(id, null, message ? `${providerLabel} đang sửa theo góp ý…` : `${providerLabel} đang làm việc…`);
  log(id, "system", message ? `Góp ý gửi agent (${stage}) · ${providerLabel}: ${short(message, 300)}` : `Bắt đầu agent · ${stage} · ${providerLabel}`);

  const result = await runProvider(id, provider, prompt, state.agent.sessionId);

  if (wasStopped(id)) {
    setStage(id, stage, "error", "Đã dừng agent.");
    log(id, "system", "Đã dừng agent.");
    finishJob(id, "stopped");
    return false;
  }
  const success = result.ok && result.code === 0;
  setStage(id, stage, success ? (stage === "deliver" ? "done" : "review") : "error", success ? null : `${providerLabel} kết thúc với mã ${result.code}.`);
  finishJob(id, success ? "done" : "error");
  return success;
}
