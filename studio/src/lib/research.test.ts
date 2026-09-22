import { describe, expect, it } from "vitest";
import { claimCap as toolsClaimCap } from "../../../tools/lib/research-check.mjs";
import * as lint from "../../../tools/lib/script-lint.mjs";
import { batches, blankClaim, claimCap, gate2Waiting, outlineSummary, placeEditIssues, RETRY_BATCH, SCRIPT_BUDGET, scriptBudget, type Claim, type ClaimCheck, type Difficulty, type EditIssue } from "./research";

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

describe("độ dài kịch bản theo số câu đã đặt", () => {
  it("cùng con số với phần soát (tools/lib/script-lint.mjs) — prompt báo đúng mức code sẽ bắt", () => {
    expect(SCRIPT_BUDGET.wordsPerCue).toBe(lint.WORDS_PER_CUE);
    expect(SCRIPT_BUDGET.warnAbove).toBe(lint.LENGTH_WARN);
    expect(SCRIPT_BUDGET.syllablesPerSecond).toBe(lint.SYLLABLES_PER_SECOND);
  });

  it("20 câu là khoảng 480 từ, gần ba phút lời đọc, tối đa 24 câu", () => {
    expect(scriptBudget(20)).toEqual({ cues: 20, maxCues: 24, words: 480, minutes: 2.8 });
  });
});

describe("góp ý biên tập gắn vào câu", () => {
  const cues = [
    { n: 1, text: "Mỗi lần bạn gõ một câu hỏi, mô hình không đọc từng chữ." },
    { n: 2, text: "Nó đọc từng mảnh chữ, gọi là token, để so sánh với nhau." },
    { n: 3, text: "Cửa sổ ngữ cảnh chứa được một trăm hai mươi tám nghìn token." },
  ];
  const note = (patch: Partial<EditIssue>): EditIssue => ({ cue: 1, type: "clarity", problem: "p", fix: "f", ...patch });

  it("theo đoạn trích khi số câu đã dời sau lượt sửa; đoạn trích không còn ở đâu thì góp ý đã xử lý", () => {
    const out = placeEditIssues(cues, [
      note({ cue: 5, type: "clarity", quote: "gọi là token, để so sánh" }),
      note({ cue: 2, type: "spoken", quote: "một câu văn đã bị viết lại hoàn toàn" }),
      note({ cue: 3, type: "flow" }),
      note({ cue: null, type: "hook" }),
    ]);
    // Bản cũ gắn theo số: góp ý "câu 5" mất hẳn, góp ý đã sửa vẫn hiện cạnh câu 2.
    expect(out.byCue.get(2)?.map((i) => i.type)).toEqual(["clarity"]);
    expect(out.byCue.get(3)?.map((i) => i.type)).toEqual(["flow"]);
    expect(out.resolved.map((i) => i.type)).toEqual(["spoken"]);
    expect(out.general.map((i) => i.type)).toEqual(["hook"]);
  });

  it("đoạn trích quá ngắn thì không dùng để dò — theo số câu", () => {
    expect(placeEditIssues(cues, [note({ cue: 1, quote: "token" })]).byCue.get(1)).toHaveLength(1);
  });
});

describe("số claim theo số câu", () => {
  it("cùng phép tính với phần soát bóc tách (tools/lib/research-check.mjs)", () => {
    for (const n of [1, 5, 8, 20, 21, 40, 60, 80]) expect(claimCap(n)).toBe(toolsClaimCap(n));
  });

  it("kịch bản 20 câu research tối đa 10 claim — lượt thật đặt 14, bốn claim không câu nào dùng", () => {
    expect(claimCap(20)).toBe(10);
  });
});

describe("lô research lại", () => {
  it("từng cặp, kể cả claim dễ vốn đi lô sáu ở lần đầu", () => {
    const easy = Array.from({ length: 5 }, (_, i) => ({ ...blankClaim(`c${i + 1}`), difficulty: "easy" as const }));
    expect(batches(easy).map((b) => b.length)).toEqual([5]);
    expect(batches(easy, RETRY_BATCH).map((b) => b.length)).toEqual([2, 2, 1]);
  });

  it("không bao giờ lớn hơn lô của độ khó (claim khó vẫn hai)", () => {
    const hard = Array.from({ length: 3 }, (_, i) => ({ ...blankClaim(`c${i + 1}`), difficulty: "hard" as const }));
    expect(batches(hard, 6).map((b) => b.length)).toEqual([2, 1]);
  });
});
