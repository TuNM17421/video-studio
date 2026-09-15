import { describe, expect, it } from "vitest";
import { parseAntigravityQa } from "./qa";

describe("Antigravity QA protocol", () => {
  it("accepts the CLI envelope while preserving structured findings", () => {
    const report = parseAntigravityQa(JSON.stringify({
      response: JSON.stringify({
        verdict: "needs_changes",
        summary: "Một lỗi bố cục.",
        findings: [{
          severity: "major",
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
      findings: [{ severity: "critical", scene: "cue-01.png", message: "m", evidence: "e", acceptance: "a" }],
    });
    expect(() => parseAntigravityQa(raw)).toThrow();
  });

  it("recovers the JSON object even when stray text surrounds it", () => {
    const inner = JSON.stringify({ verdict: "pass", summary: "ok", findings: [] });
    const report = parseAntigravityQa(`some banner line\n${inner}\ntrailing noise`);
    expect(report.verdict).toBe("pass");
  });

  it("accepts a response nested inside the CLI result envelope", () => {
    const raw = JSON.stringify({ result: { response: JSON.stringify({ verdict: "pass", summary: "ok", findings: [] }) } });
    expect(parseAntigravityQa(raw).verdict).toBe("pass");
  });
});
