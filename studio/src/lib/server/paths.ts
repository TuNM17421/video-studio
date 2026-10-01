import fs from "node:fs";
import path from "node:path";

/** The studio runs from <repo>/studio (npm run dev), so the repo is one level up. */
export const REPO = path.resolve(process.cwd(), "..");
export const DS = path.join(REPO, "vinuni-lesson-video-ds");
export const STYLES = path.join(REPO, "styles");
/** Bản design system đã chuyển sang khuôn project của claude.ai/design — /design-sync sinh ra, gitignore. */
export const DS_BUNDLE = path.join(REPO, "ds-bundle");
/** Cảnh dựng bên Claude Design, mang về. Sâu đúng hai cấp để mọi `../../` của trang về đúng gốc ds-bundle. */
export const importedDir = (id: string) => path.join(DS_BUNDLE, "cd", id);
/** Trang của bản nhập, hoặc null khi video này chưa nhập gì. */
export const importedPage = (id: string) => {
  const dir = importedDir(id);
  if (!fs.existsSync(dir)) return null;
  return fs.readdirSync(dir).find((f) => /\.html$/i.test(f)) ?? null;
};
export const ID_RE = /^[a-z0-9][a-z0-9-]{1,60}$/;
export const DAY_RE = /^Day\d{2}$/;

export const videoDir = (id: string) => path.join(DS, "ui_kits/lesson-video/videos", id);
export const projectDir = (id: string) => path.join(REPO, "projects", id);
export const stateDir = (id: string) => path.join(projectDir(id), ".studio");
/**
 * Where a video's narration master lives. New videos land in voice/out — the voice no longer has to come
 * from ElevenLabs — while videos recorded before the move keep reading their old folder.
 */
const VOICE_OUT = (id: string) => path.join(REPO, "voice/out", id);
const VOICE_OUT_LEGACY = (id: string) => path.join(REPO, "tts-elevenlabs/out", id);
export const voiceOut = (id: string) => {
  const current = VOICE_OUT(id);
  if (fs.existsSync(path.join(current, "voice.cues.json"))) return current;
  const legacy = VOICE_OUT_LEGACY(id);
  return fs.existsSync(path.join(legacy, "voice.cues.json")) ? legacy : current;
};
/** Every folder a video's voice could occupy — for cleanup, which must not miss the legacy one. */
export const voiceOutAll = (id: string) => [VOICE_OUT(id), VOICE_OUT_LEGACY(id)];
export const voiceScriptDir = (id: string) => path.join(projectDir(id), "voice-script");
export const mp4Path = (id: string) => path.join(projectDir(id), "render", `${id}.mp4`);
export const transcriptPath = (day: string, id: string) => path.join(REPO, "transcripts", day, `${id}.txt`);
/** tools/qa-manifest.mjs writes it next to the MP4, which is where the QA platform expects it. */
export const qaManifestPath = (id: string) => path.join(projectDir(id), "render", "manifest.json");
export const chaptersPath = (day: string, id: string) => path.join(REPO, "chapters", day, `${id}-chương.txt`);

export function assertId(id: string) {
  if (!ID_RE.test(id)) throw new HttpError(400, "Mã video chỉ gồm chữ thường, số và dấu gạch ngang.");
}

/** Resolve `rel` inside `root`; anything that escapes the root is refused. */
export function safeJoin(root: string, rel: string) {
  const target = path.resolve(root, rel);
  if (target !== root && !target.startsWith(root + path.sep)) throw new HttpError(403, "Đường dẫn không hợp lệ.");
  return target;
}

export const rel = (p: string) => path.relative(REPO, p).split(path.sep).join("/");
export const exists = (p: string) => fs.existsSync(p);

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
