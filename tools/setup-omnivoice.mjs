#!/usr/bin/env node
/**
 * Cài model giọng chạy dưới máy — OmniVoice (npm run setup:omnivoice).
 *
 * Dựng `voice/.venv-omnivoice`, cài torch hợp phần cứng rồi cài `omnivoice` từ PyPI. Trọng số model
 * OmniVoice tự tải từ Hugging Face ở lần sinh giọng đầu tiên, nên bước này chỉ lo phần Python.
 *
 *   node tools/setup-omnivoice.mjs [--check] [--force] [--local] [--device cuda|mps|cpu]
 *
 *   --check    chỉ báo trạng thái (Video Studio gọi cái này), không cài gì
 *   --force    xoá môi trường cũ rồi cài lại từ đầu (chỉ môi trường của checkout này hoặc thư mục dùng chung)
 *   --local    cài vào voice/.venv-omnivoice của checkout này thay vì thư mục dùng chung
 *
 * Một bản cho cả máy (tools/lib/shared-env.mjs): checkout nào, worktree nào đã cài rồi thì dùng lại, không
 * cài thêm; chưa có thì cài vào thư mục dùng chung để checkout sau cũng thấy.
 *   --device   ép loại phần cứng thay vì tự dò
 *
 * Tải về vài GB (riêng torch bản CUDA đã ~2,5 GB), nên chạy một lần rồi thôi.
 * Sinh giọng xong thì nhập lại bằng bước "Giọng đọc" của Studio, hoặc tools/voice-import.mjs.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { detectDevice, inferBatchBin, MODEL_ID, omnivoiceStatus, omnivoiceVenv, ROOT, torchArgs } from './lib/omnivoice.mjs';
import { displayPath, installDir, OMNIVOICE_VENV, venvBin } from './lib/shared-env.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i < 0 || !argv[i + 1] || argv[i + 1].startsWith('--') ? fallback : argv[i + 1];
};
const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const has = (cmd) => spawnSync(cmd, ['--version'], { stdio: 'ignore' }).status === 0;

if (flag('check')) {
  const status = omnivoiceStatus();
  console.log(JSON.stringify(status));
  process.exit(status.installed ? 0 : 1);
}

/** Chạy và đẩy từng dòng ra ngay — pip tải vài GB, im lặng mười phút thì không ai biết nó còn sống. */
function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: ROOT, ...opts });
    const pipe = (stream) => {
      let buf = '';
      stream.setEncoding('utf8');
      stream.on('data', (d) => {
        buf += d;
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        // pip vẽ thanh tiến trình bằng \r; chỉ lấy đoạn cuối để log không phình ra hàng nghìn dòng
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

// Đã có ở đâu đó (checkout này, thư mục dùng chung, hay worktree khác) và chạy được thì thôi, không cài lại.
const found = omnivoiceVenv();
if (found && inferBatchBin() && !flag('force')) {
  console.log(`✓ dùng lại môi trường có sẵn: ${displayPath(found.dir)} (${found.from}) · ${displayPath(inferBatchBin())}`);
  process.exit(0);
}
// Chỉ cài/xoá ở chỗ của mình: venv của một worktree khác không bao giờ bị --force xoá hay bị pip ghi đè.
const VENV = found && found.from !== 'worktree' && !flag('local') ? found.dir : installDir(OMNIVOICE_VENV, { local: flag('local') });
const venvPython = () => venvBin(VENV, 'python');
if (flag('force')) fs.rmSync(VENV, { recursive: true, force: true });

const forced = value('device', null);
const detected = detectDevice(); // spawn nvidia-smi — gọi đúng một lần
const device = forced ?? detected.id;
if (!['cuda', 'mps', 'cpu'].includes(device)) fail(`--device chỉ nhận cuda, mps hoặc cpu (nhận được "${device}").`);
console.log(`· phần cứng: ${forced ? `${device} (ép bằng --device, máy dò ra ${detected.label})` : detected.label}`);

if (!venvPython()) {
  fs.mkdirSync(path.dirname(VENV), { recursive: true });
  if (has('uv')) {
    console.log(`· tạo môi trường bằng uv (Python 3.12) → ${displayPath(VENV)}`);
    // --seed: uv mặc định KHÔNG cài pip vào venv. Thiếu nó, lần chạy sau mà uv không còn trên PATH
    // (trình cài uv chỉ chèn PATH vào ~/.zshrc — Studio spawn từ Next.js không nạp file đó) thì
    // nhánh dự phòng `python -m pip` chết với "No module named pip".
    if (await run('uv', ['venv', '--seed', '--python', '3.12', VENV], { stdio: ['ignore', 'pipe', 'pipe'] }) !== 0) fail('uv venv thất bại.');
  } else {
    const python = ['python3.12', 'python3.11', 'python3.10', 'python3', 'python'].find((p) => has(p));
    if (!python) fail('Cần Python 3.10+ (hoặc cài uv: https://docs.astral.sh/uv/). Không tìm thấy bản nào.');
    console.log(`· tạo môi trường bằng ${python} → ${displayPath(VENV)}`);
    if (await run(python, ['-m', 'venv', VENV], { stdio: ['ignore', 'pipe', 'pipe'] }) !== 0) fail('python -m venv thất bại.');
  }
}
const python = venvPython();
if (!python) fail(`Không tạo được ${displayPath(VENV)}.`);

// Chốt trình cài một lần: hỏi lại has('uv') ở từng lệnh thì nửa chừng đổi đường là hỏng nửa môi trường.
const useUv = has('uv');
const pip = (args) => (useUv
  ? run('uv', ['pip', 'install', '--python', python, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
  : run(python, ['-m', 'pip', 'install', '--upgrade', ...args], { stdio: ['ignore', 'pipe', 'pipe'] }));

console.log(`· cài torch cho ${device} (vài GB, lần đầu lâu)`);
if (await pip(torchArgs(device)) !== 0) fail('Cài torch thất bại.');

console.log('· cài omnivoice từ PyPI');
if (await pip(['omnivoice']) !== 0) fail('Cài omnivoice thất bại.');

const bin = venvBin(VENV, 'omnivoice-infer-batch');
if (!bin) fail('Cài xong nhưng không thấy lệnh omnivoice-infer-batch trong môi trường.');

console.log(`✓ sẵn sàng · ${displayPath(bin)}`);
console.log(`  Trọng số model (${MODEL_ID}) sẽ tự tải từ Hugging Face ở lần sinh giọng đầu tiên.`);
console.log('  Mạng chặn Hugging Face thì đặt HF_ENDPOINT="https://hf-mirror.com" rồi chạy lại.');
