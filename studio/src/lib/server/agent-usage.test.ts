import { describe, expect, it } from "vitest";
import { perRunCodexUsage, type AgentMetrics } from "./agent";

const m = (input?: number, output?: number, sessionId = "s1"): AgentMetrics => ({ toolCalls: 0, sessionId, inputTokens: input, cachedInputTokens: input === undefined ? undefined : 0, outputTokens: output });

describe("perRunCodexUsage", () => {
  it("turns the thread total into this run's share", () => {
    const run1 = m(1000, 100);
    perRunCodexUsage("v", run1, []);
    const run2 = m(1900, 250);
    perRunCodexUsage("v", run2, [{ sessionId: "s1", cliCumulative: run1.cliCumulative }]);
    expect(run2.inputTokens).toBe(900);
    expect(run2.outputTokens).toBe(150);
  });

  it("a run without usage leaves no baseline, so the next resume is not inflated", () => {
    const run1 = m(1000, 100);
    perRunCodexUsage("v", run1, []);
    const stopped = m(undefined, undefined);
    perRunCodexUsage("v", stopped, [{ sessionId: "s1", cliCumulative: run1.cliCumulative }]);
    expect(stopped.cliCumulative).toBeUndefined();
    // What runs.jsonl would hold: run 1's real total, and an entry without cliCumulative for the stopped run.
    const run3 = m(1900, 250);
    perRunCodexUsage("v", run3, [{ sessionId: "s1", cliCumulative: run1.cliCumulative }, { sessionId: "s1" }]);
    expect(run3.inputTokens).toBe(900);
  });

  it("ignores an empty {} baseline already written by an older build", () => {
    const run1 = m(1000, 100);
    perRunCodexUsage("v", run1, []);
    const run3 = m(1900, 250);
    perRunCodexUsage("v", run3, [{ sessionId: "s1", cliCumulative: run1.cliCumulative }, { sessionId: "s1", cliCumulative: {} }]);
    expect(run3.inputTokens).toBe(900);
  });
});
