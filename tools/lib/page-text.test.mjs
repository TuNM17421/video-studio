/** npm run test:tools — bóc chữ trang gốc và so trích đoạn: nới đúng chỗ trình bày, không nới chỗ lời. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeEntities, normalize, pageText, quoteInText, stripMarkdown } from './page-text.mjs';

const HTML = `<!doctype html><html><head><title>T</title><style>p{color:red}</style>
<script>var s = "Một câu nằm trong script không được tính";</script></head>
<body><nav>Trang chủ</nav><h1>Token là gì</h1>
<p>Mô hình tính phí theo <strong>token</strong>, không theo từ.</p><p>Một token&nbsp;tiếng Anh ≈ 4&nbsp;ký tự &mdash; con số “gần đúng”.</p>
<!-- chú thích --><ul><li>Mục một</li><li>Mục hai</li></ul></body></html>`;

test('bóc chữ, bỏ script/style/chú thích, giữ ranh giới đoạn', () => {
  const text = pageText(HTML);
  assert.ok(text.includes('Mô hình tính phí theo token, không theo từ.'));
  assert.ok(!text.includes('script không được tính'));
  assert.ok(!text.includes('color:red'));
  assert.ok(!text.includes('chú thích'));
  // hai mục danh sách không dính thành "Mục mộtMục hai"
  assert.ok(text.includes('Mục một\nMục hai'));
});

test('giải mã thực thể tên và số', () => {
  assert.equal(decodeEntities('a&nbsp;b &amp; &#8212; &#x201C;x&#x201D; &unknown;'), 'a b & — “x” &unknown;');
});

test('khớp dù khác nháy, gạch ngang, khoảng trắng, hoa thường', () => {
  const text = pageText(HTML);
  assert.ok(quoteInText('một token tiếng anh ≈ 4 ký tự - con số "gần đúng"', text));
});

test('gỡ dấu markdown agent chép kèm', () => {
  assert.equal(stripMarkdown('Mô hình tính phí theo **token**, xem [bảng giá](https://x.dev).'), 'Mô hình tính phí theo token, xem bảng giá.');
  assert.ok(quoteInText('Mô hình tính phí theo **token**, không theo từ.', pageText(HTML)));
});

test('một con số bị sửa thì không khớp', () => {
  assert.equal(quoteInText('Một token tiếng Anh ≈ 5 ký tự', pageText(HTML)), false);
});

test('chuỗi rỗng không bao giờ "khớp"', () => {
  assert.equal(quoteInText('   ', 'bất kỳ'), false);
  assert.equal(normalize(null), '');
});

test('gỡ in nghiêng markdown nhưng giữ gạch dưới trong tên hàm', () => {
  assert.equal(stripMarkdown('a granularity called a _token_. Returns tokens in _the input only_.'), 'a granularity called a token. Returns tokens in the input only.');
  assert.equal(stripMarkdown('Call count_tokens with *care*'), 'Call count_tokens with care');
});
