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
