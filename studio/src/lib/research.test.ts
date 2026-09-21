import { describe, expect, it } from "vitest";
import { batches, blankClaim, outlineSummary, type Claim, type Difficulty } from "./research";

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
