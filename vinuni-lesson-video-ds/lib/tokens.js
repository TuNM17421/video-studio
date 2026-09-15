/**
 * VinUni Lesson Video — JS tokens (mirror of tokens/colors_and_type.css).
 *
 * `C` is `lightColors` from the source repo's src/theme.ts: the ONLY colors a lesson scene
 * may use. Tints and glows are these same colors at alpha (see `alpha`) — never a new hue.
 */
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

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

export const MASCOT = Object.freeze({
  outline: '#1B2E5A', //   nét viền chung (bản plush không có viền; video cần, xem Mascot.prompt.md)
  shadow: '#0B2E4A', //    bóng đổ dưới chân
  fur: '#F7EFDD', //       lông kem: đầu, khăn cổ
  cheek: '#F4A4B4', //     má hồng
  ear: '#4457C9', //       tai xanh royal
  earInner: '#7FA6E4', //  lòng tai, lọn tóc trán, lông mày
  eye: '#1E2B7A', //       mắt navy
  beak: '#FA8842', //      mỏ cam
  mouth: '#E23A2E', //     trong miệng khi mỏ há
  suit: '#3C50C4', //      bộ liền thân xanh
  patch: '#F0D9AC', //     yếm be trước bụng
  logoNavy: '#1F3573', //  chữ V trên yếm
  logoRed: '#E8322A', //   tam giác đỏ của logo
  wing: '#F3E3C4', //      lông cánh kem
  hand: '#F9D374', //      bàn tay vàng
  foot: '#A6CBEF', //      bàn chân xanh nhạt
  // Màu lấy trực tiếp từ vector LEXCE revamp; phần chân đứng mới phải khớp ảnh gốc.
  revampSuit: '#2B58B4',
  revampFoot: '#8CC1FC',
  revampFootHighlight: '#C2DFFF',
  revampGround: '#D8E8F8',
  revampBrow: '#6994E3',
  revampEye: '#102352',
  revampMouth: '#D31F1F',
  revampPointer: '#B97839',
  tail: '#EE3B33', //      đuôi lửa đỏ
  tear: '#6FB6E8', //      giọt nước mắt (pose sad)
  motion: '#F2C14E', //    vạch tốc độ, bóng đèn emote
});

export const FONT = "'Montserrat', 'Segoe UI', system-ui, sans-serif";
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
export const BRAND = 'VinUni · AI in Action 20K';

/** Fixed canvas geometry (px on the 1920×1080 canvas). */
export const LAYOUT = Object.freeze({
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
  safeX: 120,
  contentXMin: 80,
  footerBottom: 48,
  watermarkTop: 46,
  watermarkRight: 56,
  gridStart: 80,
  gridStep: 120,
});

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
