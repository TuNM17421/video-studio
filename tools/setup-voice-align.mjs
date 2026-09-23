#!/usr/bin/env node
/**
 * One-time setup for imported-voice word timestamps (npm run setup:voice).
 *
 * One install per machine, not per checkout: if any checkout/worktree (or the shared folder) already has a
 * working faster-whisper venv, it is reused and nothing is installed. Otherwise the venv goes to the shared
 * folder (tools/lib/shared-env.mjs → sharedHome()/voice-align-venv) so the next checkout finds it too;
 * `--local` keeps the old behaviour of installing into this checkout's voice/.venv.
 *
 * Uses `uv` when it is on PATH (it can fetch its own Python), otherwise a system python3.10–3.12 —
 * CTranslate2 wheels lag behind the newest Python, so the system default is not assumed to work.
 *
 *   node tools/setup-voice-align.mjs [--model small] [--local] [--force]
 *   node tools/setup-voice-align.mjs --where [--json]    which venv/model would be used, installs nothing
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, alignVenv, modelCache, runAlign } from './lib/voice-align.mjs';
import { displayPath, installDir, venvBin, WHISPER_VENV } from './lib/shared-env.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i < 0 || !argv[i + 1] || argv[i + 1].startsWith('--') ? fallback : argv[i + 1];
};
const model = value('model', process.env.VOICE_ALIGN_MODEL || 'small');
const REQS = path.join(ROOT, 'tools/voice-align/requirements.txt');

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts });
const has = (cmd) => spawnSync(cmd, ['--version'], { stdio: 'ignore' }).status === 0;
const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };

// Cheap: no Python is started. Studio asks this to decide whether to show "Cài Whisper".
if (flag('where')) {
  const found = alignVenv();
  const cache = modelCache(model);
  const where = { installed: Boolean(found), venv: found?.dir ?? null, from: found?.from ?? null, python: found?.bin ?? null, modelCache: cache };
  if (flag('json')) console.log(JSON.stringify(where));
  else console.log(found ? `✓ ${displayPath(found.dir)} (${found.from}) · model cache ${displayPath(cache)}` : '✗ chưa có môi trường nhận diện giọng');
  process.exit(found ? 0 : 1);
}

const target = installDir(WHISPER_VENV, { local: flag('local') });
if (flag('force')) fs.rmSync(target, { recursive: true, force: true });

// Reuse before installing: a venv that already loads the model needs nothing more.
const existing = alignVenv();
if (existing && !flag('force')) {
  const check = await runAlign({ model }, { check: true, onLine: (l) => console.log(`  ${l}`) });
  if (check.ok) {
    console.log(`✓ dùng lại môi trường có sẵn: ${displayPath(existing.dir)} (${existing.from}) · model ${check.result.model} · ${check.result.device}/${check.result.compute}`);
    console.log(`  model cache: ${displayPath(modelCache(model))}`);
    process.exit(0);
  }
  console.log(`· ${displayPath(existing.dir)} có sẵn nhưng chưa chạy được (${check.error}) — cài vào ${displayPath(target)}`);
}

if (!venvBin(target, 'python')) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (has('uv')) {
    console.log(`· tạo môi trường bằng uv (Python 3.12) → ${displayPath(target)}`);
    if (run('uv', ['venv', '--python', '3.12', target]).status !== 0) fail('uv venv thất bại.');
  } else {
    const python = ['python3.12', 'python3.11', 'python3.10'].find((p) => has(p));
    if (!python) fail('Cần Python 3.10–3.12 (hoặc cài uv: https://docs.astral.sh/uv/). Không tìm thấy bản nào phù hợp.');
    console.log(`· tạo môi trường bằng ${python} → ${displayPath(target)}`);
    if (run(python, ['-m', 'venv', target]).status !== 0) fail('python -m venv thất bại.');
  }
}
const python = venvBin(target, 'python');
if (!python) fail(`Không tạo được ${displayPath(target)}.`);

console.log('· cài faster-whisper');
const install = has('uv')
  ? run('uv', ['pip', 'install', '--python', python, '-r', REQS])
  : run(python, ['-m', 'pip', 'install', '--upgrade', '-r', REQS]);
if (install.status !== 0) fail('Cài faster-whisper thất bại.');

const cache = modelCache(model);
console.log(`· model Whisper "${model}" ở ${displayPath(cache)} (lần đầu phải tải, có thể mất vài phút)`);
fs.mkdirSync(cache, { recursive: true });
// Check the venv just installed, not whichever one the search would pick first.
const check = await runAlign({ model }, { check: true, python, onLine: (l) => console.log(`  ${l}`) });
if (!check.ok) fail(check.error);
console.log(`✓ sẵn sàng · model ${check.result.model} · ${check.result.device}/${check.result.compute}`);
console.log('  Nhập giọng tự thu hoặc do model local tạo: bước "Giọng đọc" trong Video Studio, hoặc');
console.log('  node tools/voice-import.mjs --cues <video dir>/cues.js --from <thư mục audio>');
