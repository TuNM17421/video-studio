import { randomUUID } from "node:crypto";
import type { StageId } from "../types";
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

export type AgentStage = Extract<StageId, "cues" | "scenes" | "deliver">;

/**
 * Headless Claude Code (`claude -p`, the user's own login) in the repo. The agent may edit files and run
 * the repo's own tools; it cannot run the paid TTS, read .env, push, or touch Claude Design. Anything not
 * listed is refused without asking (dontAsk), so a run never hangs on a permission prompt.
 */
const ALLOWED = [
  "Read", "Edit", "Write", "Glob", "Grep", "TodoWrite", "Task", "Agent",
  "Bash(cd *)", "Bash(node tools/*)",
  "Bash(npm run build)", "Bash(npm run verify)", "Bash(npm run build && npm run verify)",
  "Bash(node tts-elevenlabs/tts.mjs generate * --dry-run)",
  "Bash(ls *)", "Bash(mkdir *)", "Bash(cp *)", "Bash(mv *)", "Bash(wc *)", "Bash(head *)", "Bash(sort *)",
  "Bash(ffprobe *)", "Bash(ffmpeg *)", "Bash(node_modules/ffmpeg-static/ffmpeg *)",
];
const DENIED = [
  "Read(**/.env)", "Read(**/.env.*)", "Bash(*.env*)", "Bash(git push*)", "Bash(git commit*)",
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
  if (name === "Bash") return `$ ${short(input.command, 200)}`;
  if (name === "Read" || name === "Write" || name === "Edit") return `${name} ${short(input.file_path)}`;
  if (name === "Glob" || name === "Grep") return `${name} ${short(input.pattern)}`;
  if (name === "Task" || name === "Agent") return `Agent phụ: ${short(input.description || input.prompt, 120)}`;
  if (name === "TodoWrite") return "Cập nhật danh sách việc";
  return `${name}`;
}

/** Run one agent stage (or a feedback round on it) as the video's job; resolves when the agent stops. */
export async function runAgent(id: string, stage: AgentStage, base: string, message?: string) {
  const { state } = readState(id);
  const resume = Boolean(state.sessionId);
  const sessionId = state.sessionId ?? randomUUID();
  const prompt = message ? feedbackPrompt(stage, message) : stagePrompt(id, stage, base);
  startJob(id, stage);
  setStage(id, stage, "running");
  setProgress(id, null, message ? "Agent đang sửa theo góp ý…" : "Agent đang làm việc…");
  log(id, "system", message ? `Góp ý gửi agent (${stage}): ${short(message, 300)}` : `Bắt đầu agent · ${stage}`);

  const args = [
    "-p", "--output-format", "stream-json", "--verbose", "--permission-mode", "dontAsk",
    ...(resume ? ["--resume", sessionId] : ["--session-id", sessionId]),
    "--allowedTools", ...ALLOWED,
    "--disallowedTools", ...DENIED,
  ];
  // The agent never sees an ElevenLabs key, even one exported in the server's environment.
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith("ELEVENLABS_")) delete env[k];

  let ok = false;
  let tools = 0;
  const code = await run(id, process.env.CLAUDE_BIN || "claude", args, {
    env,
    input: prompt,
    onLine(line, stream) {
      if (stream === "stderr") return log(id, "error", short(line, 400));
      let msg: AgentStreamMessage;
      try { msg = JSON.parse(line); } catch { return; }
      if (msg.type === "system" && msg.subtype === "init" && !resume && msg.session_id) {
        const nextSessionId = msg.session_id;
        updateState(id, (s) => { s.sessionId = nextSessionId; });
      } else if (msg.type === "assistant") {
        for (const block of msg.message?.content || []) {
          if (block.type === "text" && block.text?.trim()) log(id, "agent", block.text.trim());
          if (block.type === "tool_use" && block.name) {
            tools++;
            log(id, "tool", describeTool(block.name, block.input || {}));
            setProgress(id, null, `Agent đang làm việc · ${tools} thao tác`);
          }
        }
      } else if (msg.type === "user") {
        for (const block of msg.message?.content || []) {
          if (block.type === "tool_result" && block.is_error) log(id, "error", short(typeof block.content === "string" ? block.content : JSON.stringify(block.content), 300));
        }
      } else if (msg.type === "result") {
        ok = msg.subtype === "success" && !msg.is_error;
        const cost = typeof msg.total_cost_usd === "number" ? ` · ${msg.num_turns ?? "?"} lượt` : "";
        log(id, ok ? "result" : "error", `${ok ? "Agent đã dừng" : "Agent báo lỗi"}${cost}${msg.result ? `\n${msg.result}` : ""}`);
      }
    },
  });

  if (wasStopped(id)) {
    setStage(id, stage, "error", "Đã dừng agent.");
    log(id, "system", "Đã dừng agent.");
    finishJob(id, "stopped");
    return false;
  }
  const success = ok && code === 0;
  setStage(id, stage, success ? (stage === "deliver" ? "done" : "review") : "error", success ? null : `Agent kết thúc với mã ${code}.`);
  finishJob(id, success ? "done" : "error");
  return success;
}
