#!/usr/bin/env node
/**
 * `verify` KHÔNG CỜ, so với một BASELINE đã lưu.
 *
 * ── Vì sao (hồi quy 22/09/2026) ───────────────────────────────────────────────────────────────
 * Một lane siết phép ước lượng bề ngang chữ trong `verify` để bắt một ca thật, rồi nộp sau khi
 * chạy `verify --video <id>` — xanh. Nhưng bản KHÔNG CỜ đã nhảy từ **1 problem lên 13**: 11 dòng
 * chữ nằm gọn trong hộp ở 5 video ĐÃ DUYỆT bỗng thành lỗi chặn. Không ai thấy, vì không ai chạy
 * bản không cờ.
 *
 * Luật của harness: **check mới không được biến video cũ từ đạt thành trượt.** Lệnh này biến luật
 * đó thành một phép so được:
 *
 *   node tools/verify-baseline.mjs --save     # chụp baseline hiện tại (chỉ làm khi đã soát tay)
 *   node tools/verify-baseline.mjs            # so với baseline; exit 1 nếu có problem MỚI
 *
 * So theo TẬP problem, không theo số đếm: sửa một lỗi cũ rồi thêm một lỗi mới thì số không đổi
 * nhưng vẫn phải đỏ.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'tools', 'verify-baseline.json');
const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`usage: node tools/verify-baseline.mjs [--save] [--json]

  (không cờ)  chạy \`verify\` KHÔNG CỜ, so với ${path.relative(ROOT, FILE)}
  --save      ghi lại baseline từ lần chạy này — CHỈ làm khi đã soát tay từng dòng

exit: 0 không có problem mới · 1 có problem mới (hoặc chưa có baseline) · 2 verify không chạy được`);
  process.exit(0);
}

let out = '';
try {
  out = execFileSync(process.execPath, [path.join(ROOT, 'tools/verify.mjs')], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  out = `${e.stdout ?? ''}`;
  if (!out) { console.error(`✗ verify không chạy được: ${e.message}`); process.exit(2); }
}
// Dòng problem của verify có dạng "  - <where>: <mô tả>". Bỏ phần số đo trong ngoặc để một thay
// đổi làm số nhích 1px không bị coi là problem mới.
const problems = out.split('\n').filter((l) => /^ {2}- /.test(l))
  .map((l) => l.replace(/^ {2}- /, '').replace(/\s*\(ước [^)]*\)/, '').trim())
  .sort();

if (argv.includes('--save')) {
  fs.writeFileSync(FILE, `${JSON.stringify({ $doc: 'Baseline problem của `verify` KHÔNG CỜ. Chỉ cập nhật khi đã soát tay từng dòng.', at: new Date().toISOString().slice(0, 10), count: problems.length, problems }, null, 2)}\n`);
  console.log(`✓ đã lưu baseline ${problems.length} problem → ${path.relative(ROOT, FILE)}`);
  for (const p of problems) console.log(`  · ${p}`);
  process.exit(0);
}

if (!fs.existsSync(FILE)) {
  console.error(`✗ chưa có ${path.relative(ROOT, FILE)} — chạy \`node tools/verify-baseline.mjs --save\` một lần sau khi soát tay.`);
  process.exit(1);
}
const base = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const known = new Set(base.problems);
const now = new Set(problems);
const added = problems.filter((p) => !known.has(p));
const fixed = base.problems.filter((p) => !now.has(p));

if (argv.includes('--json')) {
  console.log(JSON.stringify({ baselineAt: base.at, count: problems.length, baseline: base.problems.length, added, fixed }, null, 2));
  process.exit(added.length ? 1 : 0);
}
console.log(`verify KHÔNG CỜ: ${problems.length} problem · baseline ${base.problems.length} (chụp ${base.at})`);
for (const p of fixed) console.log(`  ✓ đã hết: ${p}`);
if (!added.length) { console.log('✓ không có problem MỚI trên video cũ.'); process.exit(0); }
console.error(`✗ ${added.length} problem MỚI — check vừa sửa đang biến video cũ từ đạt thành trượt:`);
for (const p of added) console.error(`  · ${p}`);
console.error('  → hoặc chữa phép đo cho hết báo oan, hoặc hạ ca thật xuống CẢNH BÁO khi chạy không cờ.');
console.error(`  Nếu đã soát tay và chấp nhận: node tools/verify-baseline.mjs --save`);
process.exit(1);
