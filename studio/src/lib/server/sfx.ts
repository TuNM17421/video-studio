import fs from "node:fs";
import path from "node:path";
import type { SfxCatalog, SfxLayer, SfxLayerInfo, SfxSound } from "../sfx";
import { EMPTY_SFX_CATALOG, isSfxLayer, SFX_LAYER_LABEL, SFX_LAYERS } from "../sfx";
import { mediaAsset } from "./media";
import { exists, REPO } from "./paths";

/**
 * `sfx.json` ở gốc repo, giải sẵn cho trình duyệt. Cùng khuôn với `server/music.ts`: catalog là file ở
 * gốc repo, URL lấy từ `media/manifest.json`, và một key chưa đẩy lên kho media thì trả `url: null` chứ
 * không dựng một URL hỏng.
 */
const CATALOG = path.join(REPO, "sfx.json");

interface StoredLayer {
  peakTargetDb?: number;
  rmsTargetDb?: number;
  duckDb?: number;
  max?: number;
  maxPerMinute?: number;
  why?: string;
}

interface StoredSfx {
  id: string;
  file: string;
  media?: string | null;
  layer?: string;
  use?: string;
  source?: string;
  seconds?: number;
}

interface StoredCatalog {
  _license?: string;
  _layers?: Record<string, StoredLayer>;
  sfx?: StoredSfx[];
}

function toLayer(id: SfxLayer, stored: StoredLayer | undefined): SfxLayerInfo {
  return {
    id,
    label: SFX_LAYER_LABEL[id],
    why: stored?.why ?? "",
    max: Number.isFinite(stored?.max) ? Number(stored?.max) : null,
    maxPerMinute: Number.isFinite(stored?.maxPerMinute) ? Number(stored?.maxPerMinute) : null,
  };
}

/** Tiếng khai lớp lạ (hoặc không khai) bị bỏ: `sfx-mix` cũng không xếp được nó vào luật nào. */
function toSound(stored: StoredSfx): SfxSound | null {
  if (!stored.id || !isSfxLayer(stored.layer)) return null;
  return {
    id: stored.id,
    layer: stored.layer,
    use: stored.use ?? "",
    seconds: Number.isFinite(stored.seconds) ? Number(stored.seconds) : 0,
    url: stored.media ? mediaAsset(stored.media)?.url ?? null : null,
    source: stored.source ?? null,
  };
}

export function sfxCatalog(): SfxCatalog {
  if (!exists(CATALOG)) return EMPTY_SFX_CATALOG;
  try {
    const raw = JSON.parse(fs.readFileSync(CATALOG, "utf8")) as StoredCatalog;
    return {
      license: raw._license ?? "",
      layers: SFX_LAYERS.map((id) => toLayer(id, raw._layers?.[id])),
      sounds: (raw.sfx ?? []).map(toSound).filter((s): s is SfxSound => s !== null),
    };
  } catch (e) {
    console.warn(`sfx.json không đọc được: ${e instanceof Error ? e.message : e}`);
    return EMPTY_SFX_CATALOG;
  }
}

/** Id có thật trong catalog — để một lựa chọn cũ hoặc bị sửa tay không đi tiếp vào lệnh trộn. */
export const isSfxId = (value: unknown): value is string =>
  typeof value === "string" && sfxCatalog().sounds.some((s) => s.id === value);
