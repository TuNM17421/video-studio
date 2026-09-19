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

/** Thẻ mở một khối mới: xuống dòng ở đó để chữ của hai đoạn không dính vào nhau thành một từ. */
const BLOCK = /<\/?(p|div|br|li|ul|ol|h[1-6]|tr|td|th|table|section|article|header|footer|blockquote|pre|dt|dd|figcaption|main|aside|nav)\b[^>]*>/gi;

/** HTML → chữ thường, bỏ script, style, chú thích; giữ ranh giới đoạn bằng xuống dòng. */
export function pageText(html) {
  return decodeEntities(
    String(html)
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(BLOCK, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
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

/** Trích đoạn có nằm nguyên văn trong chữ của trang không. */
export function quoteInText(quote, text) {
  const needle = normalize(stripMarkdown(quote));
  return needle.length > 0 && normalize(text).includes(needle);
}
