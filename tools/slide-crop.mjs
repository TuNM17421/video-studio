#!/usr/bin/env node
/**
 * Crop a region out of a slide PDF page and save it as a PNG — for slides that already contain a
 * ready-made illustration (a mock UI, a diagram photo, a screenshot the lecturer pasted in). This is
 * cheaper and more accurate than redrawing the same thing with a component (PhoneFrame/BrowserFrame):
 * see .claude/skills/make-video/visual-assets.md §2 "Nguồn từ slide PDF".
 *
 * Two-step workflow, because you cannot eyeball a crop box without seeing the full page first:
 *
 *   1. node tools/slide-crop.mjs <pdf> <page> --out preview.png [--dpi 300]
 *      Renders the whole page only. Open preview.png, read off the region you want as a FRACTION of
 *      the page (0–1, origin top-left) — x0,y0 top-left corner, x1,y1 bottom-right corner.
 *
 *   2. node tools/slide-crop.mjs <pdf> <page> --box 0.12,0.30,0.55,0.78 --out crop.png [--dpi 300]
 *      Renders and crops to that box. Box values are fractions, not pixels or points, so the same
 *      numbers work at any --dpi.
 *
 * Requires `pdftoppm` (poppler — already on this machine) and ffmpeg (ffmpeg-static from npm install,
 * or $FFMPEG, or `ffmpeg` on PATH) for the crop step.
 *
 * `--page` is 1-based, matching how a human reads "trang 14" in PROMPTS.md/source-brief.md.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const require = createRequire(import.meta.url);
const VALUE_FLAGS = new Set(['out', 'dpi', 'box']);
const argv = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) { positional.push(argv[i]); continue; }
  const name = argv[i].slice(2);
  flags[name] = VALUE_FLAGS.has(name) ? argv[++i] : true;
}
const [pdfPath, pageArg] = positional;
if (!pdfPath || !pageArg) fail('usage: node tools/slide-crop.mjs <pdf> <page 1-based> --out <file.png> [--box x0,y0,x1,y1] [--dpi 300]');
if (!fs.existsSync(pdfPath)) fail(`không thấy file: ${pdfPath}`);
const page = Number(pageArg);
if (!Number.isInteger(page) || page < 1) fail(`số trang phải là số nguyên ≥ 1, nhận "${pageArg}"`);
const out = flags.out ? path.resolve(flags.out) : fail('thiếu --out <file.png>');
const dpi = flags.dpi ? Number(flags.dpi) : 300;

function findPdftoppm() {
  const probe = spawnSync('pdftoppm', ['-v']);
  if (probe.status === 0 || probe.status === 1) return 'pdftoppm'; // -v exits 1 on some builds, still found
  fail('không thấy `pdftoppm` (poppler). Cài bằng `brew install poppler`.');
}
function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try {
    const bin = require('ffmpeg-static');
    if (bin && fs.existsSync(bin)) return bin;
  } catch {}
  return 'ffmpeg';
}

const pdftoppm = findPdftoppm();
const tmpBase = path.join(os.tmpdir(), `slide-crop-${Date.now()}`);
const render = spawnSync(pdftoppm, [
  '-png', '-r', String(dpi), '-f', String(page), '-l', String(page), '-singlefile',
  pdfPath, tmpBase,
]);
if (render.status !== 0) fail(`pdftoppm lỗi: ${render.stderr?.toString() || render.status}`);
const rendered = `${tmpBase}.png`;
if (!fs.existsSync(rendered)) fail(`pdftoppm không tạo ra file — kiểm lại số trang (PDF có đúng ${page} trang trở lên không?)`);

fs.mkdirSync(path.dirname(out), { recursive: true });

if (!flags.box) {
  fs.copyFileSync(rendered, out); // không renameSync: tmp và --out khác ổ sẽ lỗi EXDEV
  fs.rmSync(rendered, { force: true });
  console.log(`✓ ${path.relative(process.cwd(), out)} · trang ${page} @ ${dpi}dpi (cả trang, chưa crop)`);
  console.log('  Mở ảnh, đọc toạ độ vùng cần cắt theo tỉ lệ 0–1 (góc trên-trái x0,y0 · góc dưới-phải x1,y1),');
  console.log('  rồi chạy lại kèm --box x0,y0,x1,y1 để crop.');
  process.exit(0);
}

const box = String(flags.box).split(',').map(Number);
if (box.length !== 4 || box.some((n) => Number.isNaN(n))) fail('--box phải là 4 số cách nhau bởi dấu phẩy: x0,y0,x1,y1 (tỉ lệ 0–1)');
const [x0, y0, x1, y1] = box;
if (!(x0 >= 0 && y0 >= 0 && x1 <= 1 && y1 <= 1 && x1 > x0 && y1 > y0)) {
  fail(`--box vô lý: ${box.join(',')} — cần 0 ≤ x0<x1 ≤ 1 và 0 ≤ y0<y1 ≤ 1`);
}

// Đọc kích thước ảnh đã render để đổi tỉ lệ 0–1 sang pixel thật — dùng ffprobe đi kèm ffmpeg-static
// nếu có, fallback đọc header PNG tay (8 byte magic + IHDR width/height ở offset 16/20).
function pngSize(file) {
  const buf = fs.readFileSync(file);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
const { w: fullW, h: fullH } = pngSize(rendered);
const cx = Math.round(x0 * fullW);
const cy = Math.round(y0 * fullH);
const cw = Math.round((x1 - x0) * fullW);
const ch = Math.round((y1 - y0) * fullH);

const ffmpeg = findFfmpeg();
const crop = spawnSync(ffmpeg, [
  '-y', '-i', rendered, '-vf', `crop=${cw}:${ch}:${cx}:${cy}`, out,
], { stdio: ['ignore', 'ignore', 'pipe'] });
fs.rmSync(rendered, { force: true });
if (crop.status !== 0) fail(`ffmpeg crop lỗi: ${crop.stderr?.toString() || crop.status}`);

console.log(`✓ ${path.relative(process.cwd(), out)} · trang ${page} @ ${dpi}dpi · vùng ${box.join(',')} → ${cw}×${ch}px`);
