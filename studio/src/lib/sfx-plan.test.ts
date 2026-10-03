import { describe, expect, it } from "vitest";
import { agentSpots, EMPTY_SFX_STATE, planFrom, planHasSound, pruneDecisions, sectionRange, suggestSpots, timecode } from "./sfx-plan";
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

describe("agentSpots — soát bằng code, không tin chữ agent viết", () => {
  const SOUNDS = [
    { id: "ding", layer: "accent" }, { id: "pop", layer: "accent" }, { id: "ting", layer: "accent" },
    { id: "flash", layer: "accent" }, { id: "tick", layer: "foley" }, { id: "whoosh", layer: "transition" },
  ];
  const spot = (cue: number, anchor: string, sound = "tick") => ({ cue, anchor, sound, why: "vì hình đang diễn" });

  it("nhận chỗ hợp lệ và neo đúng câu", () => {
    const { spots, dropped } = agentSpots({ spots: [spot(1, "câu 1")] }, CUES, SOUNDS);
    expect(dropped).toEqual([]);
    expect(spots[0]).toMatchObject({ id: "agent:1:câu 1", kind: "agent", soundId: "tick", cue: 1, anchor: "câu 1" });
  });

  it("bỏ cụm từ không có nguyên văn trong lời — nếu không `spokenAt` sẽ ném lúc trộn", () => {
    const { spots, dropped } = agentSpots({ spots: [spot(1, "không có trong lời")] }, CUES, SOUNDS);
    expect(spots).toEqual([]);
    expect(dropped[0]).toContain("không có nguyên văn");
  });

  it("bỏ câu lặng (khoảng chờ quiz) và câu không tồn tại", () => {
    const { dropped } = agentSpots({ spots: [spot(4, "câu 4"), spot(99, "gì đó")] }, CUES, SOUNDS);
    expect(dropped[0]).toContain("câu lặng");
    expect(dropped[1]).toContain("không có câu này");
  });

  it("bỏ tiếng không có trong danh mục", () => {
    const { dropped } = agentSpots({ spots: [spot(1, "câu 1", "tieng-bia")] }, CUES, SOUNDS);
    expect(dropped[0]).toContain('danh mục không có tiếng "tieng-bia"');
  });

  it("áp trần 4 tiếng nhấn ngay ở đây, không để agent tự hứa đã đếm", () => {
    const many = [1, 2, 3, 5, 6].map((n, i) => spot(n, `câu ${n}`, ["ding", "pop", "ting", "flash", "ding"][i]));
    const { spots, dropped } = agentSpots({ spots: many }, CUES, SOUNDS);
    expect(spots).toHaveLength(4);
    expect(dropped[0]).toContain("quá trần 4");
  });

  it("đề xuất trùng cue+cụm với chỗ kịch bản đã khai thì bản của kịch bản thắng", () => {
    const { spots } = agentSpots({ spots: [spot(2, "thả kịch bản", "ding")] }, CUES, SOUNDS);
    const merged = suggestSpots(CUES, SECTIONS, spots);
    expect(merged.filter((s) => s.cue === 2)).toHaveLength(1);
    expect(merged.find((s) => s.cue === 2)?.kind).toBe("script");
  });

  it("chỗ của agent xếp theo mốc thời gian cùng những chỗ khác", () => {
    const { spots } = agentSpots({ spots: [spot(5, "câu 5")] }, CUES, SOUNDS);
    const merged = suggestSpots(CUES, SECTIONS, spots);
    expect(merged.map((s) => s.frame)).toEqual([...merged.map((s) => s.frame)].sort((a, b) => a - b));
  });

  it("triage.json rỗng hay sai dạng thì không có chỗ nào, không ném", () => {
    expect(agentSpots(null, CUES, SOUNDS).spots).toEqual([]);
    expect(agentSpots({ spots: "xin chào" }, CUES, SOUNDS).spots).toEqual([]);
  });
});
