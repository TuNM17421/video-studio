import { describe, expect, it } from "vitest";
import { parseQaReport, usageFrom } from "./qa";

describe("QA report protocol", () => {
  it("accepts the CLI envelope while preserving structured findings", () => {
    const report = parseQaReport(JSON.stringify({
      response: JSON.stringify({
        verdict: "needs_changes",
        summary: "Một lỗi bố cục.",
        findings: [{
          severity: "major",
          code: "overlap",
          scene: "cue-03.png",
          message: "Chữ chạm mascot.",
          evidence: "Khối chữ phủ cánh trái.",
          acceptance: "Tách khối chữ khỏi mascot.",
        }],
      }),
    }));
    expect(report.findings[0].scene).toBe("cue-03.png");
    expect(report.verdict).toBe("needs_changes");
  });

  it("rejects a finding with a severity outside the enum instead of letting it bypass the gate", () => {
    const raw = JSON.stringify({
      verdict: "needs_changes",
      summary: "x",
      findings: [{ severity: "critical", code: "overlap", scene: "cue-01.png", message: "m", evidence: "e", acceptance: "a" }],
    });
    expect(() => parseQaReport(raw)).toThrow();
  });

  it("recovers the JSON object even when stray text surrounds it", () => {
    const inner = JSON.stringify({ verdict: "pass", summary: "ok", findings: [] });
    const report = parseQaReport(`some banner line\n${inner}\ntrailing noise`);
    expect(report.verdict).toBe("pass");
  });

  it("accepts a response nested inside the CLI result envelope", () => {
    const raw = JSON.stringify({ result: { response: JSON.stringify({ verdict: "pass", summary: "ok", findings: [] }) } });
    expect(parseQaReport(raw).verdict).toBe("pass");
  });

  it("rejects a finding without a stable defect code — the ledger cannot identify it across rounds", () => {
    const raw = JSON.stringify({
      verdict: "needs_changes",
      summary: "x",
      findings: [{ severity: "major", scene: "cue-01.png", message: "m", evidence: "e", acceptance: "a" }],
    });
    expect(() => parseQaReport(raw)).toThrow();
    const wrong = JSON.parse(raw);
    wrong.findings[0].code = "mascot-tilt";
    expect(() => parseQaReport(JSON.stringify(wrong))).toThrow();
  });

  it("reads Claude's structured_output field", () => {
    const raw = JSON.stringify({ type: "result", result: "", structured_output: { verdict: "pass", summary: "ok", findings: [] } });
    expect(parseQaReport(raw).verdict).toBe("pass");
  });
});

describe("QA usage", () => {
  it("reads Claude's result usage and cost", () => {
    const raw = JSON.stringify({ type: "result", total_cost_usd: 0.05, usage: { input_tokens: 10, cache_read_input_tokens: 5, output_tokens: 3 }, modelUsage: { "claude-haiku-4-5-20251001": {} } });
    expect(usageFrom(raw)).toEqual({ inputTokens: 10, cachedInputTokens: 5, outputTokens: 3, costUsd: 0.05, model: "claude-haiku-4-5-20251001" });
  });

  it("reads Codex's turn.completed line out of the event stream and leaves cost unmeasured", () => {
    const raw = [
      JSON.stringify({ type: "thread.started", thread_id: "t" }),
      JSON.stringify({ type: "turn.completed", usage: { input_tokens: 100, cached_input_tokens: 40, output_tokens: 20 } }),
    ].join("\n");
    expect(usageFrom(raw)).toEqual({ inputTokens: 100, cachedInputTokens: 40, outputTokens: 20, costUsd: undefined });
  });
});

describe("usageFrom cache creation", () => {
  it("counts Claude cache_creation as input", () => {
    const raw = JSON.stringify({ usage: { input_tokens: 400, cache_creation_input_tokens: 48000, cache_read_input_tokens: 52000, output_tokens: 6000 } });
    expect(usageFrom(raw)).toMatchObject({ inputTokens: 48400, cachedInputTokens: 52000, outputTokens: 6000 });
  });
});
