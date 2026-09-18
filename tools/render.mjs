#!/usr/bin/env node
/**
 * Render a design-system video (or scene) to MP4: headless Chrome paints every frame at 1920×1080,
 * ffmpeg (libx264 + AAC) muxes the frames with the narration master.
 *
 *   node tools/render.mjs --scene n2-00-gioi-thieu-ngay-2 --out video.mp4 [--audio voice.wav]
 *        [--music-track bg-02] [--quiz-track quiz-timer] [--workers 4] [--from 0] [--to N] [--crf 18]
 *        [--base http://127.0.0.1:8765] [--keep-frames dir] [--frame-timeout 15000]
 *        [--music-db -3] [--quiz-db -2] [--no-captions] [--loudness -16] [--no-loudnorm]
 *
 * --no-captions leaves the navy subtitle bar out of every frame (the player's ?captions=0); the
 * captions are still in cues.js and in the transcript.
 *
 * --music-db / --quiz-db nudge a catalog track's target level for this render only (negative = quieter);
 * how far under the narration music belongs is a call about one video, not a property of the track.
 *
 * The capture tabs share one queue and every frame is capped at --frame-timeout ms: a tab that stops
 * answering is replaced and its frame is shot elsewhere, instead of the run hanging on it forever.
 * --keep-frames both keeps the frames and reuses the ones already in that directory, so a run that
 * failed part-way is finished by repeating the same command — only the missing frames are painted.
 *
 * --music-track names a bed from music.json: the audio is fetched from the media bucket into
 * assets/music/ once, and the catalog's measured loudness sets the gain (the masters differ by 15 dB,
 * so a fixed one would bury one track and blare the next). It loops under --audio and is trimmed to
 * the voice's length — any track length works, the video's duration always wins.
 * --quiz-track plays only over the silent cues marked `quiz: true` in the scene's cues.js — the pause
 * where the viewer thinks — and the background bed drops to silence there so the question stands alone.
 * A spoken cue carrying the flag is left out with a warning: the bed must never cover the narration.
 * Both sides cross-fade.
 * --music / --quiz-music take a file path instead, with --music-gain / --quiz-gain and --quiz-at.
 *
 * --loudness / --no-loudnorm: the finished mix is brought to −16 LUFS integrated, measured on the stereo
 * master the way the platforms measure it. The ElevenLabs voice sits around −21 LUFS, 3–5 dB under most
 * other videos, and no platform turns a quiet upload up — they only turn loud ones down. The gain is
 * linear, so the beds keep the distance under the voice that music.json set, followed by a look-ahead
 * limiter at −2 dBFS because the voice already peaks near 0 dBFS and +5 dB would clip. (ffmpeg's loudnorm
 * is deliberately not used: with too little true-peak room its "linear" mode falls back to dynamic
 * compression without saying so.) −16 is a level for speech, so only a render with --audio is brought
 * to it: a bed on its own keeps the level music.json gave it. A near-silent mix — the studio's mock
 * voice — is left alone with a warning; --no-loudnorm skips the step.
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
 * Where the quiz beds belong, read from the scene's own cues: a run of consecutive silent `quiz: true`
 * cues is one thinking pause, and its window is that run's frames. Marking it in cues.js is what lets
 * the choice be made while the script is written, rather than guessed at render time. A spoken cue
 * carrying the flag (the question being read, the answer) is dropped rather than warned about and kept:
 * a bed over the voice is the one thing the flag must never produce. Runs merge by adjacency, so a
 * dropped cue in the middle simply splits them.
 */
async function quizWindowsFromCues(scene) {
  const file = path.join(HERE, '..', 'vinuni-lesson-video-ds/ui_kits/lesson-video/videos', scene, 'cues.js');
  if (!fs.existsSync(file)) return [];
  const { CUES = [] } = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  const runs = [];
  const spoken = [];
  for (const c of CUES) {
    if (!c.quiz) continue;
    if (!c.silent && String(c.text || '').trim()) {
      spoken.push(c.n);
      continue;
    }
    const last = runs[runs.length - 1];
    if (last && last[1] === c.start) last[1] = c.end;
    else runs.push([c.start, c.end]);
  }
  if (spoken.length) {
    console.warn(`⚠ Câu ${spoken.join(', ')} có lời đọc nhưng đánh dấu \`quiz: true\` — bị bỏ qua: nhạc quiz chỉ phủ khoảng chờ im lặng.`);
    console.warn('  Xem mục "Nhạc nền và nhạc quiz" trong CLAUDE.md.');
  }
  return runs.map(([a, b]) => [a / FPS, b / FPS]);
}

// A --music/--quiz-music path is taken as given; a track id is looked up in music.json, which also says
// how loud that particular master needs to be.
const bed = args.music
  ? { file: path.resolve(args.music), gain: Number(args['music-gain']) || 0.15 }
  : args['music-track'] && args['music-track'] !== NO_MUSIC
    ? { file: await trackFile(args['music-track'], (m) => console.log(`  ${m}`)), gain: trackGain(args['music-track'], 'background', args['music-db']) }
    : { file: null, gain: 0 };
const quiz = args['quiz-music']
  ? { file: path.resolve(args['quiz-music']), gain: Number(args['quiz-gain']) || 0.18 }
  : args['quiz-track'] && args['quiz-track'] !== NO_MUSIC
    ? { file: await trackFile(args['quiz-track'], (m) => console.log(`  ${m}`)), gain: trackGain(args['quiz-track'], 'quiz', args['quiz-db']) }
    : { file: null, gain: 0 };
const windows = args['quiz-at'] ? parseWindows(args['quiz-at']) : quiz.file ? await quizWindowsFromCues(args.scene) : [];
const hasQuiz = Boolean(quiz.file) && windows.length > 0;
if (quiz.file && !windows.length) console.warn('⚠ Bỏ qua nhạc quiz: cues.js không có khoảng chờ im lặng nào đánh dấu `quiz: true`.');
if (hasQuiz) console.log(`♪ nhạc quiz trên ${windows.length} đoạn: ${windows.map(([a, c]) => `${a.toFixed(1)}–${c.toFixed(1)}s`).join(', ')}`);

// ── loudness ──────────────────────────────────────────────────────────────────
// Checked before a frame is painted, like the music: a bad flag must not surface after the capture.
const TARGET_LUFS = args.loudness === undefined ? -16 : Number(args.loudness);
if (!Number.isFinite(TARGET_LUFS) || TARGET_LUFS > -6 || TARGET_LUFS < -36) fail('--loudness: cần một mức LUFS trong khoảng −36…−6, ví dụ --loudness -16');
const LIMIT_DB = -2; // the limiter's sample-peak ceiling: AAC adds up to ~1 dB of inter-sample overshoot and the platforms want ≤ −1 dBTP

// ── capture ───────────────────────────────────────────────────────────────────
const base = String(args.base || 'http://127.0.0.1:8765').replace(/\/$/, '');
const url = `${base}/ui_kits/lesson-video/index.html?scene=${encodeURIComponent(args.scene)}&frame=0${args['no-captions'] ? '&captions=0' : ''}`;
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
console.log(`▶ ${args.scene} · ${duration} f (${(duration / FPS).toFixed(2)} s) · rendering ${from}–${to - 1} with ${workers} tabs → ${framesDir}`);

if (args.audio) {
  const secs = wavSeconds(path.resolve(args.audio));
  const frames = Math.round(secs * FPS);
  if (from === 0 && to === duration && Math.abs(frames - duration) > 1) {
    fail(`audio lasts ${secs.toFixed(3)} s = ${frames} f but the video is ${duration} f — retime the video to the voice first`);
  }
}

const frameFile = (f) => path.join(framesDir, `f${String(f - from).padStart(6, '0')}.png`);
const alreadyShot = (f) => {
  try {
    return fs.statSync(frameFile(f)).size > 0;
  } catch {
    return false;
  }
};

/**
 * One shared queue rather than a fixed slice per tab: a tab that stalls simply stops taking work and
 * the others drain what is left, instead of the whole run waiting on its slice. With --keep-frames the
 * frames already on disk are skipped, so a re-run after a failure costs only what is missing.
 */
const queue = [];
let reused = 0;
for (let f = from; f < to; f++) {
  if (args['keep-frames'] && alreadyShot(f)) reused++;
  else queue.push(f);
}
const total = queue.length;
if (reused) console.log(`  ${reused} frame đã có sẵn trong ${framesDir} — chỉ chụp ${total} frame còn thiếu`);
if (!total) console.log('  không còn frame nào phải chụp');

// A frame is a screenshot of a page that is already painted: seconds, not minutes. The cap is what turns
// a tab that died quietly into a retry somewhere else instead of a run that never ends.
const FRAME_TIMEOUT = Math.max(1000, Number(args['frame-timeout'] || 15000));
const MAX_ATTEMPTS = 3;

let done = 0;
const t0 = Date.now();
const errors = [];
const attempts = new Map();

const newTab = async () => {
  const s = await b.page();
  await s('Page.navigate', { url });
  if (!(await waitReady(s, 'typeof window.vkSetFrame === "function"'))) fail('capture tab not ready');
  return s;
};
const dropTab = async (s) => {
  // Free the wedged renderer; it may not answer either, so never wait long on it.
  try {
    await b.send('Target.closeTarget', { targetId: s.targetId }, undefined, 5000);
  } catch {
    /* the tab is beyond talking to — Browser.close at the end reaps it */
  }
};

async function work(seat, first) {
  let s = first;
  let strikes = 0;
  while (queue.length) {
    const f = queue.shift();
    try {
      await s('Runtime.evaluate', { expression: `window.vkSetFrame(${f})`, awaitPromise: true }, { timeout: FRAME_TIMEOUT });
      const shot = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, { timeout: FRAME_TIMEOUT });
      fs.writeFileSync(frameFile(f), Buffer.from(shot.data, 'base64'));
      strikes = 0;
      done++;
      if (done % 150 === 0 || done === total) {
        const el = (Date.now() - t0) / 1000;
        process.stdout.write(`  ${done}/${total} frames · ${el.toFixed(0)} s · ~${((el / done) * (total - done)).toFixed(0)} s left\n`);
      }
    } catch (error) {
      const tries = (attempts.get(f) || 0) + 1;
      attempts.set(f, tries);
      const why = error instanceof Error ? error.message : String(error);
      if (tries >= MAX_ATTEMPTS) throw new Error(`frame ${f} hỏng sau ${tries} lần thử: ${why}`);
      queue.push(f); // back of the queue: a fresh tab will get to it
      strikes++;
      console.warn(`  ⚠ tab ${seat} nghẹn ở frame ${f} (${why}) — chụp lại ở tab khác`);
      if (strikes >= 2) {
        console.warn(`  ↻ tab ${seat} thay bằng tab mới`);
        await dropTab(s);
        s = await newTab();
        strikes = 0;
      }
    }
  }
}

const tabs = [probe];
for (let i = 1; i < Math.min(workers, Math.max(1, total)); i++) tabs.push(await newTab());
b.listeners.add((msg) => {
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
});
try {
  await Promise.all(tabs.map((s, i) => work(i + 1, s)));
} catch (error) {
  // --keep-frames means the frames captured so far survive, and the next run resumes from them.
  await b.close();
  fail(`${error instanceof Error ? error.message : error}${args['keep-frames'] ? `\n  (frame đã chụp vẫn nằm ở ${framesDir} — chạy lại với --keep-frames để chụp nốt)` : ''}`);
}
await b.close();
if (errors.length) fail(`page threw during capture: ${errors[0]}`);
const missing = [];
for (let f = from; f < to; f++) if (!alreadyShot(f)) missing.push(f);
if (missing.length) fail(`thiếu ${missing.length} frame (từ ${missing[0]}) sau khi chụp xong — không mã hoá bản thiếu frame`);
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

/**
 * The soundtrack as one filter graph over the audio inputs — narration first, then the beds — with every
 * input forced to 48 kHz stereo before amix. Left to negotiate, amix folds the stereo beds down to the
 * mono voice (d1 shipped mono under a stereo bed): the master's layout must not depend on which inputs
 * happen to exist, least of all now that its loudness is measured on it.
 */
function audioFilter() {
  const stereo = 'aformat=sample_rates=48000:channel_layouts=stereo';
  if (!hasAudio || !(hasMusic || hasQuiz)) return `[0:a]${stereo}[aout]`;
  const ramp = hasQuiz ? quizRamp(windows) : null;
  const chains = [`[0:a]${stereo}[voice]`];
  const mix = ['[voice]'];
  if (hasMusic) {
    // the bed ducks all the way out under a quiz so the question and its timer stand alone
    chains.push(`[1:a]${stereo},volume=volume='${BED_VOLUME}${hasQuiz ? `*(1-${ramp})` : ''}':eval=frame[bed]`);
    mix.push('[bed]');
  }
  if (hasQuiz) {
    chains.push(`[${hasMusic ? 2 : 1}:a]${stereo},volume=volume='${QUIZ_VOLUME}*${ramp}':eval=frame[quiz]`);
    mix.push('[quiz]');
  }
  // normalize=0 is required: amix otherwise divides every input by their count, quietening the
  // narration by 6 dB the moment music is added.
  chains.push(`${mix.join('')}amix=inputs=${mix.length}:duration=first:dropout_transition=0:normalize=0[aout]`);
  return chains.join(';');
}

/**
 * Integrated loudness (LUFS) and true peak (dBTP) of a file's audio, from loudnorm's measurement pass —
 * the one machine-readable loudness report ffmpeg has. Digital silence reads "-inf", which Number()
 * turns into NaN, so the caller checks for a finite value.
 */
function measureLoudness(file) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { env: ffEnv, encoding: 'utf8' });
  const json = /\{[^{}]*"input_i"[^{}]*\}/.exec(r.stderr || '');
  if (r.status !== 0 || !json) fail(`không đo được âm lượng của ${file}`);
  const stats = JSON.parse(json[0]);
  return { lufs: Number(stats.input_i), peak: Number(stats.input_tp) };
}
const lu = (x) => x.toFixed(1).replace('-', '−');

// The mix is rendered to a float WAV first so its loudness can be measured before the one and only video
// encode, which then takes the WAV plus the gain. Float keeps whatever the sum of voice and beds overshoots
// for the limiter, instead of clipping it in a 16-bit file. -t bounds it to the video: a bed alone would
// otherwise loop forever, and the voice may be longer than a --from/--to slice.
const mixWav = path.join(framesDir, 'mix.wav');
let before = null;
let gainFilter = null;
if (hasAudio || hasMusic) {
  const mix = spawnSync(FFMPEG, [
    '-hide_banner', '-loglevel', 'error', '-y',
    ...(hasAudio ? ['-i', path.resolve(args.audio)] : []),
    // looped indefinitely — amix's duration=first trims it to the voice track, whatever its own length is
    ...(hasMusic ? ['-stream_loop', '-1', '-i', bed.file] : []),
    ...(hasQuiz ? ['-stream_loop', '-1', '-i', quiz.file] : []),
    '-filter_complex', audioFilter(), '-map', '[aout]',
    '-t', ((to - from) / FPS).toFixed(3), '-c:a', 'pcm_f32le', mixWav,
  ], { env: ffEnv, stdio: 'inherit' });
  if (mix.status !== 0) fail(`ffmpeg exited with ${mix.status} while mixing the audio`);
  if (hasAudio && !args['no-loudnorm']) {
    before = measureLoudness(mixWav);
    if (!Number.isFinite(before.lufs) || before.lufs < -50) {
      console.warn('⚠ âm thanh gần như im lặng, bỏ qua chuẩn hoá âm lượng');
      before = null;
    } else {
      // A look-ahead limiter rather than a clip, because the voice already peaks near −1 dBFS and the gain
      // alone overshoots by several dB. attack=5 ms is the look-ahead: the gain is down before the peak
      // arrives, so nothing passes the ceiling. release=80 ms is longer than a vowel's pitch period, so the
      // limiter rides syllables instead of reshaping the waveform (audible as distortion), yet recovers
      // between words. level=false keeps the ceiling at `limit` — the default rescales the output back up
      // to 0 dBFS. latency=true removes the look-ahead delay so the audio stays on its frame.
      const gain = TARGET_LUFS - before.lufs;
      const limit = (10 ** (LIMIT_DB / 20)).toFixed(4);
      gainFilter = `volume=${gain.toFixed(2)}dB,alimiter=limit=${limit}:attack=5:release=80:level=false:latency=true`;
    }
  }
}

const ff = [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-framerate', String(FPS), '-i', path.join(framesDir, 'f%06d.png'),
  ...(hasAudio || hasMusic ? ['-i', mixWav] : []),
  '-map', '0:v',
  ...(hasAudio || hasMusic ? ['-map', '1:a', ...(gainFilter ? ['-af', gainFilter] : []), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000'] : []),
  '-c:v', 'libx264', '-preset', 'medium', '-crf', String(args.crf || 18), '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-movflags', '+faststart',
  ...(hasAudio || hasMusic ? ['-shortest'] : []),
  out,
];
const enc = spawnSync(FFMPEG, ff, { env: ffEnv, stdio: 'inherit' });
if (enc.status !== 0) fail(`ffmpeg exited with ${enc.status}`);
fs.rmSync(mixWav, { force: true });
if (!args['keep-frames']) fs.rmSync(framesDir, { recursive: true, force: true });
if (before) {
  const after = measureLoudness(out);
  console.log(`♪ âm lượng ${lu(before.lufs)} → ${lu(after.lufs)} LUFS · đỉnh ${lu(after.peak)} dBTP`);
  if (Math.abs(after.lufs - TARGET_LUFS) > 1) console.warn(`⚠ âm lượng đo được ${lu(after.lufs)} LUFS lệch mục tiêu ${lu(TARGET_LUFS)} LUFS quá 1 LU`);
  if (after.peak > -1) console.warn(`⚠ đỉnh ${lu(after.peak)} dBTP cao hơn −1 dBTP — nền tảng có thể làm méo khi mã hoá lại`);
}
console.log(`✓ ${out} · ${(fs.statSync(out).size / 1e6).toFixed(1)} MB`);
