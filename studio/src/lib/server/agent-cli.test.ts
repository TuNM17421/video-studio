import { describe, expect, it } from "vitest";
import { antigravityExecArgs, antigravityStdin, codexExecArgs } from "./agent-cli";

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
});
