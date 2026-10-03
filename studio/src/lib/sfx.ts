/**
 * Catalog tiếng động cho trình duyệt: `sfx.json` ở gốc repo, mỗi tiếng kèm URL công khai trên kho media.
 *
 * Phát thẳng từ R2 được vì bucket giữ đúng bản đã chuẩn hoá mà video dùng (`sfx-fetch --prepare` dựng
 * `media/files/sfx/`, bản tải về không xử lý lại) — nghe thử ở đây là nghe đúng cái sẽ nghe trong phim.
 * Bản render không bao giờ dùng URL này: `tools/sfx-mix.mjs` đọc `assets/sfx/` dưới máy.
 */

/** Bốn lớp của `sfx.json._layers`, theo thứ tự nói về chúng. */
export const SFX_LAYERS = ["accent", "transition", "foley", "ambience"] as const;
export type SfxLayer = (typeof SFX_LAYERS)[number];

/** Tên tiếng Việt của lớp — một chỗ duy nhất, dùng cho cả thư viện và panel đề xuất. */
export const SFX_LAYER_LABEL: Record<SfxLayer, string> = {
  accent: "Tiếng nhấn",
  transition: "Chuyển đoạn",
  foley: "Tiếng của chuyển động",
  ambience: "Tiếng nền",
};

export interface SfxSound {
  id: string;
  layer: SfxLayer;
  /** "khi nào dùng" viết trong catalog — câu này là thứ giữ cho người sau không rải bừa. */
  use: string;
  seconds: number;
  /** null = key chưa có trên kho media, nghe thử không được. */
  url: string | null;
  /** Trang nguồn, để tra lại giấy phép. */
  source: string | null;
}

export interface SfxLayerInfo {
  id: SfxLayer;
  label: string;
  /** Lý do lớp này tồn tại, chép từ `_layers[].why`. */
  why: string;
  /** Trần cứng số lần mỗi video (accent), null nếu lớp không có trần. */
  max: number | null;
  /** Ngân sách mật độ mỗi phút (foley), null nếu không có. */
  maxPerMinute: number | null;
}

export interface SfxCatalog {
  /** Giấy phép của cả bộ, chép từ `_license`. */
  license: string;
  layers: SfxLayerInfo[];
  sounds: SfxSound[];
}

export const EMPTY_SFX_CATALOG: SfxCatalog = { license: "", layers: [], sounds: [] };

export const isSfxLayer = (value: unknown): value is SfxLayer =>
  typeof value === "string" && (SFX_LAYERS as readonly string[]).includes(value);

/**
 * Tiếng của từng lớp, theo đúng thứ tự `SFX_LAYERS`. Lớp không có tiếng nào vẫn trả về (kèm mảng rỗng)
 * để thư viện nói được "lớp này chưa có tiếng" thay vì im lặng bỏ qua.
 */
export function soundsByLayer(catalog: SfxCatalog): { layer: SfxLayerInfo; sounds: SfxSound[] }[] {
  return SFX_LAYERS.map((id) => {
    const layer = catalog.layers.find((l) => l.id === id) ?? { id, label: SFX_LAYER_LABEL[id], why: "", max: null, maxPerMinute: null };
    return { layer, sounds: catalog.sounds.filter((s) => s.layer === id) };
  }).filter(({ layer, sounds }) => sounds.length > 0 || layer.why !== "");
}

/** Câu một dòng về trần của một lớp, hoặc chuỗi rỗng khi lớp không có trần nào. */
export function layerLimit(layer: SfxLayerInfo): string {
  if (layer.max != null) return `trần cứng ${layer.max} lần mỗi video`;
  if (layer.maxPerMinute != null) return `ngân sách ${layer.maxPerMinute} sự kiện mỗi phút`;
  return "";
}
