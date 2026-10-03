/**
 * Bỏ comment trước khi quét source. Báo giả này đã gặp BA lần: `verify` báo `non-deterministic
 * call` cho chữ `Date.now()` trong chú thích, `storyboard-gate` G3 tính một ví dụ `beatT(…)` trong
 * comment thành lời gọi thật (hai lần — retro F6, rồi lại khi soạn template 22/09).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { stripComments } from './source-scan.mjs';

test('bỏ comment dòng và comment khối, GIỮ code', () => {
  const src = "const a = 1; // Date.now() ở đây chỉ là chữ\n/* beatT('x','y') trong khối */\nbeatT('a','b');";
  const out = stripComments(src);
  assert.ok(!/Date\.now\(/.test(out), 'chữ trong comment dòng phải biến mất');
  assert.equal((out.match(/beatT\(/g) || []).length, 1, 'chỉ còn LỜI GỌI thật');
  assert.match(out, /beatT\('a','b'\)/);
});

test('KHÔNG cắt nhầm thứ nằm trong chuỗi', () => {
  const src = `const s = '// không phải comment';\nconst t = "/* cũng không */";\nconst u = \`http://x.dev\`;`;
  const out = stripComments(src);
  assert.match(out, /'\/\/ không phải comment'/);
  assert.match(out, /"\/\* cũng không \*\/"/);
  assert.match(out, /http:\/\/x\.dev/, 'dấu `//` trong URL không phải comment');
});

test('giữ nguyên độ dài và số dòng — thông báo lỗi còn chỉ đúng chỗ', () => {
  const src = "a();\n// ẩn\n/* nhiều\n   dòng */\nb();";
  const out = stripComments(src);
  assert.equal(out.length, src.length, 'thay bằng khoảng trắng, không xoá ký tự');
  assert.equal(out.split('\n').length, src.split('\n').length);
  assert.match(out, /^a\(\);/);
  assert.match(out, /b\(\);$/);
});

test('escape trong chuỗi không làm lệch trạng thái', () => {
  const src = "const s = 'a\\'b // vẫn trong chuỗi'; // đây mới là comment\nreal();";
  const out = stripComments(src);
  assert.match(out, /vẫn trong chuỗi/);
  assert.ok(!/đây mới là comment/.test(out));
  assert.match(out, /real\(\);/);
});

test('ĐỐI CHỨNG: hàm này không được nuốt code trông giống comment', () => {
  // Phép chia và regex literal là chỗ dễ nhầm nhất khi cắt comment bằng tay.
  const src = 'const r = a / b; const re = /x/g; run();';
  assert.equal(stripComments(src), src, 'không có comment nào → trả nguyên văn');
});
