#!/usr/bin/env node
/**
 * Chạy build → verify (→ shoot nếu có --jobs) làm MỘT lệnh, dừng ngay ở bước đầu tiên lỗi.
 *
 * Log thật từ n5-05 (17/09/2026, `.studio/runs.jsonl`): build chạy 7 lần, verify 7 lần, shoot 6 lần
 * — mỗi lần là một lượt agent riêng (gọi lệnh → đọc output → quyết định → gọi lệnh tiếp). Gộp 3 lệnh
 * hay-đi-cùng-nhau vào một lần gọi giảm số lượt xuống 1/3, không thay đổi hành vi từng lệnh (vẫn
 * dùng đúng `run-logged.mjs` nên `.studio/runs.jsonl` vẫn ghi đủ từng stage).
 *
 *   node tools/scene-gate.mjs --video <id>                       build + verify
 *   node tools/scene-gate.mjs --video <id> --jobs qa/jobs.json    build + verify + shoot
 *
 * Không tự sửa gì — chỉ chạy và dừng đúng chỗ lỗi đầu tiên, để agent đọc lỗi rồi tự quyết định sửa.
 * Đây KHÔNG thay cho `render`/`transcript` (không deterministic-chain-được với sửa lời/scene giữa
 * chừng) — chỉ gộp đúng 3 bước hay lặp lại nhiều lần nhất khi đang chỉnh scene.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fail = (m) => { console.error(`✗ ${m}`); process.exit(2); };

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log('usage: node tools/scene-gate.mjs --video <id> [--jobs <qa/jobs.json>]   # build → verify → shoot, một lệnh');
  process.exit(0);
}
const flags = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) { flags[argv[i].slice(2)] = argv[i + 1]; i++; }
}
const videoId = flags.video;
if (!videoId) fail('usage: node tools/scene-gate.mjs --video <id> [--jobs <qa/jobs.json>]');

function step(stage, cmd) {
  console.log(`\n▶ ${stage}: ${cmd.join(' ')}`);
  const res = spawnSync('node', ['tools/run-logged.mjs', stage, '--video', videoId, '--', ...cmd], {
    cwd: REPO, stdio: 'inherit',
  });
  if (res.status !== 0) {
    console.error(`\n✗ Dừng ở bước "${stage}" (exit ${res.status}) — đọc output ở trên để sửa trước khi chạy lại.`);
    process.exit(res.status || 1);
  }
}

step('build', ['npm', 'run', 'build']);
// `--` để npm chuyển cờ xuống `tools/verify.mjs`: chỉ gate video đang dựng, exit code theo đúng nó.
// Trước đây bước này smoke-render cả 11 video (~23 s) và trộn "đỏ cũ" của video khác vào output.
step('verify', ['npm', 'run', 'verify', '--', '--video', videoId]);
if (flags.jobs) step('shoot', ['node', 'tools/shoot.mjs', '--batch', flags.jobs]);

console.log(`\n✓ scene-gate xong sạch cho ${videoId}${flags.jobs ? ' (kể cả shoot)' : ' (chưa shoot — thêm --jobs <file> nếu cần)'}.`);
