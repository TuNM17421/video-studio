#!/usr/bin/env node
/**
 * Render bench for issue #62 — "xem video Duy Luân, đối chiếu với render hiện tại".
 *
 * A throwaway copy of tools/render.mjs's capture loop with the four switches the real pipeline does
 * NOT have, so the four claims from the video can be measured without touching the pipeline:
 *   --scale 2            4K  (deviceScaleFactor, so SVG is re-rastered, not upscaled)
 *   --fps 60 --step 0.5  60 fps (two shots per authored 30 fps frame)
 *   --sink pipe          frames straight into ffmpeg over image2pipe, nothing on disk
 *   --alpha --codec prores4444   transparent background → ProRes 4444 with an alpha channel
 *   --width/--height     another aspect ratio (1080×1920 = 9:16)
 * Everything it prints is a measurement: capture s, encode s, wall s, bytes of PNG, output bytes.
 * Nothing here is meant to graduate into tools/render.mjs as-is — the decisions live in
 * docs/decisions/render-hoc-tu-video-duyluan.md, and whatever is worth keeping gets its own issue.
 *
 *   node tools/lab/render-lab.mjs --scene d2-01-lab --from 0 --to 300 --out /tmp/a.mp4
 *        [--workers 6] [--width 1920] [--height 1080] [--scale 1] [--fps 30] [--step 1]
 *        [--sink disk|pipe] [--codec h264|prores4444|prores422] [--alpha] [--crf 18]
 *        [--css file.css] [--no-captions] [--json report.json] [--keep-frames dir]
 *
 *   node tools/lab/render-lab.mjs --scene d2-01-lab --shots 100,100.25,100.5,101 --out-dir /tmp/shots
 *        prints the sha256 of each shot — that is the sub-frame test: does the player paint anything
 *        between two authored frames, or does it round?
 *
 * Deliberately NOT a copy of render.mjs's resilience: a tab that stops answering ends the run here,
 * where render.mjs retries the frame on another tab (MAX_ATTEMPTS) and replaces the tab. A bench may
 * fail; a render may not. Full-length numbers in the decision doc come from render.mjs itself for that
 * reason — this script only compares settings over a slice.
 *
 * Needs the design system served over HTTP, like render.mjs:
 *   python3 -m http.server 8791 --bind 127.0.0.1 --directory vinuni-lesson-video-ds
 */
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { launch, waitReady } from '../cdp.mjs';

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const next = argv[i + 1];
  if (next === undefined || next.startsWith('--')) args[argv[i].slice(2)] = true;
  else args[argv[i].slice(2)] = argv[++i];
}
const fail = (m) => {
  console.error(`✗ ${m}`);
  process.exit(1);
};
if (!args.scene) fail('usage: node tools/lab/render-lab.mjs --scene <id> [--from 0 --to 300 --out out.mp4 | --shots 100,100.5]');

const require = createRequire(import.meta.url);
const FFMPEG = process.env.FFMPEG || (() => {
  try {
    const b = require('ffmpeg-static');
    if (b && fs.existsSync(b)) return b;
  } catch {}
  return 'ffmpeg';
})();

const base = String(args.base || 'http://127.0.0.1:8791').replace(/\/$/, '');
const width = Number(args.width || 1920);
const height = Number(args.height || 1080);
const scale = Number(args.scale || 1);
const fps = Number(args.fps || 30);
const step = Number(args.step || 1);
const sink = String(args.sink || 'disk');
const codec = String(args.codec || 'h264');
const alpha = Boolean(args.alpha);
const workers = Math.max(1, Number(args.workers || Math.min(6, Math.max(2, os.cpus().length - 2))));
if (!['disk', 'pipe'].includes(sink)) fail('--sink: disk hoặc pipe');
if (!['h264', 'prores4444', 'prores422'].includes(codec)) fail('--codec: h264, prores4444 hoặc prores422');

const url = `${base}/ui_kits/lesson-video/index.html?scene=${encodeURIComponent(args.scene)}&frame=0${args['no-captions'] ? '&captions=0' : ''}`;

// The scene paints its own white canvas (SceneFrame → .vk-scene background: C.bg), the player paints navy
// behind it, and Chrome paints white behind that. All three have to go before a screenshot can carry alpha.
const ALPHA_CSS = `
html.vk-capture, html.vk-capture body, html.vk-capture .vk-player,
html.vk-capture .vk-viewport, html.vk-capture .vk-stage, .vk-scene { background: transparent !important; }
`;
const extraCss = (alpha ? ALPHA_CSS : '') + (args.css ? fs.readFileSync(path.resolve(args.css), 'utf8') : '');

const b = await launch();
/** A capture tab at this viewport/scale, with the lab's CSS injected and the page ready. */
async function newTab() {
  const s = await b.page(width, height);
  if (scale !== 1) await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
  if (alpha) await s('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await s('Page.navigate', { url });
  if (!(await waitReady(s, 'typeof window.vkSetFrame === "function"'))) fail(`page not ready: ${url}`);
  if (extraCss) {
    await s('Runtime.evaluate', {
      expression: `(() => { const el = document.createElement('style'); el.textContent = ${JSON.stringify(extraCss)}; document.head.appendChild(el); })()`,
    });
  }
  return s;
}
const shoot = async (s, f) => {
  await s('Runtime.evaluate', { expression: `window.vkSetFrame(${f})`, awaitPromise: true }, { timeout: 30000 });
  const r = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, { timeout: 30000 });
  return Buffer.from(r.data, 'base64');
};

// ── --shots: the sub-frame test ───────────────────────────────────────────────
if (args.shots) {
  const outDir = path.resolve(args['out-dir'] || '.');
  fs.mkdirSync(outDir, { recursive: true });
  const s = await newTab();
  const rows = [];
  for (const raw of String(args.shots).split(',')) {
    const f = Number(raw);
    if (!Number.isFinite(f)) fail(`--shots: "${raw}" không phải số frame`);
    const png = await shoot(s, f);
    const file = path.join(outDir, `f${String(raw).replace('.', 'p')}.png`);
    fs.writeFileSync(file, png);
    const sha = crypto.createHash('sha256').update(png).digest('hex').slice(0, 16);
    rows.push({ frame: f, sha, bytes: png.length, file });
    console.log(`  frame ${String(raw).padStart(8)} · sha256 ${sha} · ${(png.length / 1024).toFixed(0)} KB · ${file}`);
  }
  const groups = new Map();
  for (const r of rows) groups.set(r.sha, (groups.get(r.sha) || 0) + 1);
  console.log(`\n${rows.length} shot → ${groups.size} ảnh khác nhau`);
  await b.close();
  if (args.json) fs.writeFileSync(path.resolve(args.json), `${JSON.stringify({ shots: rows, distinct: groups.size }, null, 2)}\n`);
  process.exit(0);
}

// ── the frame list ────────────────────────────────────────────────────────────
const probe = await newTab();
const duration = (await probe('Runtime.evaluate', { expression: 'window.vkDuration', returnByValue: true })).result.value;
const realSize = JSON.parse(
  (await probe('Runtime.evaluate', { expression: 'JSON.stringify([window.innerWidth, window.innerHeight])', returnByValue: true })).result.value,
);
const from = Number(args.from || 0);
const to = Math.min(duration, Number(args.to || duration));
if (!args.out) fail('--out <file> (hoặc --shots)');
const out = path.resolve(args.out);
fs.mkdirSync(path.dirname(out), { recursive: true });

// Authored frames are 30 fps; --step 0.5 asks the player for the half-frames in between, which is what a
// 60 fps render would do. The list is the shot order, and index i of the list is output frame i.
const shots = [];
for (let k = 0; from + k * step < to; k++) shots.push(Number((from + k * step).toFixed(4)));
const total = shots.length;
const probeShot = await shoot(probe, shots[0]);
const pngSize = JSON.stringify([probeShot.readUInt32BE(16), probeShot.readUInt32BE(20)]);
console.log(`▶ ${args.scene} · frame ${from}–${to} step ${step} → ${total} shot · viewport ${realSize.join('×')} ×${scale} → PNG ${JSON.parse(pngSize).join('×')}`);
console.log(`  ${workers} tab · sink ${sink} · codec ${codec}${alpha ? ' + alpha' : ''} · ${fps} fps → ${out}`);

// ── ffmpeg ───────────────────────────────────────────────────────────────────
const videoArgs = () => {
  if (codec === 'h264') return ['-c:v', 'libx264', '-preset', 'medium', '-crf', String(args.crf || 18), '-pix_fmt', 'yuv420p'];
  if (codec === 'prores422') return ['-c:v', 'prores_ks', '-profile:v', '3', '-pix_fmt', 'yuv422p10le', '-qscale:v', '9'];
  return ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', alpha ? 'yuva444p10le' : 'yuv444p10le', '-qscale:v', '5', ...(alpha ? ['-alpha_bits', '16'] : [])];
};

const t0 = Date.now();
let captureMs = 0;
let encodeMs = 0;
let pngBytes = 0;
let peakPending = 0;
let peakPendingBytes = 0;

const framesDir = path.resolve(args['keep-frames'] || fs.mkdtempSync(path.join(os.tmpdir(), 'vk-lab-')));
fs.mkdirSync(framesDir, { recursive: true });

/* The pipe sink: one ffmpeg reading PNGs off stdin while the tabs are still shooting. The tabs finish out
 * of order (shared queue), and image2pipe has no frame numbers, so a frame that arrives early waits in
 * memory until its turn. peakPending is how much that costs. */
let ff = null;
let nextToWrite = 0;
const pending = new Map();
const drain = async () => {
  while (pending.has(nextToWrite)) {
    const buf = pending.get(nextToWrite);
    pending.delete(nextToWrite);
    nextToWrite++;
    pngBytes += buf.length;
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
};
if (sink === 'pipe') {
  ff = spawn(FFMPEG, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    ...videoArgs(), '-r', String(fps), ...(codec === 'h264' ? ['-movflags', '+faststart'] : []),
    out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
}

const queue = shots.map((f, i) => [i, f]);
let done = 0;
async function work(s) {
  while (queue.length) {
    const [i, f] = queue.shift();
    const png = await shoot(s, f);
    if (sink === 'pipe') {
      pending.set(i, png);
      peakPending = Math.max(peakPending, pending.size);
      let bytes = 0;
      for (const v of pending.values()) bytes += v.length;
      peakPendingBytes = Math.max(peakPendingBytes, bytes);
      await drain();
    } else {
      fs.writeFileSync(path.join(framesDir, `f${String(i).padStart(6, '0')}.png`), png);
      pngBytes += png.length;
    }
    done++;
    if (done % 100 === 0 || done === total) {
      const el = (Date.now() - t0) / 1000;
      process.stdout.write(`  ${done}/${total} · ${el.toFixed(0)} s · ~${((el / done) * (total - done)).toFixed(0)} s left\n`);
    }
  }
}
const tabs = [probe];
for (let i = 1; i < Math.min(workers, total); i++) tabs.push(await newTab());
try {
  await Promise.all(tabs.map((s) => work(s)));
} catch (error) {
  await b.close();
  if (ff) ff.kill('SIGKILL');
  fail(`capture: ${error instanceof Error ? error.message : error}`);
}
await b.close();
captureMs = Date.now() - t0;

const tEnc = Date.now();
if (sink === 'pipe') {
  ff.stdin.end();
  const code = await new Promise((r) => ff.on('exit', r));
  if (code !== 0) fail(`ffmpeg exited with ${code}`);
} else {
  const r = spawnSync(FFMPEG, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-framerate', String(fps), '-i', path.join(framesDir, 'f%06d.png'),
    ...videoArgs(), '-r', String(fps), ...(codec === 'h264' ? ['-movflags', '+faststart'] : []),
    out,
  ], { stdio: 'inherit' });
  if (r.status !== 0) fail(`ffmpeg exited with ${r.status}`);
}
encodeMs = Date.now() - tEnc;
const wallMs = Date.now() - t0;
if (!args['keep-frames']) fs.rmSync(framesDir, { recursive: true, force: true });

const outBytes = fs.statSync(out).size;
const report = {
  scene: args.scene,
  from, to, step, shots: total, fps,
  seconds: Number((total / fps).toFixed(3)),
  viewport: realSize, deviceScaleFactor: scale, png: JSON.parse(pngSize),
  workers, sink, codec, alpha, crf: codec === 'h264' ? Number(args.crf || 18) : null,
  captureSeconds: Number((captureMs / 1000).toFixed(2)),
  encodeSeconds: Number((encodeMs / 1000).toFixed(2)),
  wallSeconds: Number((wallMs / 1000).toFixed(2)),
  framesPerSecondCaptured: Number((total / (captureMs / 1000)).toFixed(2)),
  pngMB: Number((pngBytes / 1e6).toFixed(1)),
  pngOnDiskMB: sink === 'disk' ? Number((pngBytes / 1e6).toFixed(1)) : 0,
  peakPendingFrames: sink === 'pipe' ? peakPending : null,
  peakPendingMB: sink === 'pipe' ? Number((peakPendingBytes / 1e6).toFixed(1)) : null,
  outMB: Number((outBytes / 1e6).toFixed(1)),
  outMBperMinute: Number(((outBytes / 1e6) / (total / fps / 60)).toFixed(1)),
  peakRssMB: Number((process.memoryUsage().rss / 1e6).toFixed(0)),
  out,
};
console.log(`\n${JSON.stringify(report, null, 2)}`);
if (args.json) fs.writeFileSync(path.resolve(args.json), `${JSON.stringify(report, null, 2)}\n`);
