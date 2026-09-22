#!/usr/bin/env node
/**
 * Cài Kaggle CLI cho đường "OmniVoice (Kaggle)" (npm run setup:kaggle).
 *
 * Dựng `voice/.venv-kaggle` rồi `pip install kaggle` vào đó. Nhẹ (vài MB, không có torch): model chạy trên
 * GPU của Kaggle, máy này chỉ đẩy kernel lên và tải kết quả về.
 *
 *   node tools/setup-kaggle.mjs [--check] [--json] [--force]
 *
 *   --check   chỉ báo trạng thái (Video Studio gọi cái này), không cài gì — thoát 1 nếu chưa có CLI
 *   --force   xoá venv cũ rồi cài lại
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { kaggleStatus, ROOT, VENV, venvBin } from './lib/kaggle.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const has = (cmd) => spawnSync(cmd, ['--version'], { stdio: 'ignore' }).status === 0;

if (flag('check')) {
  const status = kaggleStatus();
  if (flag('json')) console.log(JSON.stringify(status));
  else console.log(status.installed ? `✓ kaggle ${status.version} (${status.bin})` : '✗ chưa có Kaggle CLI');
  process.exit(status.installed ? 0 : 1);
}

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    const pipe = (stream) => {
      let buf = '';
      stream.setEncoding('utf8');
      stream.on('data', (d) => {
        buf += d;
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const text = line.split('\r').pop().trim();
          if (text) console.log(`  ${text}`);
        }
      });
    };
    pipe(child.stdout);
    pipe(child.stderr);
    child.on('error', () => resolve(1));
    child.on('close', (code) => resolve(code ?? 1));
  });
}

if (flag('force')) fs.rmSync(VENV, { recursive: true, force: true });

if (!venvBin('python')) {
  fs.mkdirSync(path.dirname(VENV), { recursive: true });
  if (has('uv')) {
    console.log('· tạo môi trường bằng uv');
    if (await run('uv', ['venv', '--seed', VENV]) !== 0) fail('uv venv thất bại.');
  } else {
    const python = ['python3', 'python'].find((p) => has(p));
    if (!python) fail('Cần Python 3.9+ (hoặc cài uv: https://docs.astral.sh/uv/). Không tìm thấy bản nào.');
    console.log(`· tạo môi trường bằng ${python} -m venv`);
    if (await run(python, ['-m', 'venv', VENV]) !== 0) fail(`${python} -m venv thất bại (Debian/Ubuntu: sudo apt install python3-venv).`);
  }
}

console.log('· pip install kaggle');
if (await run(venvBin('python'), ['-m', 'pip', 'install', '-q', '--upgrade', 'kaggle']) !== 0) fail('pip install kaggle thất bại, xem nhật ký phía trên.');

const status = kaggleStatus();
if (!status.installed) fail('Đã cài nhưng chưa chạy được `kaggle --version`.');
console.log(`✓ kaggle ${status.version} → ${path.relative(ROOT, status.bin)}`);
