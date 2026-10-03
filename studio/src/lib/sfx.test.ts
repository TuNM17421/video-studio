import { describe, expect, it } from "vitest";
import type { SfxCatalog } from "./sfx";
import { isSfxLayer, layerLimit, SFX_LAYER_LABEL, soundsByLayer } from "./sfx";

const sound = (id: string, layer: SfxCatalog["sounds"][number]["layer"]) => ({
  id, layer, use: `dùng ${id}`, seconds: 0.5, url: `https://r2/sfx/${id}.wav`, source: null,
});

const catalog = (over: Partial<SfxCatalog> = {}): SfxCatalog => ({
  license: "Pixabay Content License",
  layers: [
    { id: "accent", label: SFX_LAYER_LABEL.accent, why: "Kéo sự chú ý.", max: 4, maxPerMinute: null },
    { id: "transition", label: SFX_LAYER_LABEL.transition, why: "Ranh giới chương.", max: null, maxPerMinute: null },
    { id: "foley", label: SFX_LAYER_LABEL.foley, why: "Tiếng của chuyển động.", max: null, maxPerMinute: 12 },
    { id: "ambience", label: SFX_LAYER_LABEL.ambience, why: "Bed theo cảnh.", max: null, maxPerMinute: null },
  ],
  sounds: [sound("ding", "accent"), sound("tick", "foley"), sound("whoosh", "transition"), sound("pop", "accent")],
  ...over,
});

describe("soundsByLayer", () => {
  it("giữ thứ tự lớp của catalog, không theo thứ tự tiếng", () => {
    const groups = soundsByLayer(catalog());
    expect(groups.map((g) => g.layer.id)).toEqual(["accent", "transition", "foley", "ambience"]);
    expect(groups[0].sounds.map((s) => s.id)).toEqual(["ding", "pop"]);
    expect(groups[2].sounds.map((s) => s.id)).toEqual(["tick"]);
  });

  it("lớp chưa có tiếng nào vẫn hiện, để thư viện nói ra chứ không im lặng bỏ qua", () => {
    const groups = soundsByLayer(catalog());
    const ambience = groups.find((g) => g.layer.id === "ambience");
    expect(ambience?.sounds).toEqual([]);
  });

  it("catalog rỗng thì không dựng khối nào", () => {
    expect(soundsByLayer({ license: "", layers: [], sounds: [] })).toEqual([]);
  });
});

describe("layerLimit", () => {
  it("nói trần cứng của accent và ngân sách mật độ của foley, hai câu khác nhau", () => {
    const [accent, transition, foley] = catalog().layers;
    expect(layerLimit(accent)).toBe("trần cứng 4 lần mỗi video");
    expect(layerLimit(foley)).toBe("ngân sách 12 sự kiện mỗi phút");
    expect(layerLimit(transition)).toBe("");
  });
});

describe("isSfxLayer", () => {
  it("chỉ nhận đúng bốn lớp", () => {
    expect(isSfxLayer("foley")).toBe(true);
    expect(isSfxLayer("music")).toBe(false);
    expect(isSfxLayer(undefined)).toBe(false);
  });
});
