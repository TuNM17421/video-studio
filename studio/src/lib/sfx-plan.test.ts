import { describe, expect, it } from "vitest";
import { EMPTY_SFX_STATE, planFrom, planHasSound, pruneDecisions, sectionRange, suggestSpots, timecode } from "./sfx-plan";
import type { Cue } from "./types";

const cue = (n: number, over: Partial<Cue> = {}): Cue => ({
  n, text: `câu ${n}`, title: "", section: 1, visual: "", silent: false, quiz: false, sfx: null,
  start: (n - 1) * 100, end: n * 100, ...over,
});

const CUES: Cue[] = [
  cue(1),
  cue(2, { sfx: { id: "pop", word: "thả kịch bản" } }),
  cue(3, { section: 2 }),
  cue(4, { section: 2, silent: true, quiz: true, sfx: { id: "ding", word: null } }),
  cue(5, { section: 2 }),
  cue(6, { section: 3 }),
];
const SECTIONS = ["Mở đầu", "Năm bước", "Kết"];

describe("suggestSpots", () => {
  it("mở màn + ranh giới phần + chỗ kịch bản đã khai", () => {
    const spots = suggestSpots(CUES, SECTIONS);
    expect(spots.map((s) => s.id)).toEqual(["open", "script:2", "section:3", "section:6"]);
    expect(spots[0]).toMatchObject({ kind: "open", soundId: "whoosh-long", frame: 0 });
    expect(spots[1]).toMatchObject({ kind: "script", soundId: "pop", cue: 2, anchor: "thả kịch bản" });
    expect(spots[2].why).toBe('Vào phần "Năm bước"');
  });

  it("phần đầu không có whoosh section — mở màn đã chiếm chỗ đó", () => {
    const ids = suggestSpots(CUES, SECTIONS).filter((s) => s.kind === "section").map((s) => s.cue);
    expect(ids).toEqual([3, 6]);
  });

  it("câu lặng bị bỏ qua, kể cả khi nó khai sfx — khoảng chờ quiz nằm trong số đó", () => {
    const spots = suggestSpots(CUES, SECTIONS);
    expect(spots.some((s) => s.cue === 4)).toBe(false);
  });

  it("không có cue nào thì không đề xuất gì, kể cả tiếng mở màn", () => {
    expect(suggestSpots([], [])).toEqual([]);
  });
});

describe("planFrom", () => {
  const spots = suggestSpots(CUES, SECTIONS);

  it("chỉ đưa vào plan những chỗ đã duyệt", () => {
    const plan = planFrom("v1", spots, { decisions: { open: { use: true }, "script:2": { use: false } }, beds: {} }, CUES, SECTIONS);
    expect(plan.hits).toEqual([{ id: "whoosh-long", frame: 0, why: "Mở màn video" }]);
  });

  it("đổi tiếng thì plan mang tiếng người dựng chọn, không phải tiếng đề xuất", () => {
    const plan = planFrom("v1", spots, { decisions: { "script:2": { use: true, soundId: "ting" } }, beds: {} }, CUES, SECTIONS);
    expect(plan.hits).toEqual([{ id: "ting", cue: 2, anchor: "thả kịch bản", why: 'Kịch bản khai: "thả kịch bản"' }]);
  });

  it("tiếng nền của một phần phủ từ câu đầu tới câu cuối của phần đó", () => {
    const plan = planFrom("v1", spots, { decisions: {}, beds: { "2": "wind" } }, CUES, SECTIONS);
    expect(plan.beds).toEqual([{ id: "wind", fromCue: 3, toCue: 5, why: 'Tiếng nền phần "Năm bước"' }]);
  });

  it("chưa duyệt gì thì không có gì để trộn", () => {
    const plan = planFrom("v1", spots, EMPTY_SFX_STATE, CUES, SECTIONS);
    expect(planHasSound(plan)).toBe(false);
  });
});

describe("pruneDecisions", () => {
  it("quyết định của một chỗ không còn tồn tại bị bỏ, tiếng nền thì giữ", () => {
    const state = { decisions: { open: { use: true }, "script:99": { use: true } }, beds: { "2": "wind" } };
    const pruned = pruneDecisions(state, suggestSpots(CUES, SECTIONS));
    expect(Object.keys(pruned.decisions)).toEqual(["open"]);
    expect(pruned.beds).toEqual({ "2": "wind" });
  });
});

describe("tiện ích", () => {
  it("timecode đọc như cuesheet của sfx-mix", () => {
    expect(timecode(0)).toBe("00:00.00");
    expect(timecode(257)).toBe("00:08.57");
  });

  it("sectionRange trả null cho phần không có câu nào", () => {
    expect(sectionRange(CUES, 9)).toBeNull();
    expect(sectionRange(CUES, 3)).toEqual({ from: 6, to: 6 });
  });
});
