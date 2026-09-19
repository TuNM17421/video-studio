/** CLI arguments are provider-specific; a binary swap alone is not compatible. */
export function claudeExecArgs(sessionId: string, resume: boolean, allowed: string[], denied: string[], model?: string) {
  return [
    "-p", "--output-format", "stream-json", "--verbose", "--permission-mode", "dontAsk",
    ...(model ? ["--model", model] : []),
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

export function antigravityExecArgs(sessionId: string | null, model?: string) {
  return [
    "--input-format", "stream-json",
    "--output-format", "stream-json",
    "--dangerously-skip-permissions",
    "--disable-slash-commands",
    "--print-timeout", ANTIGRAVITY_TIMEOUT,
    ...(model ? ["--model", model] : []),
    ...(sessionId ? ["--conversation", sessionId] : []),
  ];
}

/** One turn on stdin: agy reads NDJSON `user` events when `--input-format stream-json` is set. */
export function antigravityStdin(prompt: string) {
  return `${JSON.stringify({ event: "user", message: { content: prompt } })}\n`;
}

export function codexExecArgs(sessionId: string | null, model?: string) {
  if (sessionId) {
    return [
      "exec", "resume", "--json",
      ...(model ? ["-m", model] : []),
      "-c", 'approval_policy="never"',
      "-c", 'sandbox_mode="workspace-write"',
      sessionId, "-",
    ];
  }
  return [
    "exec", "--json", "--sandbox", "workspace-write",
    ...(model ? ["-m", model] : []),
    "-c", 'approval_policy="never"',
    "-",
  ];
}

/**
 * Visual QA is a separate, read-only session with a clean context — the provider is secondary. Each
 * adapter keeps the same guarantees in its own CLI's terms: no tool that writes or runs commands, and the
 * report forced into QA_SCHEMA (`parseQaReport` re-checks it on our side either way).
 */
export type QaProvider = "claude" | "codex" | "antigravity";

/** Claude: only the read tools exist in the session; structured output via `--json-schema`. */
export function claudeQaArgs(schema: string, model?: string) {
  return [
    "-p", "--output-format", "json", "--permission-mode", "dontAsk",
    ...(model ? ["--model", model] : []),
    "--tools", "Read", "Glob", "Grep",
    "--allowedTools", "Read", "Glob", "Grep",
    "--disallowedTools", "Write", "Edit", "Bash", "PowerShell", "Read(**/.env)", "Read(**/.env.*)",
    "--json-schema", schema,
  ];
}

/**
 * Codex: `read-only` sandbox instead of the authoring lane's `workspace-write`; the stills go in as image
 * attachments (one `--image=` each, so the multi-value flag cannot swallow the `-` prompt argument), the
 * schema as a file, and the final answer is read from `--output-last-message` rather than the event stream.
 */
export function codexQaArgs(schemaFile: string, lastMessageFile: string, images: string[], model?: string) {
  return [
    "exec", "--json", "--sandbox", "read-only", "--skip-git-repo-check",
    ...(model ? ["-m", model] : []),
    "-c", 'approval_policy="never"',
    "--output-schema", schemaFile,
    "--output-last-message", lastMessageFile,
    ...images.map((image) => `--image=${image}`),
    "-",
  ];
}

/** Antigravity: read-only plan mode in its sandbox, schema-bound output. */
export function antigravityQaArgs(schema: string, model?: string) {
  return [
    "--print",
    "--input-format", "text",
    "--output-format", "json",
    "--mode", "plan",
    "--sandbox",
    ...(model ? ["--model", model] : []),
    "--json-schema", schema,
    "--print-timeout", "10m",
  ];
}

/** Env for any agent process: the Studio's paid TTS credential never enters it. */
export function sanitizedAgentEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith("ELEVENLABS_")) delete env[key];
  return env;
}
