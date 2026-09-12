#!/usr/bin/env node
/**
 * Render a design-system video (or scene) to MP4: headless Chrome paints every frame at 1920×1080,
 * ffmpeg (libx264 + AAC) muxes the frames with the narration master.
 *
 *   node tools/render.mjs --scene n2-00-gioi-thieu-ngay-2 --out video.mp4 [--audio voice.wav]
 *        [--music-track bg-02] [--quiz-track quiz-timer] [--workers 4] [--from 0] [--to N] [--crf 18]
 *        [--base http://127.0.0.1:8765] [--keep-frames dir]
 *
 * --music-track names a bed from music.json: the audio is fetched from the media bucket into
 * assets/music/ once, and the catalog's measured loudness sets the gain (the masters differ by 15 dB,
 * so a fixed one would bury one track and blare the next). It loops under --audio and is trimmed to
 * the voice's length — any track length works, the video's duration always wins.
 * --quiz-track plays only over the cues marked `quiz: true` in the scene's cues.js, and the background
 * bed drops to silence there so the question stands alone. Both sides cross-fade.
 * --music / --quiz-music take a file path instead, with --music-gain / --quiz-gain and --quiz-at.
 *
 * Needs the design-system folder served over HTTP (fonts do not load from file://):
 *   python3 -m http.server 8765 --directory vinuni-lesson-video-ds
 * ffmpeg: $FFMPEG, else ffmpeg-static from `npm install`, else `ffmpeg` on PATH.
 * The audio must last exactly as long as the video (voice.cues.json frames); a mismatch is an error.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch, waitReady } from './cdp.mjs';
import { NO_MUSIC, trackFile, trackGain } from './lib/music.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const next = argv[i + 1];
  if (next === undefined || next.startsWith('--')) args[argv[i].slice(2)] = true;
  else args[argv[i].slice(2)] = argv[++i];
}
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};
if (!args.scene || !args.out) fail('usage: node tools/render.mjs --scene <id> --out <file.mp4> [--audio voice.wav] [--workers 4]');

// ── ffmpeg ────────────────────────────────────────────────────────────────────
const require = createRequire(import.meta.url);
function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try {
    const bin = require('ffmpeg-static');
    if (bin && fs.existsSync(bin)) return bin;
  } catch {}
  return 'ffmpeg';
}
const FFMPEG = findFfmpeg();
const ffEnv = process.env;
if (spawnSync(FFMPEG, ['-version'], { stdio: 'ignore' }).status !== 0) {
  fail(`ffmpeg not found (${FFMPEG}) — run \`npm install\` at the repo root or set FFMPEG=/path/to/ffmpeg`);
}

function wavSeconds(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') fail(`${file} is not a WAV file`);
  let off = 12;
  let rate = 0;
  let blockAlign = 0;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === 'fmt ') {
      rate = b.readUInt32LE(off + 12);
      blockAlign = b.readUInt16LE(off + 20);
    }
    if (id === 'data') return size / blockAlign / rate;
    off += 8 + size + (size % 2);
  }
  fail(`${file} has no data chunk`);
}

// ── music ─────────────────────────────────────────────────────────────────────
// Resolved before a single frame is painted: a missing track or a dead bucket must not surface after
// twenty minutes of rendering.
const QUIZ_FADE = 0.5; // seconds each side, so neither bed starts or stops with a click

/** "10.5-28.3,95-120" → [[10.5, 28.3], [95, 120]]; anything malformed is a render-stopping mistake. */
function parseWindows(value) {
  if (typeof value !== 'string' || !value.trim()) return [];
  return value.split(',').map((part) => {
    const [a, b] = part.split('-').map(Number);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) fail(`--quiz-at: "${part}" is not a start-end pair in seconds`);
    return [a, b];
  });
}

/**
 * Where the quiz beds belong, read from the scene's own cues: a run of consecutive `quiz: true` cues is
 * one question, and its window is that run's frames. Marking it in cues.js is what lets the choice be
 * made while the script is written, rather than guessed at render time.
 */
async function quizWindowsFromCues(scene) {
  const file = path.join(HERE, '..', 'vinuni-lesson-video-ds/ui_kits/lesson-video/videos', scene, 'cues.js');
  if (!fs.existsSync(file)) return [];
  const { CUES = [] } = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  const runs = [];
  for (const c of CUES) {
    if (!c.quiz) continue;
    const last = runs[runs.length - 1];
    if (last && last[1] === c.start) last[1] = c.end;
    else runs.push([c.start, c.end]);
  }
  return runs.map(([a, b]) => [a / FPS, b / FPS]);
}

// A --music/--quiz-music path is taken as given; a track id is looked up in music.json, which also says
// how loud that particular master needs to be.
const bed = args.music
  ? { file: path.resolve(args.music), gain: Number(args['music-gain']) || 0.15 }
  : args['music-track'] && args['music-track'] !== NO_MUSIC
    ? { file: await trackFile(args['music-track'], (m) => console.log(`  ${m}`)), gain: trackGain(args['music-track'], 'background') }
    : { file: null, gain: 0 };
const quiz = args['quiz-music']
  ? { file: path.resolve(args['quiz-music']), gain: Number(args['quiz-gain']) || 0.18 }
  : args['quiz-track'] && args['quiz-track'] !== NO_MUSIC
    ? { file: await trackFile(args['quiz-track'], (m) => console.log(`  ${m}`)), gain: trackGain(args['quiz-track'], 'quiz') }
    : { file: null, gain: 0 };
const windows = args['quiz-at'] ? parseWindows(args['quiz-at']) : quiz.file ? await quizWindowsFromCues(args.scene) : [];
const hasQuiz = Boolean(quiz.file) && windows.length > 0;
if (quiz.file && !windows.length) console.warn('⚠ Bỏ qua nhạc quiz: cues.js không có câu nào đánh dấu `quiz: true`.');
if (hasQuiz) console.log(`♪ nhạc quiz trên ${windows.length} đoạn: ${windows.map(([a, c]) => `${a.toFixed(1)}–${c.toFixed(1)}s`).join(', ')}`);

// ── capture ───────────────────────────────────────────────────────────────────
const base = String(args.base || 'http://127.0.0.1:8765').replace(/\/$/, '');
const url = `${base}/ui_kits/lesson-video/index.html?scene=${encodeURIComponent(args.scene)}&frame=0`;
const workers = Math.max(1, Number(args.workers || Math.min(6, Math.max(2, os.cpus().length - 2))));
const framesDir = path.resolve(args['keep-frames'] || fs.mkdtempSync(path.join(os.tmpdir(), 'vk-render-')));
fs.mkdirSync(framesDir, { recursive: true });

const b = await launch();
const probe = await b.page();
await probe('Page.navigate', { url });
if (!(await waitReady(probe, 'typeof window.vkSetFrame === "function"'))) fail(`page not ready: ${url}`);
const duration = (await probe('Runtime.evaluate', { expression: 'window.vkDuration', returnByValue: true })).result.value;
const from = Number(args.from || 0);
const to = Math.min(duration, Number(args.to || duration));
const total = to - from;
console.log(`▶ ${args.scene} · ${duration} f (${(duration / FPS).toFixed(2)} s) · rendering ${from}–${to - 1} with ${workers} tabs → ${framesDir}`);

if (args.audio) {
  const secs = wavSeconds(path.resolve(args.audio));
  const frames = Math.round(secs * FPS);
  if (from === 0 && to === duration && Math.abs(frames - duration) > 1) {
    fail(`audio lasts ${secs.toFixed(3)} s = ${frames} f but the video is ${duration} f — retime the video to the voice first`);
  }
}

let done = 0;
const t0 = Date.now();
const errors = [];
async function work(s, frames) {
  for (const f of frames) {
    await s('Runtime.evaluate', { expression: `window.vkSetFrame(${f})`, awaitPromise: true });
    const shot = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(framesDir, `f${String(f - from).padStart(6, '0')}.png`), Buffer.from(shot.data, 'base64'));
    done++;
    if (done % 150 === 0 || done === total) {
      const el = (Date.now() - t0) / 1000;
      process.stdout.write(`  ${done}/${total} frames · ${el.toFixed(0)} s · ~${((el / done) * (total - done)).toFixed(0)} s left\n`);
    }
  }
}
const tabs = [probe];
for (let i = 1; i < workers; i++) {
  const s = await b.page();
  await s('Page.navigate', { url });
  if (!(await waitReady(s, 'typeof window.vkSetFrame === "function"'))) fail('capture tab not ready');
  tabs.push(s);
}
b.listeners.add((msg) => {
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
});
const chunk = Math.ceil(total / workers);
await Promise.all(
  tabs.map((s, i) => {
    const frames = [];
    for (let f = from + i * chunk; f < Math.min(to, from + (i + 1) * chunk); f++) frames.push(f);
    return work(s, frames);
  }),
);
await b.close();
if (errors.length) fail(`page threw during capture: ${errors[0]}`);
console.log(`✓ ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// ── encode ────────────────────────────────────────────────────────────────────
const out = path.resolve(args.out);
fs.mkdirSync(path.dirname(out), { recursive: true });
const hasAudio = Boolean(args.audio);
const hasMusic = Boolean(bed.file);
const BED_VOLUME = bed.gain;
const QUIZ_VOLUME = quiz.gain;

/**
 * How "inside a quiz window" the soundtrack is at time t: 0 outside, 1 inside, a linear ramp across
 * QUIZ_FADE at each edge. ffmpeg evaluates this per audio frame (eval=frame).
 */
function quizRamp(windows) {
  const trapezoid = ([a, b]) => `min(1\\,max(0\\,min((t-${(a - QUIZ_FADE).toFixed(3)})/${QUIZ_FADE}\\,(${(b + QUIZ_FADE).toFixed(3)}-t)/${QUIZ_FADE})))`;
  return windows.length === 1 ? trapezoid(windows[0]) : `min(1\\,${windows.map(trapezoid).join('+')})`;
}

function audioFilter() {
  const ramp = hasQuiz ? quizRamp(windows) : null;
  const chains = [];
  const mix = ['[1:a]'];
  if (hasMusic) {
    // the bed ducks all the way out under a quiz so the question and its timer stand alone
    chains.push(`[2:a]volume=volume='${BED_VOLUME}${hasQuiz ? `*(1-${ramp})` : ''}':eval=frame[bed]`);
    mix.push('[bed]');
  }
  if (hasQuiz) {
    chains.push(`[${hasMusic ? 3 : 2}:a]volume=volume='${QUIZ_VOLUME}*${ramp}':eval=frame[quiz]`);
    mix.push('[quiz]');
  }
  // normalize=0 is required: amix otherwise divides every input by their count, quietening the
  // narration by 6 dB the moment music is added.
  chains.push(`${mix.join('')}amix=inputs=${mix.length}:duration=first:dropout_transition=0:normalize=0[aout]`);
  return chains.join(';');
}

const ff = [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-framerate', String(FPS), '-i', path.join(framesDir, 'f%06d.png'),
  ...(hasAudio ? ['-i', path.resolve(args.audio)] : []),
  // looped indefinitely — amix's duration=first (below) trims it to the voice track, whatever its own length is
  ...(hasMusic ? ['-stream_loop', '-1', '-i', bed.file] : []),
  ...(hasQuiz ? ['-stream_loop', '-1', '-i', quiz.file] : []),
  '-map', '0:v',
  ...(hasAudio && (hasMusic || hasQuiz)
    ? ['-filter_complex', audioFilter(), '-map', '[aout]']
    : hasAudio || hasMusic ? ['-map', '1:a']
    : []),
  ...(hasAudio || hasMusic ? ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000'] : []),
  '-c:v', 'libx264', '-preset', 'medium', '-crf', String(args.crf || 18), '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-movflags', '+faststart',
  ...(hasAudio || hasMusic ? ['-shortest'] : []),
  out,
];
const enc = spawnSync(FFMPEG, ff, { env: ffEnv, stdio: 'inherit' });
if (enc.status !== 0) fail(`ffmpeg exited with ${enc.status}`);
if (!args['keep-frames']) fs.rmSync(framesDir, { recursive: true, force: true });
console.log(`✓ ${out} · ${(fs.statSync(out).size / 1e6).toFixed(1)} MB`);
