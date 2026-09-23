/**
 * Slide của giảng viên → thứ agent đọc được. Node thuần, không thư viện: dùng được cả khi Studio nạp slide
 * lẫn khi agent chạy `/research-script` không qua Studio.
 *
 * PPTX: bóc chữ và ghi chú của từng slide ra Markdown — hình trong PPTX không đi theo được, và người dùng được
 * nói rõ điều đó. PDF: chữ từng trang do PDF.js bóc (`pdfPages` trong pdf-text.mjs); trang ít chữ thì agent mở
 * đúng trang đó trong PDF để xem hình. Có chữ từng trang thì **code dựng dàn ý** (`outlineFromSlides`), không
 * để agent chép lại — rẻ hơn, và số trang đúng tuyệt đối.
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

/** Trang PDF thành slide: mỗi dòng chữ là một đoạn. */
export function pdfSlides(pages) {
  return pages.map((text, i) => ({
    slide: i + 1,
    paragraphs: String(text ?? '').split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean),
    notes: [],
  }));
}

/**
 * Bỏ dòng lặp lại ở nhiều trang — chân trang "Giảng viên (VinUni) AICB ∙ Ngày 1 02/04/2026 39 / 67", tên khoá học ở
 * đầu trang. Không phải nội dung, mà chép vào dàn ý thì mỗi prompt viết kịch bản gánh thêm vài chục dòng giống nhau.
 * Lặp ở từ 30% số trang (ít nhất 3 trang) mới tính. Dòng giống hệt nhau thì bỏ; dòng chỉ khác chữ số (số trang đổi từng
 * trang) thì phải dài — chân trang thật dài cỡ 50 ký tự, còn "Bước 1", "Bước 2" là tiêu đề đánh số, phải giữ.
 */
export function stripRepeated(slides) {
  const exact = (p) => p.toLowerCase().replace(/\s+/g, ' ').trim();
  const shape = (p) => exact(p).replace(/\d+/g, '#');
  const tally = (key) => {
    const count = new Map();
    for (const s of slides) for (const k of new Set(s.paragraphs.map(key))) count.set(k, (count.get(k) ?? 0) + 1);
    return count;
  };
  const exactCount = tally(exact);
  const shapeCount = tally(shape);
  const limit = Math.max(3, Math.ceil(slides.length * 0.3));
  const boilerplate = (p) => /^\d+\s*\/\s*\d+$/.test(p.trim())
    || (exactCount.get(exact(p)) ?? 0) >= limit
    || (p.length >= 20 && (shapeCount.get(shape(p)) ?? 0) >= limit);
  return slides.map((s) => ({ ...s, paragraphs: s.paragraphs.filter((p) => !boilerplate(p)) }));
}

/** Slide gần như không có chữ — có thể mang nội dung bằng hình, agent nên mở trang đó mà xem. */
export const isThin = (s) => s.paragraphs.join(' ').replace(/\s+/g, '').length < 40;

const SKIP_HEADING = /^(hỏi\s*(&|và)\s*đáp|q\s*&\s*a|questions?\b|(xin\s+)?cảm ơn|thank(s| you)|mục lục|nội dung bài học|agenda)/i;
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * Dàn ý do code dựng từ chữ từng slide: tiêu đề là dòng đầu, ý là các dòng sau (kèm ghi chú của giảng viên). `skip`
 * cho trang hỏi đáp/cảm ơn/mục lục, cộng các trang agent bóc tách liệt kê trong `claims.json → skip`.
 */
export function outlineFromSlides(title, slides, skip = []) {
  const skipped = new Set(skip);
  return {
    title: String(title ?? ''),
    pages: slides.length,
    source: 'code',
    outline: slides.map((s) => {
      // Tiêu đề là dòng đầu có chữ thật — slide mở bằng một dấu "?" to thì dòng đó không phải tiêu đề.
      const at = Math.max(0, s.paragraphs.findIndex((p) => (p.match(/\p{L}/gu) ?? []).length >= 3));
      const first = s.paragraphs[at] ?? '';
      const rest = s.paragraphs.filter((_, i) => i !== at);
      const points = [...rest.slice(0, 12).map((p) => clip(p, 240)), ...(s.notes?.length ? [clip(`Ghi chú: ${s.notes.join(' ')}`, 400)] : [])];
      // Trang cảm ơn hay kèm email, trang mục lục kèm vài mục — vẫn là trang bỏ qua; slide nội dung thì dài hơn thế.
      const auto = SKIP_HEADING.test(first) && s.paragraphs.length <= 8;
      return { slide: s.slide, heading: clip(first, 120), points, ...(auto || skipped.has(s.slide) ? { skip: true } : {}) };
    }),
  };
}

/** Chữ bóc được → `slide.md` cho agent đọc. */
export function slidesMarkdown(name, slides, source = 'PPTX') {
  const pdf = source === 'PDF';
  const lines = [`# ${name}`, '', pdf
    ? `${slides.length} trang · chữ bóc từ PDF (bỏ chân trang lặp lại). Hình và sơ đồ không đi theo — trang ít chữ ghi rõ để mở đúng trang đó trong input/slide.pdf.`
    : `${slides.length} slide · chữ bóc từ PPTX (hình và sơ đồ không đi theo).`, ''];
  for (const s of slides) {
    lines.push(`## Slide ${s.slide}`, '');
    if (s.paragraphs.length) lines.push(...s.paragraphs.map((p) => `- ${p}`));
    if (pdf && isThin(s)) lines.push(`_(ít chữ — có thể chỉ có hình: Read trang ${s.slide} của input/slide.pdf nếu cần)_`);
    else if (!s.paragraphs.length) lines.push('_(slide không có chữ — có thể chỉ có hình)_');
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
