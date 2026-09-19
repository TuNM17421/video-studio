/**
 * The music catalog (music.json at the repo root): the background beds a video can run under, and the
 * quiz cues that play only over question segments. One committed file so a track is chosen by id in the
 * studio and on the command line.
 *
 * The audio itself never enters git — it lives on the same public R2 bucket as the other heavy media
 * (media/manifest.json holds the base URL and every key). ffmpeg needs a real file, so `trackFile` caches
 * a track into assets/music/ on first use and reuses it afterwards.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CATALOG = path.join(REPO, 'music.json');
const MANIFEST = path.join(REPO, 'media/manifest.json');
export const CACHE_DIR = path.join(REPO, 'assets/music');

/** Chosen when a video asks for no music at all — never a track id. */
export const NO_MUSIC = 'none';

/**
 * Where each bed should sit under the narration, in LUFS. The tracks are mastered 15 dB apart, so a
 * fixed gain buries one and blares the next; every track carries its measured `lufs` and the render
 * derives the factor from it. −32 reproduces the level of the first QA'd render (bg.mp3 at 0.15),
 * and quiz music sits louder because the narration is usually silent while a question hangs.
 */
const BED_TARGET_LUFS = -32;
const QUIZ_TARGET_LUFS = -28;

/**
 * Gain factor that puts a track at its target level; 1 when the track was never measured.
 *
 * `db` shifts that target for one render — a negative value is a quieter bed. It exists because how loud
 * music should sit under narration is a judgement about a particular video (a talky one wants it further
 * back), not a property of the track, which is what the catalog already measures.
 */
export function trackGain(id, kind = 'background', db = 0) {
  const track = findTrack(id);
  if (!track || typeof track.lufs !== 'number') return 1;
  const target = (kind === 'quiz' ? QUIZ_TARGET_LUFS : BED_TARGET_LUFS) + (Number(db) || 0);
  return Number((10 ** ((target - track.lufs) / 20)).toFixed(3));
}

export function readMusic() {
  if (!fs.existsSync(CATALOG)) return { background: [], quiz: [] };
  const raw = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  return { background: raw.background || [], quiz: raw.quiz || [] };
}

export const backgroundTracks = () => readMusic().background;
export const quizTracks = () => readMusic().quiz;

/** The background bed a render uses when none is named: the track marked `"default": true` in music.json. */
export const defaultBackground = () => backgroundTracks().find((t) => t.default === true)?.id ?? null;

/** A track by id, from either list — the two namespaces never collide. */
export function findTrack(id) {
  if (!id || id === NO_MUSIC) return null;
  const { background, quiz } = readMusic();
  return [...background, ...quiz].find((t) => t.id === id) || null;
}

function mediaUrl(key) {
  if (!fs.existsSync(MANIFEST)) return null;
  const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const base = (process.env.MEDIA_BASE || m.base || '').replace(/\/+$/, '');
  if (!base || !m.assets?.[key]) return null;
  return `${base}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

/** The public URL of a track, for an <audio> preview in the browser. */
export function trackUrl(id) {
  const track = findTrack(id);
  return track ? mediaUrl(track.media) : null;
}

/**
 * Local path of a track's audio, downloading it once into assets/music/ if this machine has not used it
 * before. Returns null when the track is unknown or the bucket cannot be reached — the caller renders
 * without music rather than handing ffmpeg a path that is not there.
 */
export async function trackFile(id, log = () => {}) {
  const track = findTrack(id);
  if (!track) return null;
  const file = path.join(CACHE_DIR, `${track.id}${path.extname(track.media) || '.mp3'}`);
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return file;
  const url = mediaUrl(track.media);
  if (!url) {
    log(`Không có ${track.media} trong media/manifest.json — bỏ qua nhạc "${track.name}".`);
    return null;
  }
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const tmp = `${file}.part`;
  try {
    log(`Tải nhạc "${track.name}" từ kho về ${path.relative(REPO, file)}…`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
    fs.renameSync(tmp, file);
    return file;
  } catch (error) {
    fs.rmSync(tmp, { force: true });
    log(`Không tải được nhạc "${track.name}": ${error instanceof Error ? error.message : error}`);
    return null;
  }
}
