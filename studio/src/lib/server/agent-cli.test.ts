import { describe, expect, it } from "vitest";
import { codexExecArgs } from "./agent-cli";

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
