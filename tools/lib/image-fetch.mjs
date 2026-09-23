/**
 * Tải một file ảnh về máy, an toàn.
 *
 * URL ảnh đến từ kết quả của API tìm ảnh — Openverse trỏ thẳng về máy chủ của nơi đăng gốc (Flickr, bảo
 * tàng…), tức là một host bất kỳ trên mạng. Nên mỗi lần tải phải:
 * - chỉ nhận https, không nhận địa chỉ trong máy hay mạng nội bộ — kiểm cả tên miền lẫn IP nó phân giải ra,
 *   và kiểm lại ở **từng** bước chuyển hướng (chuyển hướng làm tay, không để fetch tự đi theo);
 * - dừng ngay khi quá dung lượng hoặc quá thời gian;
 * - nhận diện loại ảnh bằng chính các byte đầu file (JPEG/PNG/WebP), không tin header content-type — một
 *   trang HTML hay một SVG (có thể chứa script) khai là image/jpeg vẫn bị loại;
 * - ghi qua file tạm rồi rename, để một lần tải hỏng giữa chừng không để lại ảnh cụt.
 *
 * Phần chặn địa chỉ nội bộ nằm ở tools/lib/net-guard.mjs, dùng chung với tools/lib/fetch-page.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { checkHost, isInternalHost, isPrivateAddress } from './net-guard.mjs';

export { isInternalHost, isPrivateAddress };

export const TIMEOUT_MS = 20000;
/** Ảnh gốc để dựng video. Thumbnail để xem trước dùng trần nhỏ hơn (`THUMB_MAX_BYTES`). */
export const MAX_BYTES = 15 * 1024 * 1024;
export const THUMB_MAX_BYTES = 5 * 1024 * 1024;
export const MAX_REDIRECTS = 3;
export const USER_AGENT = 'VinUni-VideoStudio/0.1 (https://github.com/TuNM17421/video-studio; lesson video tooling)';

export const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/**
 * Kiểm một URL trước khi gọi: https, không nội bộ, và mọi IP tên miền phân giải ra đều công khai
 * (chặn tên miền công khai trỏ về 127.0.0.1). `lookup` thay được trong test.
 */
export async function checkUrl(url, { lookup } = {}) {
  const bad = await checkHost(url, { protocols: ['https:'], ...(lookup ? { lookup } : {}) });
  if (!bad) return null;
  if (bad.kind === 'internal') return `${bad.message} — không tải`;
  return /^chỉ nhận/.test(bad.message) ? 'chỉ tải ảnh qua https' : bad.message;
}

/** Loại ảnh nhận ra từ các byte đầu file, hoặc null. */
export function sniffType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/** Kích thước ảnh đọc từ header file — không cần thư viện ảnh. Trả `{ width, height }` hoặc null. */
export function imageSize(buf) {
  const type = sniffType(buf);
  if (type === 'image/png') {
    if (buf.length < 24 || buf.toString('latin1', 12, 16) !== 'IHDR') return null;
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (type === 'image/jpeg') {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker === 0xff) { i++; continue; }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const len = buf.readUInt16BE(i + 2);
      // SOF0–SOF15, trừ DHT (C4), JPG (C8), DAC (CC)
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
      if (len < 2) return null;
      i += 2 + len;
    }
    return null;
  }
  if (type === 'image/webp') {
    const chunk = buf.toString('latin1', 12, 16);
    if (chunk === 'VP8 ' && buf.length >= 30) return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L' && buf.length >= 25) {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X' && buf.length >= 30) return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  }
  return null;
}

/** Đọc thân trả về, dừng ngay khi vượt `max` byte. */
async function readCapped(res, max) {
  const declared = Number(res.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!res.body) {
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > max ? null : buf;
  }
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

/**
 * Tải một ảnh vào bộ nhớ. Trả `{ ok: true, buf, type, ext, width, height, finalUrl }` hoặc
 * `{ ok: false, error }` — không bao giờ ném, để một ảnh hỏng không làm hỏng cả lượt tìm.
 */
export async function fetchImage(url, { maxBytes = MAX_BYTES, fetchImpl = fetch, lookup, timeoutMs = TIMEOUT_MS } = {}) {
  let current = String(url ?? '');
  try {
    for (let hop = 0; ; hop++) {
      const bad = await checkUrl(current, lookup ? { lookup } : undefined);
      if (bad) return { ok: false, error: bad, url: current };
      const res = await fetchImpl(current, {
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'User-Agent': USER_AGENT, Accept: 'image/jpeg,image/png,image/webp;q=0.9,*/*;q=0.1' },
      });
      if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get('location');
        if (!next) return { ok: false, error: `HTTP ${res.status} không có Location`, url: current };
        if (hop >= MAX_REDIRECTS) return { ok: false, error: `quá ${MAX_REDIRECTS} lần chuyển hướng`, url: current };
        current = new URL(next, current).href;
        continue;
      }
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, url: current };
      const buf = await readCapped(res, maxBytes);
      if (!buf) return { ok: false, error: `ảnh quá lớn (trên ${Math.round(maxBytes / 1024 / 1024)} MB)`, url: current };
      const type = sniffType(buf);
      if (!type) return { ok: false, error: `không phải ảnh JPEG/PNG/WebP (content-type: ${res.headers.get('content-type') || 'không rõ'})`, url: current };
      const size = imageSize(buf);
      if (!size) return { ok: false, error: 'không đọc được kích thước ảnh', url: current };
      return { ok: true, buf, type, ext: EXT[type], ...size, finalUrl: current };
    }
  } catch (error) {
    const reason = error?.name === 'TimeoutError' ? `quá ${timeoutMs / 1000} giây không trả lời` : error?.cause?.code ?? error?.message ?? String(error);
    return { ok: false, error: `không tải được: ${reason}`, url: current };
  }
}

/** Ghi qua file tạm cùng thư mục rồi rename — người đọc không bao giờ thấy file dở. */
export function writeFileAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, data);
  try {
    fs.renameSync(tmp, file);
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    throw e;
  }
}

/**
 * Tải một ảnh và lưu thành `<base>.<ext>` (đuôi theo loại ảnh thật). Xoá các bản cũ của cùng `base` mang đuôi
 * khác. Trả kết quả của `fetchImage` kèm `file` khi thành công (không kèm `buf`).
 */
export async function downloadImage(url, base, opts = {}) {
  const r = await fetchImage(url, opts);
  if (!r.ok) return r;
  const file = `${base}.${r.ext}`;
  writeFileAtomic(file, r.buf);
  for (const ext of Object.values(EXT)) if (ext !== r.ext) fs.rmSync(`${base}.${ext}`, { force: true });
  const { buf, ...rest } = r;
  return { ...rest, file, bytes: buf.length };
}
