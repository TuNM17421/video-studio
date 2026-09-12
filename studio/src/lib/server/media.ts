import fs from "node:fs";
import path from "node:path";
import type { MediaAsset } from "../types";
import { exists, REPO } from "./paths";

/**
 * Heavy media (sample videos, audio) lives in a public Cloudflare R2 bucket, not in the repo. The committed
 * media/manifest.json — written by `npm run media` on the machine that owns the bucket — carries the public
 * base URL and every key that is up there, so a clone needs no credentials and no setup to play them.
 * The browser fetches straight from R2; offline, the player falls back to an "không khả dụng" card.
 */
const MANIFEST = path.join(REPO, "media/manifest.json");
const EMPTY: Manifest = { base: "", assets: {} };

export interface Manifest {
  base: string;
  assets: Record<string, { type: string; bytes: number; sha256?: string; updated?: string }>;
}

let cache: { mtimeMs: number; manifest: Manifest } | null = null;

function manifest(): Manifest {
  if (!exists(MANIFEST)) return EMPTY;
  const { mtimeMs } = fs.statSync(MANIFEST);
  if (cache?.mtimeMs !== mtimeMs) {
    try {
      const parsed = JSON.parse(fs.readFileSync(MANIFEST, "utf8")) as Partial<Manifest>;
      cache = { mtimeMs, manifest: { base: parsed.base || "", assets: parsed.assets || {} } };
    } catch (e) {
      console.warn(`media/manifest.json không đọc được: ${e instanceof Error ? e.message : e}`);
      cache = { mtimeMs, manifest: EMPTY };
    }
  }
  return cache.manifest;
}

/** MEDIA_BASE overrides the committed base — for pointing a dev machine at another bucket. */
const baseOf = (m: Manifest) => (process.env.MEDIA_BASE || m.base).replace(/\/+$/, "");

/** A key the manifest does not list has never been pushed: treat it as absent, not as a broken URL. */
export function resolveMedia(m: Manifest, key: string): MediaAsset | null {
  const entry = m.assets[key];
  const base = baseOf(m);
  if (!entry || !base) return null;
  return { key, url: `${base}/${key.split("/").map(encodeURIComponent).join("/")}`, type: entry.type, bytes: entry.bytes };
}

/**
 * The sample of a style: whatever `sampleVideo` names, else the convention `styles/<id>/sample.<ext>` —
 * dropping that file into media/files/ and pushing is enough, no edit to styles/*.json.
 */
export function resolveStyleSample(m: Manifest, id: string, key: string | null | undefined): MediaAsset | null {
  if (key) return resolveMedia(m, key);
  const prefix = `styles/${id}/sample.`;
  const found = Object.keys(m.assets).find((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes("/"));
  return found ? resolveMedia(m, found) : null;
}

export const mediaAsset = (key: string) => resolveMedia(manifest(), key);
export const styleSample = (id: string, key: string | null | undefined) => resolveStyleSample(manifest(), id, key);
