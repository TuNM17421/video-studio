/** CLI arguments are provider-specific; a binary swap alone is not compatible. */
export function claudeExecArgs(sessionId: string, resume: boolean, allowed: string[], denied: string[]) {
  return [
    "-p", "--output-format", "stream-json", "--verbose", "--permission-mode", "dontAsk",
    ...(resume ? ["--resume", sessionId] : ["--session-id", sessionId]),
    "--allowedTools", ...allowed,
    "--disallowedTools", ...denied,
  ];
}

/**
 * Antigravity's `agy`, headless, with the prompt on stdin as one NDJSON `user` event.
 *
 * `-p "<prompt>"` is the other documented way in and it is what other integrations use, but it cannot be
 * used here: on Windows an npm-installed `agy` is a `.cmd`, which Node can only spawn through cmd.exe,
 * and cmd.exe re-splits argv. Measured, the prompt arrived as 15 separate words with everything after
 * its first line dropped and the Studio's own flags gone. Worse, a feedback message is user text, so
 * routing it through a shell would let `&` or `|` in it run commands. stdin is a byte stream and none
 * of that applies.
 *
 * Three flags are not optional:
 * - `--dangerously-skip-permissions`: headless runs soft-deny anything needing approval (shell commands
 *   included) and still exit 0, so without it a stage would "succeed" having done nothing. This is the
 *   same posture Codex gets from `approval_policy="never"`; agy has no per-invocation allowlist.
 * - `--print-timeout`: the default is 5 minutes, while a scenes stage here regularly runs past 30.
 * - `--disable-slash-commands`: a feedback message opening with "/" is text, not a command to agy.
 *
 * Resume is `--conversation <id>`, never `-c/--continue` — that one picks up whatever ran last on the
 * machine, which is not necessarily this video.
 */
export const ANTIGRAVITY_TIMEOUT = "4h";

export function antigravityExecArgs(sessionId: string | null) {
  return [
    "--input-format", "stream-json",
    "--output-format", "stream-json",
    "--dangerously-skip-permissions",
    "--disable-slash-commands",
    "--print-timeout", ANTIGRAVITY_TIMEOUT,
    ...(sessionId ? ["--conversation", sessionId] : []),
  ];
}

/** One turn on stdin: agy reads NDJSON `user` events when `--input-format stream-json` is set. */
export function antigravityStdin(prompt: string) {
  return `${JSON.stringify({ event: "user", message: { content: prompt } })}\n`;
}

export function codexExecArgs(sessionId: string | null) {
  if (sessionId) {
    return [
      "exec", "resume", "--json",
      "-c", 'approval_policy="never"',
      "-c", 'sandbox_mode="workspace-write"',
      sessionId, "-",
    ];
  }
  return [
    "exec", "--json", "--sandbox", "workspace-write",
    "-c", 'approval_policy="never"',
    "-",
  ];
}

// ── research ("Đóng gói kịch bản") ───────────────────────────────────────────────

/**
 * What one research step may do, said once and translated per CLI. Where a CLI cannot enforce a line
 * (agy has no tool allowlist and no web switch), the step's instructions say it and the Studio's checks
 * catch what slips through — every quote is re-checked against the original page, every file against
 * its schema.
 */
export interface ResearchCall {
  /** Built-in tools the agent sees at all (Claude `--tools`): fewer tool definitions, fewer tokens per turn. */
  tools: string[];
  /** Claude permission rules that run without asking (`dontAsk` denies everything else). */
  allowed: string[];
  web: boolean;
  /** The one shell command family the step needs (e.g. `node tools/page.mjs`), or none. */
  shell: boolean;
  model: string | null;
  effort: "low" | "medium" | "high";
}

const RESEARCH_DENIED = [
  "Read(**/.env)", "Read(**/.env.*)",
  "NotebookEdit", "Task", "Agent", "DesignSync", "RemoteTrigger", "CronCreate", "SendMessage",
];

/**
 * Claude for one research step: no session to resume (each step starts clean and small), no MCP servers
 * (their tool schemas are paid for on every turn), only the tools the step needs, and partial messages
 * so the Studio can tell a long write from a stalled one.
 */
export function claudeResearchArgs(call: ResearchCall) {
  const denied = [...RESEARCH_DENIED, ...(call.web ? [] : ["WebSearch", "WebFetch"]), ...(call.shell ? [] : ["Bash", "PowerShell"])];
  return [
    "-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages",
    "--permission-mode", "dontAsk", "--no-session-persistence", "--strict-mcp-config",
    // Đẩy phần đổi theo máy (thư mục, biến môi trường, git status) khỏi system prompt: khối ~21k token nạp sẵn
    // ở đầu mỗi lượt thành phần đọc lại từ cache thay vì ghi lại vào cache từng lượt. Đo trên lượt thật: 7 lượt,
    // 217k token cache-write — phần lớn là khối đó lặp lại.
    "--exclude-dynamic-system-prompt-sections",
    ...(call.model ? ["--model", call.model] : []),
    "--effort", call.effort,
    "--tools", call.tools.join(","),
    "--allowedTools", ...call.allowed,
    "--disallowedTools", ...denied,
  ];
}

/**
 * Codex for one research step. Web search is off unless the step needs it; a step that runs
 * `node tools/page.mjs` needs network inside the sandbox, which `workspace-write` blocks by default.
 * These `-c` keys follow the Codex CLI reference and have not been run on a machine with Codex yet.
 */
export function codexResearchArgs(call: ResearchCall) {
  return [
    "exec", "--json", "--sandbox", "workspace-write",
    "-c", 'approval_policy="never"',
    "-c", `model_reasoning_effort="${call.effort}"`,
    "-c", `web_search="${call.web ? "live" : "disabled"}"`,
    ...(call.shell ? ["-c", "sandbox_workspace_write.network_access=true"] : []),
    ...(call.model ? ["-m", call.model] : []),
    "-",
  ];
}

/**
 * Antigravity for one research step: no allowlist or web switch exists. Effort is not passed — agy rejects
 * `--effort` for models that have no matching effort variant, and the model is the user's choice.
 */
export function antigravityResearchArgs(call: ResearchCall) {
  return [...antigravityExecArgs(null), ...(call.model ? ["--model", call.model] : [])];
}
