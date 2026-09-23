#!/usr/bin/env node
/**
 * Đổi id một video ở MỌI chỗ nó xuất hiện thay vì đổi tay ≥9 chỗ (audit process #6 / backlog W5 #4).
 * `AGENTS.md` từng ghi lại việc đổi id nửa chừng làm vỡ tham chiếu chéo trong kich-ban-goc.md/
 * PROMPTS.md/runs.jsonl — công cụ này cố tình KHÔNG đụng `.studio/` (ledger lịch sử giữ nguyên id cũ).
 *
 *   node tools/rename-video.mjs <id-cũ> <id-mới>              mặc định: chỉ liệt kê (dry-run)
 *   node tools/rename-video.mjs <id-cũ> <id-mới> --apply       đổi thật
 *
 * Đổi tên:
 *   - projects/<id-cũ>/                                        → projects/<id-mới>/
 *   - vinuni-lesson-video-ds/ui_kits/lesson-video/videos/<id-cũ>/  → .../<id-mới>/
 *   - voice/out/<id-cũ>/                                       → voice/out/<id-mới>/
 *   - transcripts/<Day>/<id-cũ>.txt                             → .../<id-mới>.txt
 *   - chapters/<Day>/<id-cũ>-chương.txt                        → .../<id-mới>-chương.txt
 * Trong ba thư mục đầu: đổi tên mọi FILE có chuỗi id-cũ trong tên, rồi thay chuỗi id-cũ → id-mới
 * trong nội dung mọi file text (.js/.jsx/.json/.md/.html/.txt) — TRỪ bất cứ thứ gì nằm dưới `.studio/`.
 *
 * Sau khi đổi: grep lại toàn repo (trừ node_modules/.git) tìm id-cũ còn sót — in ra để tự xem tay
 * (kịch bản một video có thể nhắc tới id một video KHÁC một cách hợp lệ, không tự sửa mù).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(2);
};

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`Usage:
  node tools/rename-video.mjs <id-cũ> <id-mới> [--apply] [--repo <dir>]

Mặc định DRY-RUN: chỉ in kế hoạch (thư mục đổi tên, file đổi tên, số chỗ thay chuỗi trong nội dung).
--apply mới thật sự đổi. KHÔNG đụng .studio/ (ledger giữ id cũ, đúng quy ước AGENTS.md).
--repo <dir> chỉ để test trên một cây giả — mặc định là repo chứa chính file này.`);
  process.exit(0);
}

const repoFlagIndex = argv.indexOf('--repo');
const REPO = repoFlagIndex >= 0
  ? path.resolve(argv[repoFlagIndex + 1])
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const [oldId, newId] = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--repo');
const apply = argv.includes('--apply');
if (!oldId || !newId) fail('thiếu <id-cũ> <id-mới>. Xem --help.');
if (oldId === newId) fail('id-cũ và id-mới giống nhau.');

const TEXT_EXT = new Set(['.js', '.jsx', '.json', '.md', '.html', '.txt']);
const isUnderStudio = (p) => p.split(path.sep).includes('.studio');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// ── 1. Thư mục/file cần đổi tên ─────────────────────────────────────────────────────────────────
const dirMoves = [
  [path.join(REPO, 'projects', oldId), path.join(REPO, 'projects', newId)],
  [path.join(REPO, 'vinuni-lesson-video-ds', 'ui_kits', 'lesson-video', 'videos', oldId), path.join(REPO, 'vinuni-lesson-video-ds', 'ui_kits', 'lesson-video', 'videos', newId)],
  [path.join(REPO, 'voice', 'out', oldId), path.join(REPO, 'voice', 'out', newId)],
].filter(([from]) => fs.existsSync(from));

const fileMoves = [];
for (const base of ['transcripts', 'chapters']) {
  const dir = path.join(REPO, base);
  if (!fs.existsSync(dir)) continue;
  for (const day of fs.readdirSync(dir)) {
    const dayDir = path.join(dir, day);
    if (!fs.statSync(dayDir).isDirectory()) continue;
    for (const file of fs.readdirSync(dayDir)) {
      const stem = file.replace(/\.[^.]+$/, '');
      if (stem === oldId || stem === `${oldId}-chương`) {
        const newFile = file.replace(oldId, newId);
        fileMoves.push([path.join(dayDir, file), path.join(dayDir, newFile)]);
      }
    }
  }
}

if (!dirMoves.length && !fileMoves.length) fail(`không tìm thấy gì mang id "${oldId}" ở các vị trí quy ước (projects/, .../videos/, voice/out/, transcripts/, chapters/).`);

// ── 2. Kế hoạch thay chuỗi id trong nội dung — tính TRÊN CÂY GỐC (trước khi move) ─────────────────
const contentPlan = [];
for (const [from] of dirMoves) {
  for (const file of walk(from)) {
    if (isUnderStudio(file)) continue;
    if (!TEXT_EXT.has(path.extname(file))) continue;
    const text = fs.readFileSync(file, 'utf8');
    const count = text.split(oldId).length - 1;
    if (count > 0) contentPlan.push({ file, count, fromRoot: from });
  }
}

// ── 3. In kế hoạch ───────────────────────────────────────────────────────────────────────────────
console.log(`Kế hoạch đổi "${oldId}" → "${newId}"${apply ? ' (ĐANG ÁP DỤNG)' : ' (dry-run — thêm --apply để đổi thật)'}:`);
console.log('Thư mục:');
for (const [from, to] of dirMoves) console.log(`  ${path.relative(REPO, from)}/  →  ${path.relative(REPO, to)}/`);
console.log('File:');
for (const [from, to] of fileMoves) console.log(`  ${path.relative(REPO, from)}  →  ${path.relative(REPO, to)}`);
console.log(`Nội dung sẽ thay chuỗi id (${contentPlan.length} file, .studio/ bị loại trừ):`);
for (const item of contentPlan) console.log(`  ${path.relative(REPO, item.file)} (${item.count} chỗ)`);

if (!apply) {
  console.log('\nDRY-RUN — không có gì bị đổi. Chạy lại với --apply để thực hiện.');
  process.exit(0);
}

// ── 4. Áp dụng: move thư mục/file trước, rồi rename file-theo-tên-chứa-id, rồi thay nội dung ──────
for (const [from, to] of dirMoves) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
}
for (const [from, to] of fileMoves) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
}

const renamedFiles = [];
for (const [, to] of dirMoves) {
  for (const file of walk(to)) {
    if (isUnderStudio(file)) continue;
    const dir = path.dirname(file);
    const name = path.basename(file);
    if (name.includes(oldId)) {
      const newPath = path.join(dir, name.split(oldId).join(newId));
      fs.renameSync(file, newPath);
      renamedFiles.push(newPath);
    }
  }
}

let replacedCount = 0;
for (const [, to] of dirMoves) {
  for (const file of walk(to)) {
    if (isUnderStudio(file)) continue;
    if (!TEXT_EXT.has(path.extname(file))) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes(oldId)) continue;
    fs.writeFileSync(file, text.split(oldId).join(newId));
    replacedCount++;
  }
}

console.log(`\n✓ đã đổi ${dirMoves.length} thư mục, ${fileMoves.length} file, ${renamedFiles.length} file đổi tên theo id, ${replacedCount} file thay nội dung.`);

// ── 5. Grep lại toàn repo (trừ node_modules/.git) xem còn sót id-cũ ở đâu — chỉ báo, không tự sửa.
try {
  const hits = execSync(`grep -rl --exclude-dir=node_modules --exclude-dir=.git -- ${JSON.stringify(oldId)} .`, { cwd: REPO, encoding: 'utf8' }).trim();
  if (hits) {
    console.log(`\n⚠ vẫn còn "${oldId}" ở (kiểm tay — có thể là tham chiếu hợp lệ tới video khác hoặc .studio/ ledger lịch sử):`);
    console.log(hits.split('\n').map((l) => `  ${l}`).join('\n'));
  } else {
    console.log(`\n✓ grep toàn repo: không còn "${oldId}" (ngoài .studio/ nếu có).`);
  }
} catch (error) {
  if (error.status === 1) console.log(`\n✓ grep toàn repo: không còn "${oldId}".`);
  else console.warn(`⚠ không grep lại được: ${error.message}`);
}
