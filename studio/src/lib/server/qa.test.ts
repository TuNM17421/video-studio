import { describe, expect, it } from "vitest";
import { parseQaReport, problemLines, usageFrom, verifySummary } from "./qa";

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

/**
 * Hai hàm này đọc output của `tools/verify.mjs`, nên bài test giữ đúng hình dạng thật của output đó:
 * cảnh báo là `  ! …`, lỗi là `  - …` dưới dòng `N problem(s):`. Chữ "warning" không có ở đâu cả — bắt
 * theo chữ đó là cách bản cũ luôn báo "không có lỗi".
 */
const VERIFY_PASS = [
  "cards: 37  Components 15 · Iconography 1 · Brand 1",
  "components: 62 files · scenes: 24",
  "videos: 1 (--video; 13 other video(s) not checked)",
  "  d2-01-lab                     9491 f · 47 cues · 87 caption pages · 3258 frames rendered in 1135 ms",
  "design system: vinuni-lesson-video-ds",
  "  ! components/brand has 0 card files (want 1)",
  "  ! components/code has 0 card files (want 1)",
  "  ! videos/n2-00-bang-trang: board — p1-real starts 48 frames after its beat",
  "",
  "all checks passed",
].join("\n");

const VERIFY_FAIL = [
  "videos: 14",
  "design system: vinuni-lesson-video-ds",
  "  ! videos/test-giong: chưa dựng cảnh (có cues.js, chưa có video.jsx) — bỏ qua",
  "",
  "2 problem(s):",
  "  - videos/n1-05-co-che-chu-y is missing cues.js",
  "  - videos/n1-05-co-che-chu-y does not build or load: Build failed with 3 errors:",
].join("\n");

describe("đọc output của verify", () => {
  it("đếm cảnh báo theo dòng `! …` mà verify thật sự in ra", () => {
    expect(verifySummary(VERIFY_PASS)).toBe("3 cảnh báo");
  });

  it("không nhận nhầm dòng thống kê hay dòng lỗi thành cảnh báo", () => {
    expect(verifySummary(VERIFY_FAIL)).toBe("1 cảnh báo");
    expect(verifySummary("videos: 1\nall checks passed")).toBe("không có lỗi");
  });

  it("nêu chính các lỗi, không phải dòng đếm — dòng đếm không cho biết video nào hỏng", () => {
    expect(problemLines(VERIFY_FAIL)).toBe(
      "videos/n1-05-co-che-chu-y is missing cues.js · videos/n1-05-co-che-chu-y does not build or load: Build failed with 3 errors:",
    );
  });

  it("verify chết vì lý do khác (không có dòng lỗi nào) thì vẫn có gì đó để đọc", () => {
    expect(problemLines("npm ERR! Lifecycle script `verify` failed with error:")).toContain("error");
    expect(problemLines("")).toBe("xem nhật ký");
  });
});
