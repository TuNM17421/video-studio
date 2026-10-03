/**
 * VinUni Lesson Video — JS tokens (mirror of tokens/colors_and_type.css).
 *
 * `C` is `lightColors` from the source repo's src/theme.ts: the ONLY colors a lesson scene
 * may use. Tints and glows are these same colors at alpha (see `alpha`) — never a new hue.
 */
export const FPS = 30;

export const C = Object.freeze({
  bg: '#ffffff', //           canvas
  bgAlt: '#f2f7fc', //        card / glassbox fill
  text: '#0b2a4d', //         ink, subtitle bar
  textMuted: '#4a4a4a', //    secondary copy
  accent: '#1d6199', //       data, particles, default strokes and flows
  accentStrong: '#134d8b', // strong blue labels
  red: '#c72127', //          emphasis, chosen, transformed, action, risk, eyebrow
  redSoft: '#ffe0e1', //      active overlay, warning card, tag fill
  dotInactive: '#e0edf8', //  connector base, bar track, divider, grid
});

/**
 * Role colors (approved 2026-09-11, option B). NOT part of the 9-color body palette:
 * use them only for zone labels, outlines and soft fills that name a ROLE the script color-codes
 * (input blue · processing/reasoning purple · output green · check/action orange · memory amber).
 * Never for body text, numbers or particles; red keeps its meaning (emphasis / risk).
 */
export const ROLE = Object.freeze({
  purple: '#5b4b9a',
  purpleSoft: '#e8e6f1',
  green: '#2f7d57',
  greenSoft: '#e1ede7',
  orange: '#c8641e',
  orangeSoft: '#f7e9e0',
  amber: '#a87a0c',
  amberSoft: '#f3ecdd',
});

/** Script vocabulary → [stroke, soft fill]. `input` reuses the body accent. */
export const ROLE_OF = Object.freeze({
  input: ['#1d6199', '#e0edf8'],
  process: [ROLE.purple, ROLE.purpleSoft],
  reasoning: [ROLE.purple, ROLE.purpleSoft],
  output: [ROLE.green, ROLE.greenSoft],
  check: [ROLE.orange, ROLE.orangeSoft],
  action: [ROLE.orange, ROLE.orangeSoft],
  memory: [ROLE.amber, ROLE.amberSoft],
});

/** Palette for the approved LEXCE mascot artwork. */
export const MASCOT = Object.freeze({
  outline: '#1B2E5A',
  shadow: '#0B2E4A',
  fur: '#F7EFDD',
  cheek: '#F4A4B4',
  ear: '#4457C9',
  earInner: '#7FA6E4',
  eye: '#1E2B7A',
  beak: '#FA8842',
  mouth: '#E23A2E',
  suit: '#3C50C4',
  patch: '#F0D9AC',
  logoNavy: '#1F3573',
  logoRed: '#E8322A',
  wing: '#F3E3C4',
  hand: '#F9D374',
  foot: '#A6CBEF',
  revampSuit: '#2B58B4',
  revampFoot: '#8CC1FC',
  revampFootHighlight: '#C2DFFF',
  revampGround: '#D8E8F8',
  revampBrow: '#6994E3',
  revampEye: '#102352',
  revampMouth: '#D31F1F',
  revampPointer: '#B97839',
  tail: '#EE3B33',
  tear: '#6FB6E8',
  motion: '#F2C14E',
});

export const FONT = "'Montserrat', 'Segoe UI', system-ui, sans-serif";
/**
 * Whiteboard style only: the default handwriting the marker writes on the board (Playpen Sans, OFL,
 * Vietnamese). Shantell Sans and Pangolin are the alternatives (components/whiteboard/handFonts.js).
 * Never for chrome — eyebrow, captions and footer stay FONT.
 */
export const HAND = "'Playpen Sans', 'Comic Sans MS', cursive";
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
export const BRAND = 'VinUni · AI in Action 20K';

/**
 * Khổ hình (format) — chọn một lần cho cả video, ở bước Kế hoạch, TRƯỚC khi dựng cảnh.
 *
 * Đây không phải một phép cắt lúc render. Hai khổ là hai khung vẽ khác nhau, và cảnh được **dựng riêng**
 * cho khổ nào thì hợp với khổ đó: khổ ngang bày theo hàng (trái → phải, nhân vật hai bên, sơ đồ nằm
 * ngang), khổ dọc bày theo cột (trên → dưới, nhân vật xếp chồng, sơ đồ chảy xuống). Cắt một cảnh ngang
 * vào khung dọc chỉ mất nửa nội dung — đã đo ở #62.
 *
 * Cảnh đọc toạ độ của khổ đang dựng bằng `useLayout()` (lib/player.jsx), không đọc hằng số `LAYOUT`.
 * `LAYOUT` giữ nguyên là khổ ngang để mọi video đã dựng xong không đổi một pixel nào.
 */
export const FORMATS = Object.freeze({
  '16x9': Object.freeze({
    id: '16x9',
    label: 'Ngang · máy tính',
    aspect: '16:9',
    width: 1920,
    height: 1080,
    /** Trục bày nội dung: cảnh ngang kể chuyện từ trái sang phải. */
    flow: 'row',
    layout: Object.freeze({
      eyebrowTop: 70,
      titleBaseline: 176,
      titleSize: 50,
      dividerY: 220,
      dividerX0: 96,
      dividerX1: 1824,
      tagTop: 228,
      tagRight: 1792,
      contentTop: 250,
      contentBottom: 960,
      captionTop: 984,
      captionHeight: 96,
      captionMaxChars: 78,
      captionPadX: 180,
      safeX: 120,
      contentXMin: 80,
      footerBottom: 48,
      watermarkTop: 46,
      watermarkRight: 56,
      gridStart: 80,
      gridStep: 120,
    }),
  }),
  '9x16': Object.freeze({
    id: '9x16',
    label: 'Dọc · điện thoại',
    aspect: '9:16',
    width: 1080,
    height: 1920,
    /** Trục bày nội dung: cảnh dọc kể chuyện từ trên xuống dưới. */
    flow: 'column',
    layout: Object.freeze({
      // Watermark giữ góc phải trên; eyebrow phải xuống dưới nó vì 1080 px không đủ cho cả hai một hàng.
      watermarkTop: 48,
      watermarkRight: 48,
      eyebrowTop: 128,
      titleBaseline: 268,
      titleSize: 54,
      dividerY: 312,
      dividerX0: 56,
      dividerX1: 1024,
      tagTop: 320,
      tagRight: 1024,
      // Vùng nội dung 1080 × 1380 — khung đứng, nên sơ đồ xếp theo cột.
      contentTop: 360,
      contentBottom: 1740,
      captionTop: 1800,
      captionHeight: 120,
      // 1080 − 2×56 = 968 px dùng được, ~20 px mỗi ký tự ở cỡ chữ phụ đề → 46 ký tự một dòng.
      captionMaxChars: 46,
      captionPadX: 56,
      safeX: 56,
      contentXMin: 48,
      footerBottom: 56,
      gridStart: 60,
      gridStep: 120,
    }),
  }),
});

export const DEFAULT_FORMAT = '16x9';

/** Khổ theo id; id lạ hoặc bỏ trống thì về khổ ngang. */
export const formatOf = (id) => FORMATS[id] || FORMATS[DEFAULT_FORMAT];

/**
 * Khổ ngang vẫn là mặc định của module, nên mọi cảnh đã dựng (`import { LAYOUT, WIDTH }`) chạy y nguyên.
 * Cảnh dựng cho khổ dọc dùng `useLayout()` / `useFormat()` thay vì ba hằng số này.
 */
export const WIDTH = FORMATS[DEFAULT_FORMAT].width;
export const HEIGHT = FORMATS[DEFAULT_FORMAT].height;
export const LAYOUT = FORMATS[DEFAULT_FORMAT].layout;

export const SHADOW = Object.freeze({
  hero: '0 12px 28px rgba(11,42,77,0.16)',
  block: '0 10px 24px rgba(11,42,77,0.18)',
  icon: '0 8px 18px rgba(11,42,77,0.16)',
  soft: '0 8px 20px #e0edf8',
  caption: '0 -8px 24px #e0edf8',
});

/** A palette token (or hex) at alpha, e.g. alpha('red', 0.24) → "rgba(199,33,39,0.24)". */
export function alpha(token, a) {
  const hex = (C[token] || token).replace('#', '');
  const n = parseInt(hex.length === 3 ? hex.replace(/(.)/g, '$1$1') : hex, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.round(a * 1000) / 1000})`;
}
