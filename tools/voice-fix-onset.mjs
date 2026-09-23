#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const usage = 'Usage: node tools/voice-fix-onset.mjs <thư mục vào> <thư mục ra>';
const fail = (message) => { console.error(`✗ ${message}\n${usage}`); process.exit(1); };
const [src, dest, ...extra] = process.argv.slice(2);
if (process.argv.includes('--help') || process.argv.includes('-h')) { console.log(usage); process.exit(0); }
if (!src || !dest || extra.length) fail('Cần đúng hai thư mục.');
const input = path.resolve(src);
const output = path.resolve(dest);
if (!fs.existsSync(input) || !fs.statSync(input).isDirectory()) fail(`Không có thư mục vào: ${input}`);
if (input === output) fail('Thư mục ra phải khác thư mục vào.');
const files = fs.readdirSync(input).filter((name) => name.toLowerCase().endsWith('.wav')).sort();
if (!files.length) fail('Thư mục vào không có WAV.');

function pcm16(file) {
  const wav = fs.readFileSync(file);
  if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') throw new Error('không phải RIFF/WAVE');
  let fmt, data;
  for (let p = 12; p + 8 <= wav.length;) {
    const id = wav.toString('ascii', p, p + 4);
    const size = wav.readUInt32LE(p + 4);
    if (p + 8 + size > wav.length) throw new Error('chunk WAV bị thiếu dữ liệu');
    if (id === 'fmt ') fmt = { format: wav.readUInt16LE(p + 8), channels: wav.readUInt16LE(p + 10), rate: wav.readUInt32LE(p + 12), bits: wav.readUInt16LE(p + 22) };
    if (id === 'data') data = wav.subarray(p + 8, p + 8 + size);
    p += 8 + size + (size % 2);
  }
  if (!fmt || fmt.format !== 1 || fmt.channels !== 1 || fmt.rate !== 24000 || fmt.bits !== 16 || !data || data.length % 2) throw new Error('cần WAV PCM 16-bit mono 24kHz');
  return data;
}

function findCut(data) {
  const sr = 24000, win = 480;
  const limit = Math.min(data.length / 2, Math.floor(0.45 * sr));
  const rms = [];
  for (let start = 0; start < limit; start += win) {
    let sum = 0;
    for (let i = start; i < Math.min(start + win, data.length / 2); i++) {
      const sample = data.readInt16LE(i * 2) / 32768;
      sum += sample * sample;
    }
    // Python prototype uses a 480-sample slice even for the last partial window.
    rms.push(Math.sqrt(sum / Math.min(win, data.length / 2 - start)));
  }
  const burst = rms.findIndex((value) => value > 0.04);
  if (burst < 0) return 0;
  let peak = 0, j = burst;
  while (j < rms.length && (j - burst) * win < 0.15 * sr) peak = Math.max(peak, rms[j++]);
  for (let i = j; i < rms.length; i++) if (rms[i] < peak * 0.35) return i * win;
  return 0;
}

function writeWav(file, data) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(data.length + 36, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(24000, 24); header.writeUInt32LE(48000, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
}

try {
  const results = files.map((name) => ({ name, data: pcm16(path.join(input, name)) }));
  fs.mkdirSync(output, { recursive: true });
  for (const { name, data } of results) {
    const cut = findCut(data);
    const trimmed = Buffer.from(data.subarray(cut * 2));
    if (cut >= 480) {
      const fade = Math.min(192, trimmed.length / 2);
      for (let i = 0; i < fade; i++) trimmed.writeInt16LE(Math.round(trimmed.readInt16LE(i * 2) * i / (fade - 1)), i * 2);
    }
    writeWav(path.join(output, name), trimmed);
    console.log(cut >= 480 ? `${name}: cắt ${Math.round(cut / 24)}ms` : `${name}: không phát hiện artifact`);
  }
} catch (error) { fail(error.message); }
