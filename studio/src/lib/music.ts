/**
 * Music the Studio can put under a video. The catalog itself is music.json at the repo root (shared with
 * the command line through tools/lib/music.mjs); the audio lives on the media bucket, never in git.
 *
 * Both tracks are finishing decisions picked on the render step. Only *where* quiz music plays is settled
 * early: the plan's "Video có quiz" tick makes the agent mark those cues `quiz: true` in cues.js.
 */
export const NO_MUSIC = "none";

export interface MusicTrack {
  id: string;
  name: string;
  seconds: number;
  summary: string;
  /** Public URL on the media bucket, or null when the manifest does not list the key yet. */
  url: string | null;
}

export interface MusicCatalog {
  background: MusicTrack[];
  quiz: MusicTrack[];
}

/** What a video stores: a track id from each list, or NO_MUSIC. */
export interface MusicChoice {
  background: string;
  quiz: string;
}

export const SILENT: MusicChoice = { background: NO_MUSIC, quiz: NO_MUSIC };

export const trackName = (tracks: MusicTrack[], id: string) =>
  tracks.find((t) => t.id === id)?.name ?? (id === NO_MUSIC ? "Không có nhạc" : id);

/** 392 → "6:32" */
export function trackLength(seconds: number) {
  const m = Math.floor(seconds / 60);
  return `${m}:${String(Math.round(seconds - m * 60)).padStart(2, "0")}`;
}
