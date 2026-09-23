/**
 * Gate bố cục cho cảnh dựng bằng <div> + inline style (kiểu "poster") — audit animation F1.
 *
 * VÌ SAO CÓ FILE NÀY. `verify.mjs` đo bố cục qua `textNodes()`, chỉ khớp `<text>` của SVG. Đo thật
 * trên frame cuối mỗi cue:
 *   demo-ai-history-three-turns   88 frame · <text> = 0    · <rect> = 8   · div có chữ = 659
 *   n5-06-human-centered-ai-design 68 frame · <text> = 285 · <rect> = 598 · div có chữ = 144
 *   d2-01-lab-v2                   51 frame · <text> = 692 · <rect> = 545 · div có chữ = 99
 * Tức là với video kiểu poster, MỌI gate bố cục của verify (overlaps · textOverflow · filledHalves ·
 * visualFingerprint) nhìn vào một khung hình rỗng và im lặng báo "không sao". Video demo đi qua
 * verify sạch bong trong khi audit tìm thấy 6 chỗ chữ ≤21px bằng mắt.
 *
 * ĐƯỢC ĐẾN ĐÂU, VÀ KHÔNG ĐƯỢC ĐẾN ĐÂU — đã đo, không phỏng đoán (659 div có chữ của video demo):
 *   `font-size` có trên 659/659 div (100%)  → CHÍNH XÁC, và không phụ thuộc phần tử cha.
 *   `left`+`top` chỉ có trên 288/659 (44%)  → 56% còn lại do flexbox xếp chỗ.
 *
 * VỊ TRÍ THÌ KHÔNG DÙNG ĐƯỢC, và đây là kết luận đã ĐO chứ không phải đề phòng. Bản đầu của file
 * này có thêm hai check "chữ sát mép khung" và "chữ đè chữ" dựng trên `left`/`top`. Chạy thật trên
 * video demo: 65 cảnh báo, và cặp đầu tiên là
 *     "TOY WORLD ✓" và "THẾ GIỚI THẬT ✕" đè lên nhau 4640 px²   ← SAI
 * Mở `chapter-lighthill.jsx:113` và `:124` thì hai nhãn đó nằm trong HAI panel khác nhau
 * (`left:120` và `left:760`), mỗi nhãn `top:18;left:22` so với panel CHA của nó. `position:absolute`
 * luôn tính theo tổ tiên được định vị gần nhất, mà SSR markup phẳng thì không cho biết tổ tiên đó là
 * ai — và `inset`/`bottom`/`right`/`transform`/flexbox còn phá tiếp. Không có layout engine thì mọi
 * kết luận về VỊ TRÍ ở đây đều là đoán. Nên file này CỐ Ý chỉ còn check cỡ chữ.
 *
 * Phần vị trí là việc của `tools/qa-layout.mjs` — nó mở trình duyệt thật và đọc `getBoundingClientRect`,
 * tức là có layout engine. Một gate báo sai chỗ nó không đọc được thì tệ hơn là không có gate.
 */

const CHAR_WIDTH_RATIO = 0.52;
export const FRAME_WIDTH = 1920;
export const FRAME_HEIGHT = 1080;
/** Dưới cỡ này thì chữ trên video 1080p bắt đầu khó đọc ở màn hình điện thoại (audit F10). */
export const MIN_FONT_PX = 22;

const styleNumber = (style, prop) => {
  const m = style.match(new RegExp(`(?:^|;)\\s*${prop}:\\s*(-?[\\d.]+)px`));
  return m ? Number(m[1]) : null;
};

/**
 * Mọi <div> mang chữ thật, kèm cỡ chữ và (nếu tự khai) toạ độ.
 * `positioned: false` = không biết nó nằm đâu, và mọi check về VỊ TRÍ phải bỏ qua nó.
 */
export function ssrTextBoxes(html) {
  const out = [];
  for (const m of String(html).matchAll(/<div\b([^>]*)>([^<]+)<\/div>/g)) {
    const attrs = m[1];
    const text = m[2].replace(/&#x27;/g, "'").replace(/&[a-z]+;/g, ' ').trim();
    if (!text) continue;
    const style = (attrs.match(/style="([^"]*)"/) || [])[1] || '';
    const size = styleNumber(style, 'font-size');
    if (size === null) continue;
    const opacity = styleNumber(style, 'opacity');
    if (opacity !== null && opacity < 0.05) continue;
    if (/opacity:\s*0(?:;|$|\s)/.test(style)) continue;
    const left = styleNumber(style, 'left');
    const top = styleNumber(style, 'top');
    const positioned = left !== null && top !== null && /position:\s*absolute/.test(style);
    const lineHeight = styleNumber(style, 'line-height') || size * 1.2;
    out.push({
      text,
      size,
      positioned,
      x: left,
      y: top,
      w: [...text].length * size * CHAR_WIDTH_RATIO,
      h: Math.max(lineHeight, size),
    });
  }
  return out;
}

/** Chữ nhỏ hơn ngưỡng đọc được. Chính xác: cỡ chữ luôn có mặt trong inline style. */
export function smallTextProblems(boxes, { min = MIN_FONT_PX } = {}) {
  const small = boxes.filter((b) => b.size < min);
  if (!small.length) return [];
  const worst = [...new Map(small.map((b) => [b.text, b])).values()]
    .sort((a, b) => a.size - b.size)
    .slice(0, 5)
    .map((b) => `"${b.text.slice(0, 30)}" ${b.size}px`);
  return [`${small.length} chỗ chữ nhỏ hơn ${min}px — ${worst.join(', ')}`];
}

/**
 * Check bố cục chạy được từ SSR markup. Hiện chỉ có MỘT: cỡ chữ.
 * Đừng thêm check dựa trên `left`/`top` vào đây — xem khối chú thích đầu file, đã thử và đã sai.
 */
export function ssrLayoutProblems(html, opts = {}) {
  const boxes = ssrTextBoxes(html);
  if (!boxes.length) return [];
  return smallTextProblems(boxes, opts);
}

/**
 * ── ƯỚC LƯỢNG BỀ NGANG CHỮ SVG ────────────────────────────────────────────────────────────────
 *
 * `verify` chỉ có SSR markup, không có trình duyệt, nên phải ƯỚC bề ngang một dòng `<text>` để
 * đoán nó có rộng hơn cái hộp chứa nó không. Đây là BỘ LỌC THÔ; số có thẩm quyền là `qa-layout`
 * (`Range.getBoundingClientRect` / `getComputedTextLength` trong trình duyệt).
 *
 * ── Hệ số đo THẬT, không đoán (22/09/2026) ───────────────────────────────────────────────────
 * Đo bằng `getComputedTextLength()` trên chính 8 chuỗi đang bị gắn cờ, font thật của DS
 * (Montserrat), tỉ lệ `bề ngang ÷ (số ký tự × cỡ chữ)`:
 *
 *   "TRÍ TUỆ NHÂN TẠO (AI)"        18px  →  0,574
 *   "ĐẦU RA 1 · CÂU VẤN ĐỀ"        18px  →  0,585
 *   "ĐẦU RA 2 · CÁCH ĐO"           18px  →  0,602
 *   "GIẢ THUYẾT GIẢI PHÁP"         18px  →  0,606
 *   "YÊU CẦU · XÂY MỘT CHATBOT AI" 18px  →  0,609
 *   "4 MỤC SPEC RIÊNG CHO AI"      18px  →  0,613
 *   "NIỀM TIN NGƯỜI DÙNG"          18px  →  0,637
 *   "CHUYỂN NGƯỜI THẬT"            21px  →  0,666
 *
 * Hệ số in hoa **0,66** (đặt ngày 21/09 để bắt ca "QUYỀN KIỂM SOÁT") là ĐỈNH của dải đó, nên nó
 * ước THỪA 4–15% ở mọi chuỗi còn lại. Cộng với biên `- 24 px`, nó biến **11 dòng chữ nằm gọn
 * trong hộp** của 5 video ĐÃ DUYỆT thành lỗi chặn. Dùng **0,62** (đỉnh của phần thân dải) và so
 * với chính bề rộng hộp kèm cushion cho sai số ước lượng.
 */
export const CAPS_RATIO = 0.62;
export const LOWER_RATIO = 0.49;
/** Sai số ước lượng đo được lên tới ~15%; chỉ báo khi ước lượng vượt HẲN hộp, không vượt phần đệm. */
export const OVERFLOW_CUSHION = 1.02;

/** Tỉ lệ ký tự IN HOA trong phần chữ cái của một chuỗi (0…1). */
export function upperShare(text) {
  const letters = String(text ?? '').replace(/[^\p{L}]/gu, '');
  if (!letters) return 0;
  return [...letters].filter((c) => c === c.toUpperCase()).length / letters.length;
}

/** Bề ngang ƯỚC LƯỢNG của một dòng chữ, nội suy giữa hệ số chữ thường và chữ in hoa. */
export function estimateTextWidth(text, size) {
  const u = upperShare(text);
  return String(text ?? '').length * Number(size) * (LOWER_RATIO + (CAPS_RATIO - LOWER_RATIO) * u);
}

/**
 * Chữ có bị coi là rộng hơn hộp chứa nó không.
 * `boxW` là bề rộng hộp nền nhỏ nhất bao quanh tâm chữ; `null` = không có hộp nào ⇒ không xét.
 */
export function overflowsBox(text, size, boxW) {
  if (!Number.isFinite(boxW)) return false;
  return estimateTextWidth(text, size) > boxW * OVERFLOW_CUSHION;
}
