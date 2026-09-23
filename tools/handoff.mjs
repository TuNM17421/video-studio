#!/usr/bin/env node
/**
 * Tín hiệu bàn giao giữa các lane — `projects/<id>/.studio/handoff.json`.
 *
 *   node tools/handoff.mjs get  --video <id> [<khoá>] [--json]
 *   node tools/handoff.mjs set  --video <id> <khoá> --value <v> [--note <text>]
 *   node tools/handoff.mjs wait --video <id> <khoá> [--equals <v>] [--timeout 600] [--every 5]
 *
 * Khoá lồng nhau viết bằng dấu chấm: `voice.state` · `audition.done` · `scenes.anchorsDone`.
 * `--value` tự nhận kiểu: `true`/`false`/số/JSON, còn lại là chuỗi.
 *
 * ── Vì sao (retro d05-v06 · F3) ───────────────────────────────────────────────────────────────
 * Lane VOICE ghi đè `cues.js` giữa lúc lane cảnh đang build → build vỡ. Owner dùng "có mục TRACE
 * mới" làm dấu hiệu xong → lại mở thêm một vòng thừa. Vòng sau hai lane tự dựng `handoff.json`
 * bằng tay và chạy trơn, nhưng chưa tool nào đọc nó. Từ nay: **chờ lane khác = `handoff wait`,
 * không chờ một mục TRACE xuất hiện.**
 *
 * `wait` thăm dò theo chu kỳ, KHÔNG giữ khoá và KHÔNG sửa gì. Exit code có nghĩa để cắm vào script:
 *   0 điều kiện đã đạt · 1 hết giờ mà chưa đạt · 2 sai cách gọi.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coerce, getPath, handoffPath, readHandoff, satisfied, setPath } from './lib/handoff.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = `usage: node tools/handoff.mjs get  --video <id> [<khoá>] [--json]
       node tools/handoff.mjs set  --video <id> <khoá> --value <v> [--note <text>]
       node tools/handoff.mjs wait --video <id> <khoá> [--equals <v>] [--timeout 600] [--every 5]

  <khoá>      khoá lồng nhau bằng dấu chấm: voice.state · audition.done · scenes.anchorsDone
  --value     true/false/số/JSON nhận đúng kiểu; còn lại là chuỗi
  --equals    giá trị phải bằng; bỏ trống = chỉ cần khoá có mặt và khác null/false
  --timeout   giây, mặc định 600 · --every  giây giữa hai lần thăm dò, mặc định 5

exit: 0 đạt · 1 hết giờ / chưa đạt · 2 sai cách gọi`;

const argv = process.argv.slice(2);
if (!argv.length || argv.includes('--help') || argv.includes('-h')) { console.log(USAGE); process.exit(argv.length ? 0 : 2); }
const cmd = argv[0];
const value = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const fail = (m) => { console.error(`✗ ${m}`); process.exit(2); };

const videoId = value('video');
if (!videoId) fail(`thiếu --video <id>.\n${USAGE}`);
if (!['get', 'set', 'wait'].includes(cmd)) fail(`lệnh "${cmd}" không hợp lệ — get | set | wait.`);

// Positional = token đầu tiên sau lệnh mà không phải cờ và không phải giá trị của một cờ.
const VALUE_FLAGS = new Set(['--video', '--value', '--equals', '--timeout', '--every', '--note']);
const positional = [];
for (let i = 1; i < argv.length; i++) {
  if (argv[i].startsWith('--')) { if (VALUE_FLAGS.has(argv[i])) i++; continue; }
  positional.push(argv[i]);
}
const key = positional[0];

const file = handoffPath(videoId, ROOT);
const rel = path.relative(ROOT, file);
const stamp = () => { try { return execFileSync('date', ['+%Y-%m-%dT%H:%M:%S%z'], { encoding: 'utf8' }).trim(); } catch { return new Date().toISOString(); } };

if (cmd === 'get') {
  const data = readHandoff(videoId, ROOT);
  const out = key ? getPath(data, key) : data;
  if (argv.includes('--json') || !key) { console.log(JSON.stringify(out ?? null, null, 2)); }
  else if (out === undefined) { console.error(`✗ ${rel}: chưa có khoá "${key}"`); process.exit(1); }
  else console.log(typeof out === 'object' ? JSON.stringify(out) : String(out));
  process.exit(0);
}

if (cmd === 'set') {
  if (!key) fail('thiếu <khoá>. Ví dụ: `set --video <id> voice.state --value staged`');
  const raw = value('value');
  if (raw === undefined) fail('thiếu --value');
  let data = setPath(readHandoff(videoId, ROOT), key, coerce(raw));
  // Mỗi lần ghi đều đóng dấu GIỜ THẬT của máy vào nhánh gốc của khoá: lane sau cần biết tín hiệu
  // này cũ hay mới, và giờ gõ tay thì luôn sai (F10).
  const root = key.split('.')[0];
  data = setPath(data, `${root}.at`, stamp());
  const note = value('note');
  if (note) data = setPath(data, `${root}.note`, note);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`✓ ${rel}: ${key} = ${JSON.stringify(coerce(raw))} (lúc ${getPath(data, `${root}.at`)})`);
  process.exit(0);
}

// ── wait ──────────────────────────────────────────────────────────────────────────────────────
if (!key) fail('thiếu <khoá>. Ví dụ: `wait --video <id> voice.state --equals staged`');
const expect = argv.includes('--equals') ? coerce(value('equals')) : undefined;
const timeout = Number(value('timeout') ?? 600);
const every = Math.max(1, Number(value('every') ?? 5));
if (!Number.isFinite(timeout) || timeout <= 0) fail('--timeout phải là số giây > 0');

const want = expect === undefined ? 'có mặt và khác null/false' : `= ${JSON.stringify(expect)}`;
console.error(`⏳ chờ ${rel}: ${key} ${want} — tối đa ${timeout}s, thăm dò mỗi ${every}s`);
const deadline = Date.now() + timeout * 1000;
let last;
for (;;) {
  const now = getPath(readHandoff(videoId, ROOT), key);
  if (satisfied(now, expect)) {
    console.log(`✓ ${key} = ${JSON.stringify(now)} — đi tiếp.`);
    process.exit(0);
  }
  if (JSON.stringify(now) !== JSON.stringify(last)) {
    console.error(`  · hiện là ${JSON.stringify(now ?? null)}`);
    last = now;
  }
  if (Date.now() >= deadline) {
    console.error(`✗ hết ${timeout}s mà ${key} vẫn là ${JSON.stringify(now ?? null)}.`);
    console.error('  → hỏi orchestrator, ĐỪNG tự đi làm phần của lane kia (đó là cách build vỡ giữa chừng).');
    process.exit(1);
  }
  // Ngủ đồng bộ: tool này cố ý không async, để cắm được vào một chuỗi lệnh shell thẳng.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, every * 1000);
}
