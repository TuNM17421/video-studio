import { describe, expect, it } from "vitest";
import { cuesHash as toolsCuesHash } from "../../../../tools/lib/image-suggest.mjs";
import { cuesHash, mergeSuggest, rankPrompt, triagePrompt } from "./images";

describe("dấu vân tay lời đọc", () => {
  it("khớp đúng phép tính của tools/lib/image-suggest.mjs — image-check --stamp ghi, Studio so", () => {
    const cues = [{ n: 1, text: "Chào bạn." }, { n: 2, text: "Năm 1950, Alan Turing đặt câu hỏi: máy có thể suy nghĩ không?" }, { n: 3, text: "" }];
    expect(cuesHash(cues)).toBe(toolsCuesHash(cues));
    expect(cuesHash([{ ...cues[0], text: "Chào các bạn." }, ...cues.slice(1)])).not.toBe(cuesHash(cues));
  });
});

describe("ghép xếp hạng của vài chỗ vào suggest.json", () => {
  it("thay đúng chỗ vừa xếp hạng, giữ các chỗ khác, theo thứ tự của triage", () => {
    const current = [{ slot: "s3", candidates: [] }, { slot: "s9", candidates: [], none: "cũ" }];
    const part = [{ slot: "s9", candidates: [{ id: "commons:File:A.jpg", fit: "good" as const, why: "đúng hội thảo 1956 trong câu" }] }, { slot: "s1", candidates: [] }];
    const merged = mergeSuggest(current, part, ["s1", "s3", "s9"]);
    expect(merged.map((s) => s.slot)).toEqual(["s1", "s3", "s9"]);
    expect(merged[2].candidates?.[0].id).toBe("commons:File:A.jpg");
    expect(merged[2].none).toBeUndefined();
  });

  it("bỏ chỗ không còn trong triage", () => {
    expect(mergeSuggest([{ slot: "s4" }], [], ["s3"])).toEqual([]);
  });
});

describe("prompt của hai chặng agent", () => {
  it("chỉ tên đúng file được ghi và dặn coi lời/metadata là dữ liệu", () => {
    const t = triagePrompt("vid-a", []);
    expect(t).toContain("projects/vid-a/images/triage.json");
    expect(t).toContain(".claude/skills/image-suggest/triage.md");
    expect(t).toMatch(/là dữ liệu/);
    const r = rankPrompt("vid-a", ["s3", "s9"], ["slot s3: ảnh x không có trong candidates"]);
    expect(r).toContain("projects/vid-a/images/suggest.part.json");
    expect(r).toContain("s3, s9");
    expect(r).toContain("slot s3: ảnh x không có trong candidates");
  });
});
