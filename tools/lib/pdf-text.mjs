/**
 * Bóc chữ từ một file PDF, không thêm thư viện ngoài.
 *
 * Vì sao cần: nguồn **gốc** của những điều đáng kiểm hay là PDF — system card của nhà làm model, báo cáo của
 * cơ quan nhà nước, bài nghiên cứu. Khi `fetchPage` trả "trang là PDF — chưa đọc được chữ", finding không dùng
 * được nguồn đó, nên agent phải đi tìm một trang HTML thuật lại. Đo thật trên lượt `bai-2`: nguồn gốc s3
 * (cdn.openai.com/gpt-5-system-card.pdf) bị loại, và claim về tỉ lệ ảo giác kết thúc bằng hai blog tiếp thị
 * cùng dẫn lại đúng cái PDF đó. Tức là phép soát đang **thưởng cho nguồn kém**.
 *
 * Hai đường, theo thứ tự: `pdftotext` (poppler) nếu máy có — nó đọc đúng cả PDF dùng font CID; nếu không thì
 * tự giải nén các stream FlateDecode và lấy chữ của các toán tử Tj/TJ. Đường thứ hai không đọc được PDF mã hoá
 * glyph (Identity-H không kèm ToUnicode) và PDF quét ảnh, nên kết quả được **kiểm lại**: trông không ra chữ
 * thì trả null chứ không trả rác — một `page.txt` toàn ký tự lạ còn tệ hơn là nói thẳng "không đọc được", vì
 * mọi trích đoạn soát với nó đều trượt mà không ai hiểu vì sao.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

/** Chữ đọc được từ một PDF, hoặc null. */
export function pdfText(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.subarray(0, 5).toString('latin1') !== '%PDF-') return null;
  const viaTool = pdfToTextTool(buffer);
  if (viaTool) return viaTool;
  return looksLikeText(extractStreams(buffer));
}

/** poppler `pdftotext` nếu có trên PATH — đọc đúng hơn hẳn, kể cả font CID. */
function pdfToTextTool(buffer) {
  const tmp = path.join(os.tmpdir(), `vs-pdf-${process.pid}-${buffer.length}.pdf`);
  try {
    fs.writeFileSync(tmp, buffer);
    // `-layout` giữ cột và hàng bảng trên cùng một dòng — một hàng bảng phải là một dòng thì mới trích được.
    const out = execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', tmp, '-'], { maxBuffer: 64 * 1024 * 1024, timeout: 20_000 });
    return looksLikeText(clean(out.toString('utf8')));
  } catch {
    return null;
  } finally {
    try { fs.rmSync(tmp, { force: true }); } catch {}
  }
}

/** Giải nén mọi stream FlateDecode rồi lấy chữ của các toán tử vẽ chữ. */
function extractStreams(buffer) {
  const objects = parseObjects(buffer);
  const fonts = fontMaps(objects);
  const out = [];
  for (const obj of objects.values()) {
    if (!obj.data || !isContentStream(obj)) continue;
    out.push(textOps(obj.data, fonts));
  }
  return clean(out.join('\n'));
}

/**
 * Stream này có phải phần vẽ nội dung của một trang không.
 *
 * Không lọc kỹ thì **chương trình font nhúng** cũng lọt: nó là stream FlateDecode và trong đống byte của nó
 * có cả "TJ". Đo thật trên system card của OpenAI: chữ thật hết ở trang 6, phần sau là font Computer Modern
 * cùng giấy phép GPL của nó — 5,8% ký tự điều khiển, đủ để cả file bị coi là không đọc được.
 */
function isContentStream(obj) {
  if (/\/FontFile|\/Length1|\/Type\s*\/(Font|Metadata|XObject|ObjStm|XRef)|\/Subtype\s*\/(Image|Type1C|CIDFontType0C|TrueType|OpenType)/.test(obj.text)) return false;
  // `BT … ET` mở và đóng một khối chữ — font nhúng không có cặp này.
  return /\bBT\b/.test(obj.data) && /\bET\b/.test(obj.data);
}

/**
 * Mọi đối tượng của file, quét tuyến tính `N 0 obj … endobj` — không đọc bảng xref (hay hỏng ở file đã sửa
 * nhiều lần), và **mở cả object stream**: PDF từ 1.5 trở đi nén phần lớn đối tượng vào `/ObjStm`, nên quét
 * file thô chỉ thấy vài trăm đối tượng và không thấy `/ToUnicode` nào. Đo thật trên system card của OpenAI:
 * 464 đối tượng lộ thiên, 0 `/ToUnicode` — tất cả nằm trong 10 object stream.
 */
function parseObjects(buffer) {
  const src = buffer.toString('latin1');
  const objects = new Map();
  for (const m of src.matchAll(/(\d+)\s+\d+\s+obj\b/g)) {
    const stop = src.indexOf('endobj', m.index);
    const end = stop === -1 ? src.length : stop;
    objects.set(Number(m[1]), { text: src.slice(m.index, end), data: inflateStream(buffer, src, m.index, end) });
  }
  for (const obj of [...objects.values()]) {
    if (!obj.data || !/\/Type\s*\/ObjStm/.test(obj.text)) continue;
    for (const [num, text] of objectStream(obj)) {
      if (!objects.has(num)) objects.set(num, { text, data: null });
    }
  }
  return objects;
}

/** Thân stream FlateDecode của một đối tượng, đã giải nén; null nếu đối tượng không phải stream. */
function inflateStream(buffer, src, start, end) {
  if (!src.slice(start, Math.min(end, start + 1500)).includes('FlateDecode')) return null;
  const at = src.indexOf('stream', start);
  if (at === -1 || at > end) return null;
  let from = at + 6;
  if (src.charCodeAt(from) === 0x0d) from++;
  if (src.charCodeAt(from) === 0x0a) from++;
  const stop = src.indexOf('endstream', from);
  try {
    return zlib.inflateSync(buffer.subarray(from, stop === -1 ? end : stop)).toString('latin1');
  } catch {
    return null;
  }
}

/** Các đối tượng nằm trong một `/ObjStm`: đầu stream là N cặp "số hiệu, vị trí", rồi tới thân từng cái. */
function* objectStream(obj) {
  const n = Number(/\/N\s+(\d+)/.exec(obj.text)?.[1] ?? 0);
  const first = Number(/\/First\s+(\d+)/.exec(obj.text)?.[1] ?? 0);
  if (!n || !first) return;
  const header = obj.data.slice(0, first).trim().split(/\s+/).map(Number);
  for (let i = 0; i < n; i++) {
    const num = header[i * 2];
    const from = header[i * 2 + 1];
    const to = i + 1 < n ? header[i * 2 + 3] : obj.data.length - first;
    if (!Number.isFinite(num) || !Number.isFinite(from)) continue;
    yield [num, obj.data.slice(first + from, first + to)];
  }
}

/**
 * Bảng đổi mã ký tự → chữ cho từng font, theo tên font dùng trong content stream (`/F1 12 Tf`).
 *
 * PDF hiện đại nhúng font con và đánh số glyph riêng, nên byte trong chuỗi **không phải** mã ký tự: không có
 * bảng này thì "GPT-5 System Card" ra một dãy ký tự lạ. Bảng nằm ở stream `/ToUnicode` của font.
 */
function fontMaps(objects) {
  const toUnicode = new Map();
  for (const [num, obj] of objects) {
    const ref = /\/ToUnicode\s+(\d+)\s+\d+\s+R/.exec(obj.text);
    if (ref) toUnicode.set(num, Number(ref[1]));
  }
  const byName = new Map();
  const cache = new Map();
  // `/Font << /F1 5 0 R /TT2 7 0 R >>` trong phần tài nguyên của trang — có thể nằm trong object stream.
  for (const obj of objects.values()) {
    for (const block of obj.text.matchAll(/\/Font\s*<<([\s\S]{0,4000}?)>>/g)) {
      for (const entry of block[1].matchAll(/\/([A-Za-z0-9#+.-]+)\s+(\d+)\s+\d+\s+R/g)) {
        const cmapObj = toUnicode.get(Number(entry[2]));
        if (cmapObj === undefined || byName.has(entry[1])) continue;
        if (!cache.has(cmapObj)) {
          const stream = objects.get(cmapObj);
          cache.set(cmapObj, stream ? parseCMap(stream.data ?? stream.text) : null);
        }
        if (cache.get(cmapObj)) byName.set(entry[1], cache.get(cmapObj));
      }
    }
  }
  return byName;
}

/** `beginbfchar`/`beginbfrange` của một stream ToUnicode → { bytes, map }. */
function parseCMap(text) {
  const map = new Map();
  let bytes = 1;
  const code = (hex) => { if (hex.length >= 4) bytes = 2; return parseInt(hex, 16); };
  const chars = (hex) => {
    let out = '';
    for (let i = 0; i + 3 < hex.length + 1; i += 4) out += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
    return out;
  };
  for (const block of String(text).matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const pair of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) map.set(code(pair[1]), chars(pair[2]));
  }
  for (const block of String(text).matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const row of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]+)>|\[([\s\S]*?)\])/g)) {
      const lo = code(row[1]);
      const hi = code(row[2]);
      if (hi - lo > 65535) continue;
      if (row[3]) {
        const base = parseInt(row[3].slice(-4), 16);
        for (let c = lo; c <= hi; c++) map.set(c, String.fromCharCode(base + (c - lo)));
      } else {
        const items = [...row[4].matchAll(/<([0-9A-Fa-f]+)>/g)];
        items.forEach((item, i) => map.set(lo + i, chars(item[1])));
      }
    }
  }
  return map.size ? { bytes, map } : null;
}

/**
 * Chữ trong một content stream: `(abc) Tj` và `[(a) -250 (b)] TJ`. Toán tử xuống dòng (`Td`, `TD`, `T*`, `'`,
 * `"`) thành xuống dòng thật, để một dòng của PDF vẫn là một dòng ở đây.
 */
function textOps(content, fonts = new Map()) {
  let out = '';
  let font = null;
  let i = 0;
  while (i < content.length) {
    const ch = content[i];
    if (ch === '/') {
      const m = /^\/([A-Za-z0-9#+.-]+)\s+[\d.]+\s+Tf/.exec(content.slice(i, i + 120));
      if (m) { font = fonts.get(m[1]) ?? null; i += m[0].length; continue; }
      i++;
      continue;
    }
    if (ch === '(') {
      const end = literalEnd(content, i);
      out += decode(font, pdfString(content.slice(i + 1, end)));
      i = end + 1;
      continue;
    }
    if (ch === '<' && content[i + 1] !== '<') {
      const end = content.indexOf('>', i);
      if (end === -1) break;
      out += decode(font, hexString(content.slice(i, end + 1)));
      i = end + 1;
      continue;
    }
    // Số âm đủ lớn trong mảng TJ là khoảng cách giữa hai cụm chữ — không có nó thì "GPT-5SystemCard".
    if (ch === '-' || (ch >= '0' && ch <= '9')) {
      const m = /^-?\d+(?:\.\d+)?/.exec(content.slice(i, i + 24));
      if (m && Number(m[0]) <= -100) out += ' ';
      i += m ? m[0].length : 1;
      continue;
    }
    if (content.startsWith('Td', i) || content.startsWith('TD', i) || content.startsWith('T*', i)) { out += '\n'; i += 2; continue; }
    i++;
  }
  return out;
}

/** Vị trí dấu `)` đóng của một chuỗi PDF, tính cả ngoặc lồng và dấu thoát. */
function literalEnd(content, start) {
  let depth = 0;
  for (let i = start; i < content.length; i++) {
    const c = content[i];
    if (c === '\\') { i++; continue; }
    if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i;
  }
  return content.length;
}

/**
 * Chuỗi byte → chữ. Không phải PDF nào cũng mã hoá glyph: rất nhiều file có sẵn chữ thật trong chuỗi, và áp
 * bảng ToUnicode vào đó thì hỏng đúng thứ đang đọc được. Nên thử cả hai và giữ bản **ra chữ hơn**.
 */
function decode(font, raw) {
  if (!font) return raw;
  const mapped = decodeWith(font, raw);
  return score(mapped) >= score(raw) ? mapped : raw;
}

const score = (s) => (s.length ? (s.match(/[\p{L}\p{N}\p{P}\s]/gu) ?? []).length / s.length : 0);

/** Chuỗi byte của PDF → chữ, qua bảng ToUnicode của font đang dùng. */
function decodeWith(font, raw) {
  let out = '';
  const step = font.bytes;
  for (let i = 0; i + step <= raw.length; i += step) {
    const code = step === 2 ? (raw.charCodeAt(i) << 8) | raw.charCodeAt(i + 1) : raw.charCodeAt(i);
    out += font.map.get(code) ?? (step === 1 ? raw[i] : '');
  }
  return out;
}

const ESCAPES = { n: '\n', r: '\n', t: ' ', b: '', f: '', '(': '(', ')': ')', '\\': '\\' };

function pdfString(raw) {
  return raw.replace(/\\(\d{1,3}|.)/gs, (_, code) => {
    if (/^\d+$/.test(code)) return String.fromCharCode(parseInt(code, 8));
    return ESCAPES[code] ?? code;
  });
}

function hexString(tok) {
  const hex = tok.slice(1, -1).replace(/\s+/g, '');
  let out = '';
  for (let i = 0; i + 1 < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  return out;
}

function clean(text) {
  return String(text ?? '')
    .replace(/\f/g, '\n')
    // Ký tự điều khiển không bao giờ là chữ của trang — dọn luôn, đừng để lọt vào page.txt.
    .replace(/[\u0000-\u0008\u000b\u000e-\u001f]/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n[ \n]*/g, '\n')
    .trim();
}

/**
 * Kết quả có ra chữ không. PDF quét ảnh cho gần như rỗng; PDF mã hoá glyph cho một chuỗi ký tự điều khiển và
 * ký tự lạ. Cả hai phải trả null — "không đọc được" là câu trả lời đúng, rác thì không.
 */
function looksLikeText(text) {
  if (!text || text.length < 200) return null;
  const letters = (text.match(/[\p{L}]/gu) ?? []).length;
  const odd = (text.match(/[\u0000-\u0008\u000b\u000e-\u001f�]/gu) ?? []).length;
  if (letters / text.length < 0.5) return null;
  if (odd / text.length > 0.01) return null;
  // Chữ thật có khoảng trắng đều đặn; chuỗi glyph thì dính thành từng khối dài. Chỉ đếm khối **toàn chữ cái**:
  // dòng mục lục ". . . . . . . . 12" cũng dài mà vẫn là chữ đọc được.
  const words = text.split(/\s+/).filter(Boolean);
  const long = words.filter((w) => w.length > 30 && (w.match(/\p{L}/gu)?.length ?? 0) > 25).length;
  return words.length >= 50 && long / words.length < 0.05 ? text : null;
}
