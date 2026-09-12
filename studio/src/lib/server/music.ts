import fs from "node:fs";
import path from "node:path";
import type { MusicCatalog, MusicTrack } from "../music";
import { NO_MUSIC } from "../music";
import { mediaAsset } from "./media";
import { exists, REPO } from "./paths";

/**
 * music.json at the repo root, resolved for the browser: every track keeps its catalog entry and gains a
 * public URL so the picker can play it. The render never uses these URLs — tools/lib/music.mjs caches the
 * audio into assets/music/ and works out the gain from the track's measured loudness.
 */
const CATALOG = path.join(REPO, "music.json");

interface StoredTrack {
  id: string;
  name: string;
  seconds?: number;
  summary?: string;
  media: string;
  lufs?: number;
}

function toTrack(t: StoredTrack): MusicTrack {
  return { id: t.id, name: t.name, seconds: t.seconds ?? 0, summary: t.summary ?? "", url: mediaAsset(t.media)?.url ?? null };
}

export function musicCatalog(): MusicCatalog {
  if (!exists(CATALOG)) return { background: [], quiz: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(CATALOG, "utf8")) as { background?: StoredTrack[]; quiz?: StoredTrack[] };
    return { background: (raw.background ?? []).map(toTrack), quiz: (raw.quiz ?? []).map(toTrack) };
  } catch (e) {
    console.warn(`music.json không đọc được: ${e instanceof Error ? e.message : e}`);
    return { background: [], quiz: [] };
  }
}

/** NO_MUSIC and any id the catalog lists are acceptable; anything else is a stale or forged choice. */
export function isTrackId(value: unknown, kind: keyof MusicCatalog): value is string {
  if (value === NO_MUSIC) return true;
  return typeof value === "string" && musicCatalog()[kind].some((t) => t.id === value);
}
