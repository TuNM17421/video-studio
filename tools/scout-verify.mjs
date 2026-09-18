#!/usr/bin/env node
/**
 * Soát một lượt "đóng gói kịch bản": mỗi câu có truy được về nguồn không, và mỗi trích đoạn có thật nằm
 * trong trang đã tải về không.
 *
 *   node tools/scout-verify.mjs scout/<slug> [--min 2] [--json]
 *
 * Lượt từ slide còn được soát thêm: nguồn độc lập (khác nơi xuất bản), nguồn đủ mới cho mục "có thể đã
 * cũ", kịch bản phủ đủ slide, và kết luận từng mục chỉ dựa trên nguồn đã tải và có trích đoạn soát được.
 *
 * Không gọi mạng, không cần khoá API — chỉ đọc `nguon.json`, `sources/` và `kich-ban.md` trong thư mục đó.
 * Chạy được cả khi đã ngắt mạng, và chạy lại bao nhiêu lần cũng ra cùng kết quả.
 */
import fs from 'node:fs';
import path from 'node:path';
import { checkDossier } from './lib/scout-verify.mjs';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const json = args.includes('--json');
const minArg = args.find((a) => a.startsWith('--min'));
const minSources = Math.max(1, Number(minArg?.split('=')[1] ?? args[args.indexOf(minArg) + 1] ?? 2) || 2);

function die(message) {
  if (json) console.log(JSON.stringify({ ok: false, problems: [message] }));
  else console.error(message);
  process.exit(1);
}

if (!dir) die('Thiếu thư mục. Ví dụ: node tools/scout-verify.mjs scout/prompt-engineering');
const dossierFile = path.join(dir, 'nguon.json');
if (!fs.existsSync(dossierFile)) die(`Không có ${dossierFile}.`);

let dossier;
try {
  dossier = JSON.parse(fs.readFileSync(dossierFile, 'utf8'));
} catch (error) {
  die(`${dossierFile} không phải JSON hợp lệ: ${error.message}`);
}

/** `### Câu 7` trong kịch bản. Bỏ trống khi kịch bản chưa viết — khi đó chỉ soát phần trích dẫn. */
function cueNumbers() {
  const file = path.join(dir, 'kich-ban.md');
  if (!fs.existsSync(file)) return [];
  const found = [...fs.readFileSync(file, 'utf8').matchAll(/^#{2,4}\s*C[âa]u\s+(\d+)/gim)];
  return found.map((m) => Number(m[1]));
}

const readJson = (file) => {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null; } catch { return null; }
};

/**
 * Lượt từ slide có thêm dàn ý (muc-research.json), các mục người dùng đã duyệt (run.json) và kết luận từng
 * mục (items/<mã>/ket-luan.json) — đủ để soát nguồn độc lập, nguồn đủ mới, độ phủ slide và kết luận.
 * Không có muc-research.json thì là lượt chủ đề: chỉ soát như cũ.
 */
function slideRun() {
  const extraction = readJson(path.join(dir, 'muc-research.json'));
  if (!extraction) return undefined;
  const run = readJson(path.join(dir, 'run.json'));
  const items = Array.isArray(run?.items) ? run.items : Array.isArray(extraction.items) ? extraction.items : [];
  const conclusions = Object.fromEntries(items.map((it) => [it.id, readJson(path.join(dir, 'items', String(it.id), 'ket-luan.json'))]).filter(([, c]) => c));
  return {
    outline: Array.isArray(extraction.outline) ? extraction.outline : [],
    items,
    conclusions,
    referenceDate: run?.startedAt ? new Date(run.startedAt).toISOString() : undefined,
  };
}

const report = checkDossier({
  dossier,
  minSources,
  cueNumbers: cueNumbers(),
  slide: slideRun(),
  // Đường dẫn trong hồ sơ là tương đối với thư mục lượt chạy, và phải nằm TRONG nó: một `file` trỏ ra
  // ngoài bằng `../` sẽ cho agent tự chọn văn bản để được đối chiếu, tức là tự chấm bài của mình.
  readSource(relative) {
    const target = path.resolve(dir, relative);
    const root = path.resolve(dir);
    if (target !== root && !target.startsWith(root + path.sep)) return null;
    return fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
  },
});

if (json) {
  console.log(JSON.stringify(report));
  process.exit(report.ok ? 0 : 1);
}

const { sources, quotes, cues } = report;
console.log(`Nguồn:      ${sources.total} (${sources.fetched} đã tải trang, ${sources.unfetched} chưa)`);
console.log(`Trích đoạn: ${quotes.ok}/${quotes.total} khớp trang đã tải`);
console.log(`Câu:        ${cues.length}${cues.length ? ` · ${cues.filter((c) => c.level === 'ok').length} đủ nguồn` : ' (kịch bản chưa viết)'}`);

for (const p of quotes.problems) {
  console.log(`  ✗ ${p.source}: ${p.reason}`);
  console.log(`    “${p.quote.slice(0, 120)}${p.quote.length > 120 ? '…' : ''}”`);
}
for (const c of cues) {
  if (c.level === 'ok') continue;
  console.log(`  ${c.level === 'error' ? '✗' : '!'} Câu ${c.n}: ${c.note}`);
}
if (report.slide) {
  const { independence, recency, coverage, findings } = report.slide;
  console.log(`Độc lập:    ${independence.length ? `${independence.length} câu chưa đủ nơi xuất bản khác nhau` : 'đạt'}`);
  console.log(`Độ mới:     ${recency.length ? recency.map((r) => `${r.item} (mới nhất ${r.newest ?? 'không ghi ngày'})`).join(', ') : 'đạt'}`);
  console.log(`Phủ slide:  ${coverage.covered}/${coverage.slides}${coverage.missing.length ? ` · thiếu slide ${coverage.missing.join(', ')}` : ''}`);
  for (const f of findings) console.log(`  ✗ ${f.item}: ${f.problems.join('; ')}`);
}

console.log(report.ok ? '\nĐạt: mọi câu truy được về nguồn, mọi trích đoạn khớp trang đã tải.' : `\nChưa đạt:\n- ${report.problems.join('\n- ')}`);
process.exit(report.ok ? 0 : 1);
