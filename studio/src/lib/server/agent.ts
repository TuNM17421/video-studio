import { randomUUID } from "node:crypto";
import type { AgentProvider, StageId } from "../types";
import { agentProviderLabel } from "../agent-providers";
import { claudeExecArgs, codexExecArgs } from "./agent-cli";
import { finishJob, log, run, setProgress, startJob, wasStopped } from "./jobs";
import { readState, setStage, styleName, updateState } from "./videos";

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
  is_error?: boolean;
  result?: string;
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

function sanitizedAgentEnv() {
  const env = { ...process.env };
  // The Studio's paid TTS credential must never enter either agent process.
  for (const key of Object.keys(env)) if (key.startsWith("ELEVENLABS_")) delete env[key];
  return env;
}

async function runClaude(id: string, prompt: string, sessionId: string | null) {
  const resume = Boolean(sessionId);
  const nextSessionId = sessionId ?? randomUUID();
  let ok = false;
  let tools = 0;
  const code = await run(id, process.env.CLAUDE_BIN || "claude", claudeExecArgs(nextSessionId, resume, ALLOWED, DENIED), {
    env: sanitizedAgentEnv(),
    input: prompt,
    onLine(line, stream) {
      if (stream === "stderr") return log(id, "error", short(line, 400));
      let msg: AgentStreamMessage;
      try { msg = JSON.parse(line); } catch { return; }
      if (msg.type === "system" && msg.subtype === "init" && msg.session_id) {
        saveSession(id, "claude", msg.session_id);
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
      }
    },
  });
  return { ok, code };
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
  const noteTool = (item: CodexStreamItem) => {
    tools++;
    log(id, "tool", describeCodexItem(item));
    setProgress(id, null, `Codex đang làm việc · ${tools} thao tác`);
  };
  const code = await run(id, process.env.CODEX_BIN || "codex", codexExecArgs(sessionId), {
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
      } else if (msg.type === "turn.failed") {
        terminalEvent = true;
        log(id, "error", `Codex báo lỗi: ${errorText(msg.error || msg.message) || "không có chi tiết."}`);
      } else if (msg.type === "error") {
        log(id, "error", `Codex: ${errorText(msg.error || msg.message) || "lỗi không xác định."}`);
      }
    },
  });
  if (!ok && !terminalEvent && !wasStopped(id)) log(id, "error", `Codex kết thúc với mã ${code} nhưng không có sự kiện turn.completed.`);
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

  const result = provider === "codex"
    ? await runCodex(id, prompt, state.agent.sessionId)
    : await runClaude(id, prompt, state.agent.sessionId);

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
