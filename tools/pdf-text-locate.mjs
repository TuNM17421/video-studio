#!/usr/bin/env node
/**
 * pdf-text-locate — tìm toạ độ chữ trong một trang PDF, in ra `--box` cho tools/slide-crop.mjs.
 *
 *   node tools/pdf-text-locate.mjs "<pdf>" <trang> "<cụm chữ>"
 *
 * Dùng `unpdf` (PDF.js) sẵn có của repo; `getTextContent()` trả toạ độ từng đoạn chữ. Độ mịn là ĐOẠN
 * chữ (text run) chứ không phải từng ký tự, nên box có thể rộng hơn cụm chữ nếu cả dòng nằm trong một
 * run — luôn xem lại ảnh crop trước khi dùng.
 */
import fs from 'node:fs';
import { getDocumentProxy } from 'unpdf';

function fail(msg) { console.error(`❌ ${msg}`); process.exit(1); }

const [pdfPath, pageArg, ...rest] = process.argv.slice(2);
const phrase = rest.join(' ').trim();
if (!pdfPath || !pageArg || !phrase) fail('Cách dùng: node tools/pdf-text-locate.mjs <pdf> <trang> "<cụm chữ>"');
const pageNum = Number(pageArg);
if (!Number.isInteger(pageNum)) fail(`Số trang phải là số nguyên, nhận: ${pageArg}`);
if (!fs.existsSync(pdfPath)) fail(`Không thấy file: ${pdfPath}`);

const pdf = await getDocumentProxy(new Uint8Array(fs.readFileSync(pdfPath)));
if (pageNum < 1 || pageNum > pdf.numPages) fail(`Trang ${pageNum} không hợp lệ — PDF có ${pdf.numPages} trang.`);
const page = await pdf.getPage(pageNum);
const { width: pw, height: ph } = page.getViewport({ scale: 1 });
const { items } = await page.getTextContent();

// Nối các run thành một chuỗi (mỗi run cách nhau một dấu cách), nhớ run nào chiếm đoạn ký tự nào.
const runs = [];
let text = '';
for (const it of items) {
  if (!it.str || !it.str.trim()) continue;
  const [, , , , e, f] = it.transform;
  const h = it.height || Math.abs(it.transform[3]) || 0;
  runs.push({ start: text.length, end: text.length + it.str.length, x0: e, x1: e + it.width, y0: f, y1: f + h });
  text += `${it.str} `;
}
const norm = []; let normText = '';
for (let i = 0; i < text.length; i++) {
  const c = text[i];
  if (/\s/.test(c) && normText.endsWith(' ')) continue;
  norm.push(i); normText += /\s/.test(c) ? ' ' : c.toLowerCase();
}

const box = (rs) => {
  const x0 = Math.min(...rs.map((r) => r.x0)), x1 = Math.max(...rs.map((r) => r.x1));
  const y0 = Math.min(...rs.map((r) => r.y0)), y1 = Math.max(...rs.map((r) => r.y1));
  // PDF gốc toạ độ ở góc dưới-trái; slide-crop dùng góc trên-trái.
  return { x0: Math.max(0, x0 / pw), y0: Math.max(0, (ph - y1) / ph), x1: Math.min(1, x1 / pw), y1: Math.min(1, (ph - y0) / ph), wpt: x1 - x0, hpt: y1 - y0 };
};
const fmt = (b) => `${b.x0.toFixed(3)},${b.y0.toFixed(3)},${b.x1.toFixed(3)},${b.y1.toFixed(3)}`;
const runsIn = (a, b) => runs.filter((r) => r.start < b && r.end > a);
const needle = phrase.toLowerCase().replace(/\s+/g, ' ');

const hits = [];
for (let at = normText.indexOf(needle); at !== -1; at = normText.indexOf(needle, at + needle.length)) {
  const rs = runsIn(norm[at], norm[at + needle.length - 1] + 1);
  if (rs.length) hits.push(box(rs));
}

if (hits.length) {
  console.log(`✓ Tìm thấy nguyên cụm "${phrase}" — ${hits.length} vị trí ở trang ${pageNum}:`);
  hits.forEach((b, i) => console.log(`  [${i + 1}] --box ${fmt(b)}   (${b.wpt.toFixed(0)}pt × ${b.hpt.toFixed(0)}pt)`));
  console.log(`\nDán giá trị --box vào:\n  node tools/slide-crop.mjs "${pdfPath}" ${pageNum} --box <giá trị> --out media/files/evidence/<tên>.png`);
  process.exit(0);
}

const words = needle.split(' ').filter(Boolean);
const found = [];
const wordRuns = [];
if (words.length > 1) {
  for (const w of words) {
    const at = normText.indexOf(w);
    if (at === -1) continue;
    found.push(w);
    wordRuns.push(...runsIn(norm[at], norm[at + w.length - 1] + 1));
  }
}
if (!wordRuns.length) fail(`Không tìm thấy "${phrase}" hay từng từ của nó ở trang ${pageNum}. Kiểm tra chính tả hoặc thử cụm ngắn hơn.`);
const b = box(wordRuns);
console.log(`⚠️  Không thấy nguyên cụm "${phrase}" ở trang ${pageNum}, nhưng thấy từng từ: ${found.join(', ')}`);
console.log(`    Box gộp từ vị trí các từ: --box ${fmt(b)}   (${b.wpt.toFixed(0)}pt × ${b.hpt.toFixed(0)}pt)`);
console.log(`\n⚠️  XEM ẢNH TRƯỚC KHI DÙNG: node tools/slide-crop.mjs "${pdfPath}" ${pageNum} --out /tmp/preview.png --dpi 200`);
