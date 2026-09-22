import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkUrl, downloadImage, fetchImage, imageSize, isInternalHost, isPrivateAddress, sniffType } from './image-fetch.mjs';

/** Header PNG đủ để đọc kích thước (chữ ký + IHDR). */
function png(width, height) {
  const buf = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write('IHDR', 12, 'latin1');
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}
/** SOI, một đoạn APP0 để phải nhảy qua, rồi SOF0 mang kích thước. */
function jpeg(width, height) {
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  const sof = Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0, 0, 0, 0, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof, Buffer.from([0xff, 0xd9])]);
}
function webpX(width, height) {
  const b = Buffer.alloc(30);
  b.write('RIFF', 0, 'latin1');
  b.writeUInt32LE(22, 4);
  b.write('WEBP', 8, 'latin1');
  b.write('VP8X', 12, 'latin1');
  b.writeUIntLE(width - 1, 24, 3);
  b.writeUIntLE(height - 1, 27, 3);
  return b;
}

const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];
const response = (body, { status = 200, headers = {} } = {}) => new Response(body, { status, headers });

test('đọc kích thước từ header PNG, JPEG, WebP; nhận loại bằng byte chứ không bằng đuôi', () => {
  assert.deepEqual(imageSize(png(1200, 800)), { width: 1200, height: 800 });
  assert.deepEqual(imageSize(jpeg(1920, 1080)), { width: 1920, height: 1080 });
  assert.deepEqual(imageSize(webpX(3000, 2000)), { width: 3000, height: 2000 });
  assert.equal(sniffType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
  assert.equal(sniffType(Buffer.from('<!doctype html><html></html>')), null);
});

test('địa chỉ nội bộ bị chặn, cả IP viết kiểu lạ và IPv6', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ['8.8.8.8', '93.184.216.34', '2606:4700::1111']) assert.equal(isPrivateAddress(ip), false, ip);
  for (const url of ['https://localhost/x.jpg', 'https://127.0.0.1/x.jpg', 'https://[::1]/x.jpg', 'https://2130706433/x.jpg', 'https://0x7f000001/', 'https://printer.local/a', 'nonsense']) {
    assert.equal(isInternalHost(url), true, url);
  }
  assert.equal(isInternalHost('https://upload.wikimedia.org/a.jpg'), false);
});

test('checkUrl: chỉ https, và tên miền trỏ về IP nội bộ cũng bị chặn', async () => {
  assert.match(await checkUrl('http://example.com/a.jpg', { lookup: publicLookup }), /https/);
  assert.equal(await checkUrl('https://example.com/a.jpg', { lookup: publicLookup }), null);
  assert.match(await checkUrl('https://evil.example/a.jpg', { lookup: async () => [{ address: '127.0.0.1', family: 4 }] }), /nội bộ/);
  assert.match(await checkUrl('https://user:pw@example.com/a.jpg', { lookup: publicLookup }), /đăng nhập/);
});

test('fetchImage: đi theo chuyển hướng bằng tay và kiểm lại từng bước', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push(url);
    assert.equal(init.redirect, 'manual');
    if (url === 'https://a.example/x') return response(null, { status: 302, headers: { location: 'https://b.example/y.png' } });
    return response(png(900, 600), { headers: { 'content-type': 'image/png' } });
  };
  const r = await fetchImage('https://a.example/x', { fetchImpl, lookup: publicLookup });
  assert.equal(r.ok, true);
  assert.deepEqual([r.type, r.width, r.height, r.finalUrl], ['image/png', 900, 600, 'https://b.example/y.png']);
  assert.deepEqual(calls, ['https://a.example/x', 'https://b.example/y.png']);

  const toInternal = async () => response(null, { status: 301, headers: { location: 'https://127.0.0.1/admin' } });
  const bad = await fetchImage('https://a.example/x', { fetchImpl: toInternal, lookup: publicLookup });
  assert.equal(bad.ok, false);
  assert.match(bad.error, /nội bộ/);

  const loop = async (url) => response(null, { status: 302, headers: { location: `${url}x` } });
  assert.match((await fetchImage('https://a.example/', { fetchImpl: loop, lookup: publicLookup })).error, /chuyển hướng/);
});

test('fetchImage: loại file không phải ảnh dù header khai là ảnh, và dừng khi quá dung lượng', async () => {
  const svg = async () => response('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>', { headers: { 'content-type': 'image/jpeg' } });
  assert.match((await fetchImage('https://a.example/x.jpg', { fetchImpl: svg, lookup: publicLookup })).error, /không phải ảnh/);
  const big = async () => response(Buffer.concat([png(10, 10), Buffer.alloc(2000)]), { headers: { 'content-type': 'image/png' } });
  assert.match((await fetchImage('https://a.example/x.png', { fetchImpl: big, lookup: publicLookup, maxBytes: 1000 })).error, /quá lớn/);
  const declared = async () => response(png(10, 10), { headers: { 'content-length': '999999999' } });
  assert.match((await fetchImage('https://a.example/x.png', { fetchImpl: declared, lookup: publicLookup, maxBytes: 1000 })).error, /quá lớn/);
  const http404 = async () => response('nope', { status: 404 });
  assert.equal((await fetchImage('https://a.example/x.png', { fetchImpl: http404, lookup: publicLookup })).error, 'HTTP 404');
  const boom = async () => {
    throw new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } });
  };
  assert.match((await fetchImage('https://a.example/x.png', { fetchImpl: boom, lookup: publicLookup })).error, /ECONNRESET/);
});

test('downloadImage: đuôi theo loại ảnh thật, xoá bản cũ khác đuôi', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-fetch-'));
  const base = path.join(dir, 'img', 's3');
  fs.mkdirSync(path.dirname(base), { recursive: true });
  fs.writeFileSync(`${base}.png`, 'cũ');
  const fetchImpl = async () => response(jpeg(1600, 1200), { headers: { 'content-type': 'image/png' } });
  const r = await downloadImage('https://a.example/x.png', base, { fetchImpl, lookup: publicLookup });
  assert.equal(r.ok, true);
  assert.equal(r.file, `${base}.jpg`);
  assert.equal(r.buf, undefined);
  assert.deepEqual(fs.readdirSync(path.dirname(base)), ['s3.jpg']);
});
