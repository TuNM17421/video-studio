#!/usr/bin/env node
/**
 * One-time setup for imported-voice word timestamps (npm run setup:voice).
 *
 * Creates voice/.venv and installs faster-whisper into it, then loads the model once so the first import
 * is not also the first download. Uses `uv` when it is on PATH (it can fetch its own Python), otherwise a
 * system python3.10–3.12 — CTranslate2 wheels lag behind the newest Python, so the system default is not
 * assumed to work.
 *
 *   node tools/setup-voice-align.mjs [--model small] [--force]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { MODEL_CACHE, ROOT, runAlign, VENV, venvPython } from './lib/voice-align.mjs';

const argv = process.argv.slice(2);
const value = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i < 0 || !argv[i + 1] || argv[i + 1].startsWith('--') ? fallback : argv[i + 1];
};
const model = value('model', process.env.VOICE_ALIGN_MODEL || 'small');
const REQS = path.join(ROOT, 'tools/voice-align/requirements.txt');

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts });
const has = (cmd) => spawnSync(cmd, ['--version'], { stdio: 'ignore' }).status === 0;
const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };

if (argv.includes('--force')) fs.rmSync(VENV, { recursive: true, force: true });

if (!venvPython()) {
  fs.mkdirSync(path.dirname(VENV), { recursive: true });
  if (has('uv')) {
    console.log('· tạo môi trường bằng uv (Python 3.12)');
    if (run('uv', ['venv', '--python', '3.12', VENV]).status !== 0) fail('uv venv thất bại.');
  } else {
    const python = ['python3.12', 'python3.11', 'python3.10'].find((p) => has(p));
    if (!python) fail('Cần Python 3.10–3.12 (hoặc cài uv: https://docs.astral.sh/uv/). Không tìm thấy bản nào phù hợp.');
    console.log(`· tạo môi trường bằng ${python}`);
    if (run(python, ['-m', 'venv', VENV]).status !== 0) fail('python -m venv thất bại.');
  }
}
const python = venvPython();
if (!python) fail('Không tạo được voice/.venv.');

console.log('· cài faster-whisper');
const install = has('uv')
  ? run('uv', ['pip', 'install', '--python', python, '-r', REQS])
  : run(python, ['-m', 'pip', 'install', '--upgrade', '-r', REQS]);
if (install.status !== 0) fail('Cài faster-whisper thất bại.');

console.log(`· tải model Whisper "${model}" về ${path.relative(ROOT, MODEL_CACHE)} (lần đầu có thể mất vài phút)`);
fs.mkdirSync(MODEL_CACHE, { recursive: true });
const check = await runAlign({ model }, { check: true, onLine: (l) => console.log(`  ${l}`) });
if (!check.ok) fail(check.error);
console.log(`✓ sẵn sàng · model ${check.result.model} · ${check.result.device}/${check.result.compute}`);
console.log('  Nhập giọng tự thu hoặc do model local tạo: bước "Giọng đọc" trong Video Studio, hoặc');
console.log('  node tools/voice-import.mjs --cues <video dir>/cues.js --from <thư mục audio>');
