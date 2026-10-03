import { describe, expect, it } from "vitest";
import { antigravityExecArgs, antigravityQaArgs, antigravityStdin, claudeExecArgs, claudeQaArgs, codexExecArgs, codexQaArgs } from "./agent-cli";

describe("Antigravity CLI adapter", () => {
  it("runs headless, unattended, past the 5-minute default timeout", () => {
    expect(antigravityExecArgs(null)).toEqual([
      "--input-format", "stream-json",
      "--output-format", "stream-json",
      "--dangerously-skip-permissions",
      "--disable-slash-commands",
      "--print-timeout", "4h",
    ]);
  });

  it("resumes the conversation bound to this video, not whatever ran last on the machine", () => {
    const args = antigravityExecArgs("conv-123");
    expect(args.slice(-2)).toEqual(["--conversation", "conv-123"]);
    expect(args).not.toContain("--continue");
    expect(args).not.toContain("-c");
  });

  it("keeps every argument free of prompt text, so a Windows .cmd shim cannot re-split it", () => {
    // measured: through cmd.exe an argv prompt arrived as 15 words with the flags dropped entirely
    for (const arg of antigravityExecArgs("conv-123")) expect(arg).not.toMatch(/\s/);
  });

  it("pins an explicit model when configured", () => {
    expect(antigravityExecArgs(null, "gemini-3.8-pro")).toContain("gemini-3.8-pro");
  });

  it("sends the prompt as one newline-terminated user event", () => {
    const prompt = 'nói "xin chào" & whoami\ndòng hai';
    const line = antigravityStdin(prompt);
    expect(line.endsWith("\n")).toBe(true);
    expect(line.trimEnd().includes("\n")).toBe(false); // a raw newline would split the NDJSON record
    expect(JSON.parse(line)).toEqual({ event: "user", message: { content: prompt } });
  });
});

describe("Codex CLI adapter", () => {
  it("starts a JSONL workspace-write session without interactive approvals", () => {
    expect(codexExecArgs(null)).toEqual([
      "exec", "--json", "--sandbox", "workspace-write",
      "-c", 'approval_policy="never"',
      "-",
    ]);
  });

  it("resumes the exact session bound to the video", () => {
    expect(codexExecArgs("thread-123")).toEqual([
      "exec", "resume", "--json",
      "-c", 'approval_policy="never"',
      "-c", 'sandbox_mode="workspace-write"',
      "thread-123", "-",
    ]);
  });

  it("pins an explicit model when configured", () => {
    expect(codexExecArgs(null, "gpt-5.6-sol")).toContain("gpt-5.6-sol");
  });
});

describe("Claude CLI adapter", () => {
  it("places the model before the tool allowlist", () => {
    const args = claudeExecArgs("session-1", true, ["Read"], ["Bash"], "claude-sonnet-5");
    expect(args.indexOf("--model")).toBeLessThan(args.indexOf("--allowedTools"));
  });
});

describe("Antigravity QA adapter", () => {
  it("uses read-only plan mode and schema-bound output", () => {
    expect(antigravityQaArgs('{"type":"object"}')).toEqual([
      "--input-format", "text", "--output-format", "json",
      "--mode", "plan", "--sandbox", "--json-schema", '{"type":"object"}',
      "--print-timeout", "10m", "--print", "-",
    ]);
  });
});

describe("Claude QA adapter", () => {
  it("offers only the read tools and forces the schema", () => {
    const args = claudeQaArgs('{"type":"object"}');
    const tools = args.slice(args.indexOf("--tools") + 1, args.indexOf("--allowedTools"));
    expect(tools).toEqual(["Read", "Glob", "Grep"]);
    expect(args).toContain("--json-schema");
    for (const denied of ["Write", "Edit", "Bash"]) expect(args).toContain(denied);
  });
});

describe("Codex QA adapter", () => {
  it("runs read-only, never workspace-write, and keeps the prompt argument last", () => {
    const args = codexQaArgs("s.json", "last.json", ["stills/cue-01.png", "stills/cue-02.png"]);
    expect(args.slice(args.indexOf("--sandbox"), args.indexOf("--sandbox") + 2)).toEqual(["--sandbox", "read-only"]);
    expect(args).not.toContain("workspace-write");
    expect(args).toContain("--image=stills/cue-02.png");
    expect(args.at(-1)).toBe("-");
  });
});
