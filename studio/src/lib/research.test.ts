import { describe, expect, it } from "vitest";
import { batches, blankClaim, gate2Waiting, outlineSummary, type Claim, type ClaimCheck, type Difficulty } from "./research";

// Độ khó của 12 claim trong một lượt thật (research/ai-llm-foundation-lms-2609211713): 5 khó, 3 vừa, 4 dễ.
const DIFFICULTY: Record<string, Difficulty> = {
  c1: "normal", c2: "hard", c3: "hard", c4: "hard", c5: "easy", c6: "easy",
  c7: "easy", c8: "hard", c9: "hard", c10: "normal", c11: "easy", c12: "normal",
};
const REAL: Claim[] = Object.entries(DIFFICULTY).map(([id, difficulty]) => ({ ...blankClaim(id), difficulty }));
const without = (...ids: string[]) => REAL.filter((c) => !ids.includes(c.id));

describe("số lượt agent cổng 1 báo trước", () => {
  it("12 claim thật chạy 5 lượt: 3 lô khó, 1 vừa, 1 dễ", () => {
    expect(batches(REAL).map((b) => b.length)).toEqual([2, 2, 1, 3, 4]);
  });

  it("bỏ qua một claim khó là bớt một lượt", () => {
    expect(batches(without("c4"))).toHaveLength(4);
  });

  it("bỏ qua ba claim dễ vẫn 5 lượt — lô dễ còn c11", () => {
    expect(batches(without("c5", "c6", "c7"))).toHaveLength(5);
  });
});

describe("tóm tắt dàn ý", () => {
  it("nói theo mục, kèm khoảng số slide", () => {
    const outline = Array.from({ length: 60 }, (_, i) => ({ slide: i === 59 ? 72 : i + 1 }));
    expect(outlineSummary(outline)).toBe("60 mục, slide 1–72");
  });

  it("dàn ý rỗng hay chỉ một slide", () => {
    expect(outlineSummary([])).toBe("0 mục");
    expect(outlineSummary([{ slide: 5 }])).toBe("1 mục, slide 5");
  });
});

describe("claim chờ ở cổng 2", () => {
  const check = (claim: string, patch: Partial<ClaimCheck> = {}): ClaimCheck => ({
    claim, ok: true, verdict: "ok", quotes: { total: 1, verified: 1, unverifiable: 0 }, problems: [], warnings: [], ...patch,
  });
  const claims = [blankClaim("c1"), blankClaim("c2"), { ...blankClaim("c3"), priority: "high" as const }, blankClaim("c4")];
  const evidence = {
    c1: check("c1", { ok: false, problems: ["trích đoạn không có trên trang"] }),
    c2: check("c2", { verdict: "insufficient" }),
    c3: check("c3", { warnings: ["kết luận ok nhưng có trích đoạn phản bác"] }),
    c4: check("c4"),
  };

  it("gồm cả claim qua soát mà không đủ nguồn hoặc mang cảnh báo nặng — không chỉ claim trượt soát", () => {
    // Trước đây bảng chọn chỉ liệt kê c1, còn máy chủ dừng vì cả c2, c3: cổng mở ra thiếu claim và không qua được.
    expect(gate2Waiting(claims, evidence).map((w) => w.claim.id)).toEqual(["c1", "c2", "c3"]);
  });

  it("claim đã quyết định không bị hỏi lại, trừ khi vẫn trượt soát", () => {
    expect(gate2Waiting(claims, evidence, { c1: "accept", c2: "accept", c3: "accept" }).map((w) => w.claim.id)).toEqual(["c1"]);
  });
});
