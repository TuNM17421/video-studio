import type { AgentProvider } from "../types";

/**
 * Đọc luồng JSON của ba CLI agent thành một dạng sự kiện chung.
 *
 * Mỗi CLI nói một thứ tiếng: Claude `stream-json` (assistant/user/result), Codex `exec --json`
 * (thread/item/turn), Antigravity `stream-json` (init/step_update/result). Pipeline video và pipeline
 * research đều cần cùng những điều từ chúng — agent nói gì, gọi công cụ nào, lỗi ở đâu, kết thúc ra sao,
 * tốn bao nhiêu token — nên phần đọc nằm ở đây, còn việc ghi nhật ký thế nào là của người gọi.
 *
 * Hàm thuần: một dòng vào, không hoặc nhiều sự kiện ra. Dòng không phải JSON thì bỏ qua.
 */

export interface AgentUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export type AgentEvent =
  | { type: "session"; id: string }
  | { type: "say"; text: string }
  | { type: "tool"; name: string; detail: string; input: Record<string, unknown> }
  | { type: "toolError"; text: string }
  | { type: "error"; text: string }
  | {
      type: "result";
      ok: boolean;
      text: string;
      turns?: number;
      costUsd?: number;
      usage?: AgentUsage;
      /** Antigravity: SUCCESS / ERROR / …; Codex: turn.completed / turn.failed. */
      status?: string;
    };

export function short(value: unknown, max = 160) {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function errorText(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "message" in value) return String((value as { message?: unknown }).message || "");
  return short(value);
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

// ── Claude ────────────────────────────────────────────────────────────────────────

interface ClaudeBlock {
  type?: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
  is_error?: boolean;
  content?: unknown;
}
interface ClaudeMessage {
  type?: string;
  subtype?: string;
  session_id?: string;
  message?: { content?: ClaudeBlock[] };
  total_cost_usd?: number;
  num_turns?: number;
  is_error?: boolean;
  result?: string;
  usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
}

export function describeClaudeTool(name: string, input: Record<string, unknown>) {
  if (name === "Bash" || name === "PowerShell") return `$ ${short(input.command, 200)}`;
  if (name === "Read" || name === "Write" || name === "Edit") return `${name} ${short(input.file_path)}`;
  if (name === "Glob" || name === "Grep") return `${name} ${short(input.pattern)}`;
  if (name === "Task" || name === "Agent") return `Agent phụ: ${short(input.description || input.prompt, 120)}`;
  if (name === "TodoWrite") return "Cập nhật danh sách việc";
  if (name === "WebSearch") return `Tìm web: ${short(input.query, 160)}`;
  if (name === "WebFetch") return `Đọc trang: ${short(input.url, 160)}`;
  return name;
}

function claudeLine(msg: ClaudeMessage): AgentEvent[] {
  const out: AgentEvent[] = [];
  if (msg.type === "system" && msg.subtype === "init" && msg.session_id) {
    out.push({ type: "session", id: msg.session_id });
  } else if (msg.type === "assistant") {
    for (const block of msg.message?.content || []) {
      if (block.type === "text" && block.text?.trim()) out.push({ type: "say", text: block.text.trim() });
      if (block.type === "tool_use" && block.name) out.push({ type: "tool", name: block.name, detail: describeClaudeTool(block.name, block.input || {}), input: block.input || {} });
    }
  } else if (msg.type === "user") {
    for (const block of msg.message?.content || []) {
      if (block.type === "tool_result" && block.is_error) out.push({ type: "toolError", text: short(typeof block.content === "string" ? block.content : JSON.stringify(block.content), 300) });
    }
  } else if (msg.type === "result") {
    const u = msg.usage;
    out.push({
      type: "result",
      ok: msg.subtype === "success" && !msg.is_error,
      text: msg.result?.trim() || "",
      turns: msg.num_turns,
      costUsd: msg.total_cost_usd,
      status: msg.subtype,
      ...(u ? { usage: { input: num(u.input_tokens), output: num(u.output_tokens), cacheRead: num(u.cache_read_input_tokens), cacheWrite: num(u.cache_creation_input_tokens) } } : {}),
    });
  }
  return out;
}

// ── Codex ─────────────────────────────────────────────────────────────────────────

interface CodexItem {
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
interface CodexMessage {
  type?: string;
  thread_id?: string;
  item?: CodexItem;
  message?: string;
  error?: string | { message?: string };
  usage?: { input_tokens?: number; cached_input_tokens?: number; output_tokens?: number };
}

export function describeCodexItem(item: CodexItem) {
  if (item.type === "command_execution") return `$ ${short(item.command, 200)}`;
  if (item.type === "file_change") {
    const files = item.changes?.map((change) => change.path).filter(Boolean).join(", ");
    return files ? `Cập nhật file: ${short(files, 180)}` : "Cập nhật file";
  }
  if (item.type === "mcp_tool_call") return `MCP ${[item.server, item.tool].filter(Boolean).join(" · ") || "tool"}`;
  if (item.type === "web_search") return `Tìm web: ${short(item.query, 160)}`;
  return `Codex: ${item.type || "thao tác"}`;
}

function codexParser() {
  let finalText = "";
  return (msg: CodexMessage): AgentEvent[] => {
    const tool = (item: CodexItem): AgentEvent => ({ type: "tool", name: item.type || "tool", detail: describeCodexItem(item), input: item as Record<string, unknown> });
    if (msg.type === "thread.started" && msg.thread_id) return [{ type: "session", id: msg.thread_id }];
    if (msg.type === "item.started" && ["command_execution", "mcp_tool_call", "web_search"].includes(msg.item?.type || "")) return [tool(msg.item || {})];
    if (msg.type === "item.completed") {
      const item = msg.item || {};
      if (item.type === "agent_message" && item.text?.trim()) {
        finalText = item.text.trim();
        return [{ type: "say", text: finalText }];
      }
      if (item.type === "file_change") return [tool(item)];
      if (item.type === "command_execution" && (item.status === "failed" || (typeof item.exit_code === "number" && item.exit_code !== 0))) {
        return [{ type: "toolError", text: short(item.aggregated_output || `${item.command || "Lệnh"} kết thúc với mã ${item.exit_code}.`, 400) }];
      }
      return [];
    }
    if (msg.type === "turn.completed") {
      const u = msg.usage;
      return [{
        type: "result", ok: true, text: finalText, status: msg.type,
        ...(u ? { usage: { input: num(u.input_tokens), output: num(u.output_tokens), cacheRead: num(u.cached_input_tokens), cacheWrite: 0 } } : {}),
      }];
    }
    if (msg.type === "turn.failed") return [{ type: "result", ok: false, text: errorText(msg.error || msg.message) || "không có chi tiết.", status: msg.type }];
    if (msg.type === "error") return [{ type: "error", text: errorText(msg.error || msg.message) || "lỗi không xác định." }];
    return [];
  };
}

// ── Antigravity ───────────────────────────────────────────────────────────────────

interface AgyToolInfo {
  name?: string;
  parameters?: Record<string, unknown>;
  output?: string;
  error?: { type?: string; message?: string };
}
interface AgyMessage {
  event?: string;
  conversation_id?: string;
  step_update?: {
    step_index?: number;
    state?: string;
    step_type?: string;
    text_delta?: string;
    tool_name?: string;
    tool_info?: AgyToolInfo;
  };
  result?: { conversation_id?: string; status?: string; response?: string; error?: string; num_turns?: number };
}

/** agy tự đặt tên công cụ; `run_command` mang lệnh trong một tham số viết hoa. */
export function describeAntigravityTool(tool: AgyToolInfo, fallback: string) {
  const p = tool.parameters || {};
  const name = tool.name || fallback || "thao tác";
  const arg = p.CommandLine ?? p.command ?? p.Path ?? p.path ?? p.file_path ?? p.AbsolutePath ?? p.query ?? p.Query;
  return arg ? `${name === "run_command" ? "$" : name} ${short(arg, 200)}` : name;
}

function antigravityParser() {
  /**
   * agy gửi câu trả lời thành từng mẩu `text_delta` qua các bản ACTIVE của một bước, bản DONE chỉ mang dấu
   * xuống dòng cuối — đọc chữ ở DONE như với bước công cụ là mất cả câu. Gom theo bước, xả khi bước xong.
   */
  const saying = new Map<number, string>();
  return (msg: AgyMessage): AgentEvent[] => {
    if (msg.event === "init") return msg.conversation_id ? [{ type: "session", id: msg.conversation_id }] : [];
    if (msg.event === "step_update") {
      const step = msg.step_update || {};
      const index = step.step_index ?? -1;
      if (step.step_type === "agent_response") {
        if (step.text_delta) saying.set(index, (saying.get(index) ?? "") + step.text_delta);
        if (step.state !== "DONE") return [];
        const said = (saying.get(index) ?? "").trim();
        saying.delete(index);
        return said ? [{ type: "say", text: said }] : [];
      }
      // Một công cụ lặp lại ACTIVE rồi DONE; chỉ bản DONE mang kết quả.
      if (step.state !== "DONE" || step.step_type !== "tool") return [];
      const info = step.tool_info || {};
      const out: AgentEvent[] = [{ type: "tool", name: info.name || step.tool_name || "tool", detail: describeAntigravityTool(info, step.tool_name || ""), input: info.parameters || {} }];
      if (info.error) out.push({ type: "toolError", text: short(info.error.message || info.error.type || "Tool lỗi.", 300) });
      return out;
    }
    if (msg.event === "result") {
      const r = msg.result || {};
      const out: AgentEvent[] = [];
      if (r.conversation_id) out.push({ type: "session", id: r.conversation_id });
      const ok = r.status === "SUCCESS";
      out.push({ type: "result", ok, text: ok ? r.response?.trim() || "" : r.error || r.response?.trim() || "không có chi tiết.", turns: r.num_turns, status: r.status || "không rõ" });
      return out;
    }
    return [];
  };
}

/** Một bộ đọc cho một lượt chạy (Codex và Antigravity giữ trạng thái giữa các dòng). */
export function createStreamParser(provider: AgentProvider): (line: string) => AgentEvent[] {
  const parse = provider === "codex" ? codexParser() : provider === "antigravity" ? antigravityParser() : null;
  return (line: string) => {
    let msg: unknown;
    try { msg = JSON.parse(line); } catch { return []; }
    if (!msg || typeof msg !== "object") return [];
    if (provider === "claude") return claudeLine(msg as ClaudeMessage);
    return parse!(msg as never);
  };
}
