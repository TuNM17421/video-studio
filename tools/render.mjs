#!/usr/bin/env node
/**
 * Render a design-system video (or scene) to MP4: headless Chrome paints every frame at 1920×1080,
 * ffmpeg (libx264 + AAC) muxes the frames with the narration master.
 *
 *   node tools/render.mjs --scene n2-00-gioi-thieu-ngay-2 --out video.mp4 [--audio voice.wav]
 *        [--workers 4] [--from 0] [--to N] [--crf 18] [--base http://127.0.0.1:8765] [--keep-frames dir]
 *
 * Needs the design-system folder served over HTTP (fonts do not load from file://):
 *   python3 -m http.server 8765 --directory vinuni-lesson-video-ds
 * ffmpeg: $FFMPEG, else the Remotion compositor build in ~/Coding/Video-studio/node_modules (read-only).
 * The audio must last exactly as long as the video (voice.cues.json frames); a mismatch is an error.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, waitReady } from './cdp.mjs';

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
const compositor = path.resolve(HERE, '../../Coding/Video-studio/node_modules/@remotion/compositor-linux-x64-gnu');
const FFMPEG = process.env.FFMPEG || path.join(compositor, 'ffmpeg');
const ffEnv = { ...process.env, LD_LIBRARY_PATH: [path.dirname(FFMPEG), process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') };
if (!fs.existsSync(FFMPEG)) fail(`ffmpeg not found at ${FFMPEG} (set FFMPEG=/path/to/ffmpeg)`);

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
const ff = [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-framerate', String(FPS), '-i', path.join(framesDir, 'f%06d.png'),
  ...(args.audio ? ['-i', path.resolve(args.audio)] : []),
  '-map', '0:v',
  ...(args.audio ? ['-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000'] : []),
  '-c:v', 'libx264', '-preset', 'medium', '-crf', String(args.crf || 18), '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-movflags', '+faststart',
  ...(args.audio ? ['-shortest'] : []),
  out,
];
const enc = spawnSync(FFMPEG, ff, { env: ffEnv, stdio: 'inherit' });
if (enc.status !== 0) fail(`ffmpeg exited with ${enc.status}`);
if (!args['keep-frames']) fs.rmSync(framesDir, { recursive: true, force: true });
console.log(`✓ ${out} · ${(fs.statSync(out).size / 1e6).toFixed(1)} MB`);
