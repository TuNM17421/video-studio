import fs from "node:fs";
import path from "node:path";

/** The studio runs from <repo>/studio (npm run dev), so the repo is one level up. */
export const REPO = path.resolve(process.cwd(), "..");
export const DS = path.join(REPO, "vinuni-lesson-video-ds");
export const STYLES = path.join(REPO, "styles");
export const ID_RE = /^[a-z0-9][a-z0-9-]{1,60}$/;
export const DAY_RE = /^Day\d{2}$/;

export const videoDir = (id: string) => path.join(DS, "ui_kits/lesson-video/videos", id);
export const projectDir = (id: string) => path.join(REPO, "projects", id);
export const stateDir = (id: string) => path.join(projectDir(id), ".studio");
export const voiceOut = (id: string) => path.join(REPO, "tts-elevenlabs/out", id);
export const mp4Path = (id: string) => path.join(projectDir(id), "render", `${id}.mp4`);
export const transcriptPath = (day: string, id: string) => path.join(REPO, "transcripts", day, `${id}.txt`);
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
