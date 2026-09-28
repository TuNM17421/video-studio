import { describe, expect, it, vi } from "vitest";

// Real `updateState`/`researchLog` (./store) and the ledger write to disk under the real repo — mocked here so
// this test cannot leave a stray `research/<rid>/` folder or telemetry event behind (the exact class of bug
// `jobs.test.ts` had before 26/09: a test writing into the real outbox because nothing stood in its way).
const ledgerCalls: unknown[] = [];
vi.mock("../../../../../tools/workflow-ledger.mjs", () => ({
  startRun: (_repo: string, videoRef: string, input: unknown) => { ledgerCalls.push(["startRun", videoRef, input]); return { runId: "run-1" }; },
  addRunMetrics: (_repo: string, videoRef: string, runId: string, metrics: unknown) => { ledgerCalls.push(["addRunMetrics", videoRef, runId, metrics]); },
  finishRun: (_repo: string, videoRef: string, runId: string, result: unknown) => { ledgerCalls.push(["finishRun", videoRef, runId, result]); },
}));

vi.mock("./store", () => ({
  jobKey: (rid: string) => `research:${rid}`,
  researchLog: () => {},
  updateState: (_rid: string, patch: (s: { runs: unknown[] }) => void) => { const s = { runs: [] as unknown[] }; patch(s); return s; },
}));

let outcome: { result: string; usage?: unknown; costUsd?: number } = { result: "ok" };
vi.mock("../agent-step", () => ({
  runAgentStep: async (
    host: { onStart: (r: { agent: string; model: string | null; startedAt: string }) => void; onEnd: (e: { endedAt: string; result: string; usage?: unknown; costUsd?: number }) => void },
    provider: string,
  ) => {
    host.onStart({ agent: provider, model: "m", startedAt: "t0" });
    host.onEnd({ endedAt: "t1", ...outcome });
    return { result: outcome.result, text: "" };
  },
}));

const { runStepAgent } = await import("./agent");

const USAGE = { input: 10000, output: 500, cacheRead: 4000, cacheWrite: 200 };
// The mocked runAgentStep never reads `call` — only `spec.step` matters for these tests.
const spec = { step: "write" as const, call: {} as Parameters<typeof runStepAgent>[2]["call"], idleMs: 1000, capMs: 2000 };

describe("research step telemetry", () => {
  it("emits stage \"script.<bước>\" so the dashboard's existing phase mapping picks it up", async () => {
    ledgerCalls.length = 0;
    outcome = { result: "ok", usage: USAGE, costUsd: 0.42 };
    await runStepAgent("bai-1", "claude", spec, "prompt");
    const [kind, videoRef, input] = ledgerCalls[0] as [string, string, { stage: string; actor: string; mode: string }];
    expect(kind).toBe("startRun");
    // ":" would break the ledger's use of videoId as a folder name (fails on Windows) — "-" is used instead.
    expect(videoRef).toBe("research-bai-1");
    expect(input).toMatchObject({ stage: "script.write", actor: "claude", mode: "agent" });
  });

  it("only Claude's self-reported cost is trusted — Codex/Antigravity keep the same rule as the video pipeline", async () => {
    ledgerCalls.length = 0;
    outcome = { result: "ok", usage: USAGE, costUsd: 0.42 };
    await runStepAgent("bai-1", "claude", spec, "prompt");
    const metricsCall = ledgerCalls.find((c) => (c as unknown[])[0] === "addRunMetrics") as [string, string, string, Record<string, unknown>];
    expect(metricsCall[3]).toMatchObject({ inputTokens: 10000, cachedInputTokens: 4000, outputTokens: 500, costUsd: 0.42, costSource: "provider_reported" });

    ledgerCalls.length = 0;
    outcome = { result: "ok", usage: USAGE, costUsd: 0.42 }; // Codex/Antigravity never actually set costUsd, but even if it did:
    await runStepAgent("bai-1", "codex", spec, "prompt");
    const codexMetrics = ledgerCalls.find((c) => (c as unknown[])[0] === "addRunMetrics") as [string, string, string, Record<string, unknown>];
    expect(codexMetrics[3].costUsd).toBeUndefined();
    expect(codexMetrics[3].costSource).toBeUndefined();
  });

  it("finishes the run done/error to match the step outcome, and skips metrics entirely with no usage", async () => {
    ledgerCalls.length = 0;
    outcome = { result: "failed" };
    await runStepAgent("bai-1", "codex", spec, "prompt");
    expect(ledgerCalls.some((c) => (c as unknown[])[0] === "addRunMetrics")).toBe(false);
    const finish = ledgerCalls.find((c) => (c as unknown[])[0] === "finishRun") as [string, string, string, { status: string }];
    expect(finish[3]).toEqual({ status: "error" });
  });
});
