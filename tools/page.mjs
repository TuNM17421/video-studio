#!/usr/bin/env node
/**
 * Agent đọc một trang web qua đây thay vì đọc cả trang — dùng được với mọi agent (Claude, Codex,
 * Antigravity) vì chỉ là một lệnh shell.
 *
 *   node tools/page.mjs research/<rid> <url> --find "context window|128,000|token"
 *   node tools/page.mjs research/<rid> <url>            (không --find: phần đầu trang)
 *   node tools/page.mjs research/<rid> <url> --refresh  (tải lại trang đã lưu)
 *
 * Trang được Studio tự tải một lần và lưu vào `sources/<sid>/page.txt`; lần gọi sau chỉ đọc đĩa. Lệnh in
 * ra mã nguồn `sid`, tiêu đề, nơi xuất bản, ngày đăng, rồi **những đoạn nguyên văn** có từ khoá — agent
 * chép trích đoạn từ đó, nên phép soát ở chặng sau chắc chắn tìm thấy nó trong trang thật.
 *
 * Tiết kiệm token là mục đích chính: một trang 20 000 ký tự thành vài đoạn vài trăm ký tự.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fetchPage, isTransient } from './lib/fetch-page.mjs';
import { findPassages } from './lib/page-text.mjs';
import { pageTextOf, saveSource, sourceIdFor, sourceMeta } from './lib/research-store.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? '';
};
const positional = args.filter((a, i) => !a.startsWith('--') && !['--find', '--max'].includes(args[i - 1]));
const [dir, url] = positional;
const find = flag('--find');
const max = Math.min(12, Math.max(1, Number(flag('--max')) || 6));
const refresh = args.includes('--refresh');

/** Không có --find thì in chừng này ký tự đầu trang — đủ để biết trang nói về gì, không đủ để tốn token. */
const HEAD_CHARS = 1500;

function die(message, code = 1) {
  console.log(`✗ ${message}`);
  process.exit(code);
}

if (!dir || !url) die('Cách dùng: node tools/page.mjs research/<rid> <url> [--find "từ khoá|từ khoá khác"] [--max 6]');
if (!fs.existsSync(path.join(dir, 'state.json')) && !fs.existsSync(path.join(dir, 'claims.json'))) {
  die(`${dir} không phải thư mục của một lượt research.`);
}

let sid = sourceIdFor(dir, url);
let text = sid ? pageTextOf(dir, sid) : null;
// Lỗi tạm thời (quá giờ, 429, 5xx, mạng) thì gọi lại là tải lại; lỗi cố định (PDF, trang rỗng) thì nhớ suốt lượt.
if (!sid || refresh || isTransient(sourceMeta(dir, sid)) || (text === null && !sourceMeta(dir, sid)?.error)) {
  const result = await fetchPage(url);
  sid = saveSource(dir, url, result);
  text = result.text ?? null;
}
const meta = sourceMeta(dir, sid) ?? {};
const head = [
  `[${sid}] ${meta.title || '(không có tiêu đề)'}`,
  meta.publisher ? `nơi xuất bản: ${meta.publisher}` : null,
  `ngày đăng: ${meta.published ?? 'trang không ghi'}${meta.modified && meta.modified !== meta.published ? ` · sửa ${meta.modified}` : ''}`,
  meta.finalUrl && meta.finalUrl !== url ? `URL cuối: ${meta.finalUrl}` : null,
].filter(Boolean).join(' · ');

if (!meta.ok || !text) {
  console.log(head);
  console.log(`⚠ không đọc được trang: ${meta.error ?? 'không rõ lý do'}.`);
  console.log('Trích đoạn từ trang này sẽ không soát được — dùng nguồn khác nếu có. Nếu vẫn cần, ghi rõ trong finding.');
  process.exit(2);
}

console.log(`${head} · ${text.length} ký tự`);
if (find === null) {
  console.log('--- đầu trang ---');
  console.log(text.slice(0, HEAD_CHARS).trim());
  if (text.length > HEAD_CHARS) console.log(`… (còn ${text.length - HEAD_CHARS} ký tự — dùng --find "từ khoá" để lấy đúng đoạn cần)`);
  process.exit(0);
}

const terms = find.split('|').map((t) => t.trim()).filter(Boolean);
const passages = findPassages(text, terms, { max });
if (!passages.length) {
  console.log(`--- không đoạn nào chứa: ${terms.join(' | ')} ---`);
  console.log('--find không phân biệt hoa thường và không cần đúng dấu câu. Thử từ khoá khác (tiếng Anh nếu trang tiếng Anh), hoặc bỏ --find để xem đầu trang.');
  process.exit(0);
}
console.log(`--- ${passages.length} đoạn khớp: ${terms.join(' | ')} (chép trích đoạn nguyên văn từ đây, bỏ dấu … ở hai đầu) ---`);
for (const p of passages) console.log(`¶${p.line}: ${p.text}`);
