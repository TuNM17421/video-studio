/**
 * Chữ của một trang web gốc, và cách so một trích đoạn với nó.
 *
 * Vì sao cần: WebFetch của agent không trả về trang — nó đưa trang cho một model nhỏ đọc rồi trả lời theo
 * câu hỏi agent đặt ra. File `sources/<id>.md` agent ghi xuống vì thế là bản đã qua tay một model, và một
 * trích đoạn khớp với nó chưa chứng minh được là trang thật có câu đó. Ở đây Studio tự tải trang về và bóc
 * chữ, không model nào đứng giữa.
 *
 * Hàm thuần, không phụ thuộc thư viện: đủ cho trang tài liệu, bài báo, trang nghiên cứu. Trang dựng hoàn toàn
 * bằng JavaScript sẽ ra rất ít chữ — `pageText` không đoán thay, người gọi thấy trang rỗng và báo "không đối
 * chiếu được".
 */

const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»',
  middot: '·', bull: '•', times: '×', copy: '©', reg: '®', trade: '™', deg: '°', shy: '',
};

export function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : all;
    }
    return NAMED[e.toLowerCase()] ?? all;
  });
}

/**
 * Thẻ mở một khối mới: xuống dòng ở đó để chữ của hai đoạn không dính vào nhau thành một từ.
 * `[^<>]*` chứ không `[^>]*`: trang có hàng nghìn `<p` không đóng thì `[^>]*` quét tới cuối trang từ mỗi chỗ
 * một lần — bậc hai theo độ dài trang.
 */
const BLOCK = /<\/?(p|div|br|li|ul|ol|h[1-6]|tr|table|section|article|header|footer|blockquote|pre|dt|dd|figcaption|main|aside|nav)\b[^<>]*>/gi;
/**
 * Ô của bảng ngăn nhau bằng " | " chứ không phải xuống dòng, nên **một hàng bảng là một dòng**. Cắt mỗi ô
 * thành một dòng thì dòng nào cũng ngắn hơn MIN_QUOTE_CHARS ("80.7 %", "gemini-2.5-pro") — không đoạn nào
 * dùng làm trích đoạn được, và bảng xếp hạng của nguồn gốc thành vô dụng so với một blog thuật lại nó.
 */
const CELL = /<[/](?:td|th)(?![a-z])[^<>]*>/gi;

const RAW = /<(script|style|noscript|svg|template|iframe)\b/gi;

/**
 * Bỏ chú thích và các khối không phải chữ (script, style, svg…) bằng cách quét `indexOf` — tuyến tính.
 * Regex lười `[\s\S]*?…<\/\1>` làm việc này thì bậc hai trên trang có nhiều thẻ mở không đóng: một trang
 * 8 MB dựng cố ý có thể chạy hàng chục phút. Khối không đóng thì bỏ tới hết trang.
 */
/**
 * Chữ thường chỉ cho A–Z: `toLowerCase()` đổi "İ" (U+0130) thành hai ký tự, làm lệch mọi vị trí tìm được so với
 * chuỗi gốc. Tên thẻ HTML đều là ASCII nên chỉ cần hạ ASCII.
 */
export const asciiLower = (s) => s.replace(/[A-Z]+/g, (m) => m.toLowerCase());

function stripNonText(html) {
  const lower = asciiLower(html);
  let out = '';
  let pos = 0;
  // Vị trí chú thích và khối không-chữ kế tiếp chỉ được tìm lại khi đã đi qua nó — tìm lại mỗi vòng là quét
  // tới cuối trang mỗi lần, bậc hai trên trang có hàng vạn `<script></script>`.
  let comment = -2;
  let raw = null;
  while (pos < html.length) {
    if (comment !== -1 && comment < pos) comment = lower.indexOf('<!--', pos);
    if (raw !== false && (!raw || raw.index < pos)) {
      RAW.lastIndex = pos;
      raw = RAW.exec(lower) ?? false;
    }
    const at = Math.min(comment === -1 ? Infinity : comment, raw ? raw.index : Infinity);
    if (at === Infinity) { out += html.slice(pos); break; }
    out += `${html.slice(pos, at)} `;
    if (at === comment) {
      const end = lower.indexOf('-->', at + 4);
      pos = end === -1 ? html.length : end + 3;
    } else {
      const close = lower.indexOf(`</${raw[1]}`, at + raw[0].length);
      const gt = close === -1 ? -1 : lower.indexOf('>', close);
      pos = gt === -1 ? html.length : gt + 1;
    }
  }
  return out;
}

/**
 * Một thẻ bắt đầu bằng `<` rồi chữ cái, `/`, `!` hay `?` — đúng luật trình duyệt đọc HTML. "<= 200k" hay "< 5%" là
 * chữ: bảng giá của Google viết thẳng "prompts <= 200k tokens … prompts > 200k", và coi mọi `<…>` là thẻ thì cả
 * đoạn giữa hai dấu bị xoá — mất đúng bậc giá mà claim đang hỏi.
 */
const TAG = /<[a-zA-Z/!?][^<>]*>/g;

/** HTML → chữ thường, bỏ script, style, chú thích; giữ ranh giới đoạn bằng xuống dòng. */
export function pageText(html) {
  return decodeEntities(
    stripNonText(String(html))
      // Xuống dòng trong mã nguồn HTML chỉ là khoảng trắng — trình duyệt gộp lại; chỉ thẻ khối mới xuống dòng thật.
      // Giữ nó thì bảng viết mỗi <td> một dòng mã thành mỗi ô một dòng chữ, và không dòng nào đủ dài để trích.
      .replace(/\s+/g, ' ')
      .replace(CELL, ' | ')
      .replace(BLOCK, '\n')
      .replace(TAG, ''),
  )
    // Gộp mọi khoảng trắng trừ xuống dòng trước (kể cả \r, dấu cách Unicode), rồi mới dọn quanh xuống dòng:
    // `\s*\n\s*` chạy thẳng trên một dải \r dài là bậc hai.
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n[ \n]*/g, '\n')
    .trim();
}

/**
 * Chuẩn hoá để so: cùng một câu có thể khác nhau ở những thứ không phải lời — nháy cong hay thẳng, gạch
 * ngang dài hay ngắn, dấu cách không ngắt, xuống dòng. Hoa thường cũng bỏ qua. Không đụng tới chữ và số:
 * một con số bị sửa vẫn phải trượt.
 */
export function normalize(s) {
  return String(s ?? '')
    .normalize('NFC')
    .replace(/[​-‍﻿­]/g, '')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″«»]/g, '"')
    .replace(/[‐‑‒–—―−]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Trích đoạn agent chép thường mang theo dấu markdown của bản WebFetch trả về — `**đậm**`, `` `mã` ``,
 * `[chữ](liên kết)`. Trang gốc không có những dấu đó, nên gỡ ra trước khi so.
 */
export function stripMarkdown(s) {
  return String(s ?? '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__|`/g, '')
    // in nghiêng `_chữ_` / `*chữ*` — chỉ khi dấu bám sát một cụm chữ có khoảng trắng hai bên, để không gỡ
    // mất gạch dưới giữa tên hàm như count_tokens
    .replace(/(^|[\s("'])[_*](?=\S)([^_*\n]*?\S)[_*](?=[\s.,;:!?)"']|$)/g, '$1$2')
    .replace(/^\s*(?:[-*+]|\d+\.|>)\s+/gm, '');
}

/** Mỗi phần của một trích đoạn có lược phải dài chừng này — "32" hay "gpt" thì trang nào cũng có. */
export const MIN_ELLIPSIS_PART = 8;
/** Hai phần liền nhau của một trích đoạn có lược phải nằm gần nhau — cùng một đoạn, không phải hai chỗ bất kỳ. */
export const MAX_ELLIPSIS_GAP = 120;

/**
 * Trích đoạn có nằm nguyên văn trong chữ của trang không.
 *
 * Dấu lược "…" được hiểu đúng như người đọc hiểu: các phần hai bên phải cùng có trong trang, đúng thứ tự,
 * **và gần nhau**. Không có dấu lược thì trích đoạn chép từ `findPassages` (cắt hai đầu bằng "…") hay một câu
 * dài được lược giữa sẽ trượt oan. Nhưng lược không phải là ghép: mỗi phần phải đủ dài và cách phần trước
 * không quá MAX_ELLIPSIS_GAP ký tự, không thì "GPT-4 … 32 … token" ghép được từ ba chỗ bất kỳ trên trang.
 */
export function quoteInText(quote, text) {
  const whole = normalize(stripMarkdown(quote)).replace(/^\.\.\.\s*|\s*\.\.\.$/g, '').trim();
  if (!whole) return false;
  const hay = normalize(text);
  // Trang tự có "…" thì trích nguyên văn cũng có "…" — khớp nguyên cả câu trước, chỉ khi không khớp mới hiểu
  // "…" là dấu lược của người trích.
  if (hay.includes(whole)) return true;
  const parts = whole.split(/\s*\.\.\.\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2 || parts.some((p) => p.length < MIN_ELLIPSIS_PART)) return false;
  // Ghép **trong một đoạn**, không vắt qua hai đoạn của trang: `normalize` gộp xuống dòng thành dấu cách, nên
  // nếu tìm trên cả trang thì "GPT-4o mini … $15.00" ghép được từ hai hàng bảng khác nhau — một cái giá trang
  // không hề gán cho model đó. `page.mjs` in mỗi đoạn một dòng và agent chép từ đó, nên trích đoạn thật luôn
  // nằm gọn trong một dòng.
  return String(text ?? '').split('\n').some((line) => joinsInLine(parts, normalize(line)));
}

/** Các phần của một trích đoạn có lược, đúng thứ tự và mỗi phần cách phần trước không quá MAX_ELLIPSIS_GAP. */
function joinsInLine(parts, hay) {
  // Thử mọi chỗ phần đầu xuất hiện: chỗ đầu tiên có thể không phải chỗ mà các phần sau nằm gần.
  for (let start = hay.indexOf(parts[0]); start !== -1; start = hay.indexOf(parts[0], start + 1)) {
    let end = start + parts[0].length;
    let ok = true;
    for (const part of parts.slice(1)) {
      // Chỉ tìm trong khung ngay sau phần trước — tìm cả dòng cho mỗi chỗ xuất hiện là bậc hai.
      const at = hay.slice(end, end + MAX_ELLIPSIS_GAP + part.length).indexOf(part);
      if (at === -1) { ok = false; break; }
      end += at + part.length;
    }
    if (ok) return true;
  }
  return false;
}

/** Đoạn dài hơn chừng này thì chỉ cắt một khung quanh chỗ khớp — một "đoạn" của trang tài liệu có khi là cả bảng. */
const LONG_LINE = 700;
const WINDOW = 320;

/**
 * Những đoạn của trang có chứa từ khoá — thứ agent đọc thay cho cả trang, để một trang 20 000 ký tự chỉ tốn
 * vài trăm token. Đoạn trả về là chữ **nguyên văn** của trang (có thể bị cắt hai đầu bằng "…"), nên agent
 * chép trích đoạn từ đây thì soát chắc chắn khớp.
 *
 * Đoạn khớp nhiều từ khoá khác nhau được ưu tiên; kết quả giữ thứ tự xuất hiện trong trang.
 *
 * @param {string} text   chữ của trang (một đoạn mỗi dòng, như `pageText` trả về)
 * @param {string[]} terms
 * @param {{ max?: number }} [opts]
 * @returns {{ line: number, text: string, hits: number }[]}
 */
export function findPassages(text, terms, { max = 6 } = {}) {
  const wanted = terms.map((t) => normalize(t)).filter(Boolean);
  if (!wanted.length) return [];
  const lines = String(text ?? '').split('\n');
  const found = [];
  lines.forEach((raw, i) => {
    const line = normalize(raw);
    const hits = wanted.filter((t) => line.includes(t)).length;
    if (hits) found.push({ line: i + 1, raw, hits });
  });
  const best = [...found].sort((a, b) => b.hits - a.hits || a.line - b.line).slice(0, max).sort((a, b) => a.line - b.line);
  return best.map(({ line, raw, hits }) => ({ line, hits, text: clip(raw, terms) }));
}

/** Cắt một đoạn quá dài thành khung quanh từ khoá đầu tiên tìm thấy, ngắt ở ranh giới từ. */
function clip(raw, terms) {
  const s = String(raw).trim();
  if (s.length <= LONG_LINE) return s;
  const lower = s.toLowerCase();
  const at = terms.map((t) => lower.indexOf(String(t).toLowerCase())).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0;
  let start = Math.max(0, at - WINDOW);
  let end = Math.min(s.length, at + WINDOW);
  if (start > 0) start = s.indexOf(' ', start) + 1 || start;
  if (end < s.length) end = s.lastIndexOf(' ', end) > start ? s.lastIndexOf(' ', end) : end;
  return `${start > 0 ? '…' : ''}${s.slice(start, end).trim()}${end < s.length ? '…' : ''}`;
}
