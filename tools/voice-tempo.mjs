#!/usr/bin/env node
/**
 * Tăng/giảm tốc độ đọc của các file WAV mà KHÔNG đổi cao độ (ffmpeg `atempo`).
 *
 * Vì sao cần: OmniVoice sinh ở `speed` cao (1.5) hay nuốt mất phần đầu câu — xem
 * .claude/skills/make-video/failure-modes.md FM-02. Cách chắc ăn hơn là bắt model đọc ở nhịp tự
 * nhiên (`--speed 1.0`) rồi tăng tốc ở đây. Model không bị ép, mà video vẫn có nhịp nhanh.
 *
 * `atempo` giữ nguyên cao độ nên giọng không bị chói kiểu tua nhanh. Một lần `atempo` chỉ nhận
 * 0.5–2.0; ngoài khoảng đó phải nối nhiều lần, tool tự lo.
 *
 *   node tools/voice-tempo.mjs <thư mục vào> <thư mục ra> --tempo 1.35
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const usage = 'Usage: node tools/voice-tempo.mjs <thư mục vào> <thư mục ra> [--tempo 1.35]';
const fail = (m) => { console.error(`✗ ${m}\n${usage}`); process.exit(1); };

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(usage); process.exit(0); }
const tempoIdx = argv.indexOf('--tempo');
const tempo = tempoIdx === -1 ? 1.35 : Number(argv[tempoIdx + 1]);
const dirs = argv.filter((a, i) => !a.startsWith('--') && i !== tempoIdx + 1);
const [src, dest] = dirs;
if (!src || !dest) fail('Cần thư mục vào và thư mục ra.');
if (!Number.isFinite(tempo) || tempo <= 0) fail(`--tempo không hợp lệ: ${argv[tempoIdx + 1]}`);

const input = path.resolve(src);
const output = path.resolve(dest);
if (input === output) fail('Thư mục ra phải khác thư mục vào.');
if (!fs.existsSync(input)) fail(`Không có thư mục vào: ${input}`);

/** atempo chỉ nhận 0.5–2.0 mỗi lần; chia nhỏ rồi nối lại cho đúng tổng hệ số. */
function atempoChain(factor) {
  const parts = [];
  let left = factor;
  while (left > 2.0) { parts.push(2.0); left /= 2.0; }
  while (left < 0.5) { parts.push(0.5); left /= 0.5; }
  parts.push(Number(left.toFixed(6)));
  return parts.map((p) => `atempo=${p}`).join(',');
}

let ffmpeg = process.env.FFMPEG;
if (!ffmpeg) { try { ffmpeg = require('ffmpeg-static'); } catch { ffmpeg = 'ffmpeg'; } }

const files = fs.readdirSync(input).filter((f) => f.toLowerCase().endsWith('.wav')).sort();
if (!files.length) fail('Thư mục vào không có WAV.');
fs.mkdirSync(output, { recursive: true });

const filter = atempoChain(tempo);
let done = 0;
for (const name of files) {
  const from = path.join(input, name);
  const to = path.join(output, name);
  const r = spawnSync(ffmpeg, ['-y', '-i', from, '-filter:a', filter, '-ar', '24000', '-ac', '1', to], { stdio: 'pipe' });
  if (r.status !== 0) fail(`ffmpeg lỗi ở ${name}: ${String(r.stderr).split('\n').slice(-3).join(' ')}`);
  done += 1;
}
console.log(`✓ ${done} file · tempo ${tempo} (${filter}) → ${output}`);
console.log('  Cao độ giữ nguyên. Chạy voice-import.mjs (có align) sau bước này để Whisper kiểm lại lời.');
