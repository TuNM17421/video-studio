/**
 * Slide của giảng viên → thứ agent đọc được. Node thuần, không thư viện: dùng được cả khi Studio nạp slide
 * lẫn khi agent chạy `/research-script` không qua Studio.
 *
 * PDF để nguyên: công cụ Read của agent đọc thẳng PDF, cả chữ lẫn hình và sơ đồ. PPTX thì không mở được,
 * nên bóc chữ và ghi chú của từng slide ra Markdown — hình trong PPTX không đi theo được, và người dùng
 * được nói rõ điều đó.
 */
import { inflateRawSync } from 'node:zlib';

export const MAX_SLIDE_BYTES = 50 * 1024 * 1024;
/** Một file XML trong PPTX giải nén ra không quá chừng này — chặn zip bomb (vài KB nén thành vài GB). */
const MAX_UNZIPPED = 64 * 1024 * 1024;

// ── zip tối giản: đủ cho PPTX (stored hoặc deflate, không zip64) ─────────────────────

/** @returns {Map<string, () => Buffer>} tên file → hàm đọc nội dung (chỉ giải nén khi cần) */
export function unzip(bytes) {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error('không giải nén được');
  const count = buf.readUInt16LE(eocd + 10);
  let at = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let n = 0; n < count; n++) {
    if (at + 46 > buf.length || buf.readUInt32LE(at) !== 0x02014b50) throw new Error('mục lục zip hỏng');
    const method = buf.readUInt16LE(at + 10);
    const size = buf.readUInt32LE(at + 20);
    const nameLen = buf.readUInt16LE(at + 28);
    const extraLen = buf.readUInt16LE(at + 30);
    const commentLen = buf.readUInt16LE(at + 32);
    const local = buf.readUInt32LE(at + 42);
    const name = buf.toString('utf8', at + 46, at + 46 + nameLen);
    at += 46 + nameLen + extraLen + commentLen;
    files.set(name, () => {
      if (buf.readUInt32LE(local) !== 0x04034b50) throw new Error(`zip hỏng ở ${name}`);
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      if (method === 0) return data;
      if (method === 8) return inflateRawSync(data, { maxOutputLength: MAX_UNZIPPED });
      throw new Error(`kiểu nén ${method} chưa hỗ trợ`);
    });
  }
  return files;
}

// ── PPTX ──────────────────────────────────────────────────────────────────────────

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e) =>
    e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e.toLowerCase()]);

/**
 * Mọi đoạn `<tag …>…</tag>` trong `xml`, tìm bằng indexOf — tuyến tính. Regex lười `[\s\S]*?<\/a:p>` bậc hai
 * trên một PPTX dựng cố ý với nhiều thẻ mở không đóng (đo thật: 100 KB đủ làm treo lượt tạo).
 */
function blocks(xml, tag) {
  const out = [];
  const close = `</${tag}>`;
  for (let at = xml.indexOf(`<${tag}`); at !== -1;) {
    const next = xml[at + tag.length + 1];
    // <a:pPr> không phải <a:p>; sau tên thẻ có thể là dấu cách, tab, xuống dòng, '>' hay '/'.
    if (!/[\s>/]/.test(next ?? '')) { at = xml.indexOf(`<${tag}`, at + 1); continue; }
    const gt = xml.indexOf('>', at);
    if (gt === -1) break;
    if (xml[gt - 1] === '/') { at = xml.indexOf(`<${tag}`, gt); continue; } // <a:p/> rỗng — đi tiếp từ sau nó
    const end = xml.indexOf(close, gt);
    if (end === -1) break;
    out.push(xml.slice(gt + 1, end));
    at = xml.indexOf(`<${tag}`, end);
  }
  return out;
}

/** Mỗi `<a:p>` là một đoạn; chữ nằm rải trong các `<a:t>` (một từ in đậm là một run riêng). */
function paragraphs(xml) {
  const out = [];
  for (const body of blocks(xml, 'a:p')) {
    const text = blocks(body, 'a:t').map(decode).join('').replace(/\s+/g, ' ').trim();
    if (text) out.push(text);
  }
  return out;
}

/** `Id` → `Target` của một file .rels. */
function rels(xml) {
  const map = new Map();
  if (!xml) return map;
  for (const [tag] of xml.matchAll(/<Relationship\b[^<>]*>/g)) {
    const id = /\bId="([^"]+)"/.exec(tag)?.[1];
    const target = /\bTarget="([^"]+)"/.exec(tag)?.[1];
    if (id && target) map.set(id, target);
  }
  return map;
}

/** Đường dẫn tương đối trong .rels → đường dẫn đầy đủ trong gói zip. */
function resolve(base, target) {
  const out = [];
  for (const p of [...base.split('/').slice(0, -1), ...target.split('/')]) {
    if (p === '..') out.pop();
    else if (p && p !== '.') out.push(p);
  }
  return out.join('/');
}

/**
 * Chữ của từng slide, theo thứ tự trình chiếu.
 *
 * Thứ tự lấy từ `presentation.xml` chứ không từ tên file: kéo slide 7 lên đầu trong PowerPoint không đổi
 * tên `slide7.xml`, chỉ đổi danh sách `sldIdLst`. Sắp theo tên file thì bài giảng bị đảo mạch.
 *
 * @returns {{ slide: number, paragraphs: string[], notes: string[] }[]}
 */
export function pptxSlides(bytes) {
  let files;
  try { files = unzip(bytes); } catch { throw new Error('File không phải PPTX hợp lệ (không giải nén được).'); }
  const read = (name) => (files.has(name) ? files.get(name)().toString('utf8') : undefined);
  const presentation = read('ppt/presentation.xml');
  if (!presentation) throw new Error('File không phải PPTX hợp lệ (thiếu ppt/presentation.xml).');

  const presRels = rels(read('ppt/_rels/presentation.xml.rels'));
  let order = [...presentation.matchAll(/<p:sldId\b[^<>]*\br:id="([^"<>]+)"/g)]
    .map((m) => presRels.get(m[1]))
    .filter(Boolean)
    .map((t) => resolve('ppt/presentation.xml', t))
    .filter((name) => files.has(name));
  if (!order.length) {
    order = [...files.keys()]
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => Number(/(\d+)\.xml$/.exec(a)[1]) - Number(/(\d+)\.xml$/.exec(b)[1]));
  }
  return order.map((name, i) => {
    const slideRels = rels(read(name.replace(/slides\/(slide\d+\.xml)$/, 'slides/_rels/$1.rels')));
    const notesTarget = [...slideRels.values()].find((t) => /notesSlide\d+\.xml$/.test(t));
    const notesXml = notesTarget ? read(resolve(name, notesTarget)) : undefined;
    return {
      slide: i + 1,
      paragraphs: paragraphs(read(name) ?? ''),
      // Trang ghi chú mang cả số trang như một đoạn chữ riêng; một dòng chỉ có số thì không phải lời giảng.
      notes: notesXml ? paragraphs(notesXml).filter((p) => !/^\d+$/.test(p)) : [],
    };
  });
}

/** Chữ bóc được → `slide.md` cho agent đọc. */
export function slidesMarkdown(name, slides) {
  const lines = [`# ${name}`, '', `${slides.length} slide · chữ bóc từ PPTX (hình và sơ đồ không đi theo).`, ''];
  for (const s of slides) {
    lines.push(`## Slide ${s.slide}`, '');
    if (s.paragraphs.length) lines.push(...s.paragraphs.map((p) => `- ${p}`));
    else lines.push('_(slide không có chữ — có thể chỉ có hình)_');
    if (s.notes.length) lines.push('', `> Ghi chú của giảng viên: ${s.notes.join(' ')}`);
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Số trang của một PDF, đếm các đối tượng `/Type /Page` — không cần thư viện PDF nào.
 *
 * `null` khi không đếm được: PDF từ 1.5 có thể nén các đối tượng trang vào object stream. Agent vẫn đọc
 * được; nó chỉ không biết trước phải đọc bao nhiêu đợt.
 */
export function pdfPageCount(bytes) {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (buf.toString('latin1', 0, 5) !== '%PDF-') throw new Error('File không phải PDF hợp lệ.');
  const count = (buf.toString('latin1').match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
  return count > 0 ? count : null;
}
