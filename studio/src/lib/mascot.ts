"use client";

import { useEffect, useState } from "react";
import { dsUrl } from "./client";

/**
 * assets/mascot/griffin/poses.json — written by tools/griffin-assets.py; the pictures themselves are on R2.
 * The Studio never lists poses, moods or props by hand: whatever the designers add shows up here.
 */
export type MascotTable = {
  /** Public folder of the pictures on the media store (R2); `files` maps a picture to its fingerprinted name. */
  base: string;
  files: Record<string, string>;
  moods: Record<string, string>;
  poses: Record<string, { label: string; group: string; w: number; hx: number; moods: string[]; walk?: boolean }>;
  props: Record<string, { label: string; file: string; w: number; h: number; k?: number }>;
};

export const MASCOT_TABLE = "assets/mascot/griffin/poses.json";

/** One fetch per page load, shared by every mascot on screen. */
let pending: Promise<MascotTable> | null = null;
export function loadMascotTable() {
  pending ??= fetch(dsUrl(MASCOT_TABLE)).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${r.statusText}`))));
  pending.catch(() => { pending = null; });
  return pending;
}

export function useMascotTable() {
  const [table, setTable] = useState<MascotTable | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadMascotTable()
      .then((t) => live && setTable(t))
      .catch((e) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => { live = false; };
  }, []);
  return { table, error };
}

/** URL of any picture in the pack by its plain name (`stand-happy`, `badge-wink`, `lightbulb`…). */
export const mascotAsset = (table: MascotTable, name: string) => `${table.base}${table.files[name] ?? `${name}.png`}`;

/** The picture for a pose + mood, falling back to the pose's default when that mood is not drawn yet. */
export function mascotPicture(table: MascotTable, pose: string, mood: string) {
  const id = pose in table.poses ? pose : "stand";
  const drawn = table.poses[id].moods;
  return mascotAsset(table, `${id}-${drawn.includes(mood) ? mood : drawn[0]}`);
}
