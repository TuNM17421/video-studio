/** CLI arguments are provider-specific; a binary swap alone is not compatible. */
export function claudeExecArgs(sessionId: string, resume: boolean, allowed: string[], denied: string[]) {
  return [
    "-p", "--output-format", "stream-json", "--verbose", "--permission-mode", "dontAsk",
    ...(resume ? ["--resume", sessionId] : ["--session-id", sessionId]),
    "--allowedTools", ...allowed,
    "--disallowedTools", ...denied,
  ];
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
