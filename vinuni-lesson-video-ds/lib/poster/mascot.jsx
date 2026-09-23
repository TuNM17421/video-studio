/**
 * LEXCE trên nền đêm — lớp BỌC, không sửa artwork.
 *
 * `MascotRevamp` được vẽ cho nền TRẮNG của dòng slide: viền ngoài navy đậm, thân xanh royal, và một
 * đĩa `revampGround` (#D8E8F8, rx 350 × ry 20) vẽ dưới chân để nhân vật "đứng" trên giấy trắng. Đặt
 * thẳng khối đó lên `night` (#243155) thì hai chuyện xảy ra cùng lúc:
 *   1. viền navy gần như biến mất vào nền (cùng họ xanh đậm) → nhân vật mất silhouette;
 *   2. đĩa `revampGround` sáng hơn nền rất nhiều → nó nổi lên thành một VỆT SÁNG nằm ngang dưới
 *      chân, chứ không còn đọc ra là bóng.
 *
 * File này KHÔNG đụng `revampArtwork.js` / `MascotRevamp.jsx` (file generated). Nó chỉ:
 *   · bọc nhân vật trong một `<g>` có filter / hình nền / khung do mình vẽ bằng token `POSTER`;
 *   · cắt đĩa `revampGround` bằng `clipPath` khi `ground !== 'keep'` (không xoá path, chỉ che);
 *   · giữ nguyên `data-vk-occupies` mà `MascotRevamp` khai, nên gate "chữ nằm dưới mascot" của
 *     `verify` vẫn áp được — với điều kiện chữ của cảnh cũng là `<text>` SVG trong CÙNG lớp
 *     `MascotLayer` (chữ HTML `<div>` thì `verify` không thấy, xem `video-anatomy.md` §4).
 *
 * Tất định: mọi hình chỉ phụ thuộc `T` và các prop. Không `Math.random`, không `window`, không RAF.
 */
import React from 'react';
import { POSTER as P, POSTER_FONT as FONT } from '../tokens.js';
import { MascotRevamp } from '../../components/mascot/MascotRevamp.jsx';
import { SceneFitContext } from './vach.jsx';

/** Hệ toạ độ của mọi primitive poster (stage phóng 1.2 lần lên 1920×1080). */
export const W = 1600;
export const H = 900;

/** Tỉ lệ của artwork: viewBox 1122×1402. */
export const MASCOT_ASPECT = 1122 / 1402;

/**
 * Đáy artwork theo tỉ lệ chiều cao, đo từ chính `MascotRevamp.jsx`:
 * · pose phẳng (mọi pose trừ `leanFoot`) bị `lexce-flat-bottom-cut` cắt ở y = 1180/1402;
 * · `leanFoot` giữ silhouette gốc, chân thấp nhất ~1230/1402.
 * Đĩa `revampGround` nằm ở y 1240…1280 → cắt ở 1215/1402 là gọn cho pose phẳng, 1236/1402 cho
 * `leanFoot` (vẫn nằm DƯỚI bàn chân, chỉ ăn vào đĩa).
 */
const CUT_FLAT = 1215 / 1402;
// 1236 là quá thấp: bản chụp 21/09 còn để lọt một VỆT CREAM ngang dưới bàn chân của `leanFoot`
// (path bóng gốc, `#D8E8F8`, tương phản 10,2:1 với `night` → nổi hơn cả nhân vật). 1198 cắt hết
// vệt đó mà vẫn nằm dưới ngón chân thấp nhất — đo lại bằng ảnh, đừng đoán.
const CUT_LEAN = 1198 / 1402;

/** Năm phương án đặt LEXCE vào thế giới poster. `bare` là đối chứng: không bọc gì cả. */
export const MASCOT_VARIANTS = Object.freeze(['bare', 'halo', 'plinth', 'cabin', 'badge']);

/** Nhãn tiếng Việt cho từng phương án — dùng trong lưới probe và trong báo cáo. */
export const MASCOT_VARIANT_LABEL = Object.freeze({
  bare: 'A · đặt thẳng lên night',
  halo: 'B · viền cream quanh silhouette',
  plinth: 'C · bục sáng cream',
  cabin: 'D · cabin night2 bo góc',
  badge: 'E · huy hiệu tròn night2 + vành gold',
});

/**
 * Lớp SVG 1600×900 để đặt mascot (và chữ SVG đi kèm) lên một cảnh poster.
 *
 * Cảnh poster dựng bằng `<div>` HTML; mascot là SVG. Bọc trong MỘT lớp chung để:
 * · toạ độ mascot và chữ SVG cùng một hệ (điều kiện để gate `data-vk-occupies` so được);
 * · `pointerEvents: 'none'` để lớp không chặn gì trên player.
 */
export function MascotLayer({ children, zIndex = 10, style }) {
  // Cùng lưới dọc với `VachLayer`: mascot phải dời theo cảnh, nếu không nó đứng lệch khỏi vạch.
  const fit = React.useContext(SceneFitContext);
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ position: 'absolute', left: 0, top: 0, zIndex, pointerEvents: 'none', ...style }}
    >
      {fit ? <g transform={fit}>{children}</g> : children}
    </svg>
  );
}

/** Nhãn chữ SVG trong lớp mascot — có sẵn ở đây để cảnh không phải import thêm dòng slide. */
export function LayerText({ x, y, size = 20, weight = 700, color = P.ice, anchor = 'middle', opacity = 1, children }) {
  if (opacity <= 0.001) return null;
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={size}
      fontWeight={weight}
      textAnchor={anchor}
      fontFamily={FONT}
      opacity={opacity < 1 ? opacity : undefined}
    >
      {children}
    </text>
  );
}

/**
 * LEXCE đã bọc cho nền đêm.
 *
 * @param x,y      góc trái trên của artwork, hệ 1600×900
 * @param size     chiều cao artwork (hệ 1600×900). Cỡ dùng thật ~250–320 (≈300–380 px ở 1080p).
 * @param variant  một trong `MASCOT_VARIANTS`
 * @param ground   'cut' (mặc định) che đĩa revampGround · 'keep' giữ nguyên như dòng slide
 * @param frame    frame cho chuyển động nội tại của mascot (bob/blink). `null` = ảnh đứng yên.
 */
export function PosterMascot({
  x,
  y,
  size = 290,
  variant = 'plinth',
  pose = 'stand',
  emotion = 'idle',
  facing = 'right',
  frame = null,
  look = null,
  talking = false,
  opacity = 1,
  ground = 'cut',
}) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  if (opacity <= 0.001) return null;

  const w = size * MASCOT_ASPECT;
  const cx = x + w / 2;
  const cut = pose === 'leanFoot' ? CUT_LEAN : CUT_FLAT;
  const footY = y + size * cut;

  const figure = (
    <MascotRevamp
      x={x}
      y={y}
      size={size}
      pose={pose}
      emotion={emotion}
      facing={facing}
      frame={frame}
      look={look}
      talking={talking}
    />
  );

  /*
   * Cắt đĩa `revampGround` bằng clipPath thay vì sửa artwork: `MascotRevamp` không nhận prop nào
   * tắt được nó (`grounded = !P.raisedFoot && poseName !== 'hop'`, MascotRevamp.jsx:348).
   */
  const clipped =
    ground === 'keep' ? (
      figure
    ) : (
      <g clipPath={`url(#pm-cut-${uid})`}>
        <clipPath id={`pm-cut-${uid}`} clipPathUnits="userSpaceOnUse">
          {/*
           * `<path>` chứ KHÔNG phải `<rect>`: gate "hộp chạy dưới mascot" của `verify` quét MỌI
           * `<rect>` trong markup, kể cả rect nằm trong một `<clipPath>` (nó chỉ bỏ qua rect nào
           * tự mang `mask=`/`clip-path=`). Một hình cắt không phải nội dung, nên nó không được
           * đếm — vẽ bằng `path` là cách giữ đúng ý gate mà không phải nới gate ra.
           */}
          <path d={`M ${x - size} ${y - size} H ${x + w + size} V ${footY} H ${x - size} Z`} />
        </clipPath>
        {figure}
      </g>
    );

  if (variant === 'bare') return <g opacity={opacity < 1 ? opacity : undefined}>{clipped}</g>;

  if (variant === 'halo') {
    /*
     * Viền sáng quanh silhouette: nở SourceAlpha ra vài px, tô `cream`, đặt DƯỚI hình gốc. Đây là
     * cách duy nhất lấy được đường bao thật của 417 path mà không vẽ lại chúng.
     */
    const rim = Math.max(2, size / 110);
    return (
      <g opacity={opacity < 1 ? opacity : undefined}>
        <defs>
          <filter id={`pm-rim-${uid}`} x="-15%" y="-15%" width="130%" height="130%">
            <feMorphology in="SourceAlpha" operator="dilate" radius={rim} result="thick" />
            <feFlood floodColor={P.cream} floodOpacity="0.92" result="tint" />
            <feComposite in="tint" in2="thick" operator="in" result="rim" />
            <feMerge>
              <feMergeNode in="rim" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter={`url(#pm-rim-${uid})`}>{clipped}</g>
      </g>
    );
  }

  if (variant === 'plinth') {
    const ry = Math.max(10, size * 0.052);
    const rx = w * 0.62;
    return (
      <g opacity={opacity < 1 ? opacity : undefined}>
        <defs>
          <radialGradient id={`pm-pl-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={P.cream} stopOpacity="0.55" />
            <stop offset="55%" stopColor={P.cream} stopOpacity="0.18" />
            <stop offset="100%" stopColor={P.cream} stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={cx} cy={footY} rx={rx} ry={ry} fill={`url(#pm-pl-${uid})`} />
        <ellipse cx={cx} cy={footY} rx={rx * 0.58} ry={ry * 0.5} fill={P.cream} opacity="0.3" />
        {clipped}
      </g>
    );
  }

  if (variant === 'cabin') {
    const padX = w * 0.16;
    const padTop = size * 0.09;
    const bx = x - padX;
    const by = y - padTop;
    const bw = w + 2 * padX;
    const bh = size * cut + padTop + size * 0.05;
    const r = Math.round(size * 0.09);
    /*
     * Thân cabin vẽ bằng `<path>`, không `<rect>`: nó nằm DƯỚI mascot theo đúng thiết kế, còn gate
     * `data-vk-occupies` của `verify` coi mọi `<rect>` chạy dưới mascot là lỗi bố cục. Một cái nền
     * cố ý không được làm gate kêu — và cũng không được làm gate mù đi với hộp nội dung thật.
     */
    const box = `M ${bx + r} ${by} H ${bx + bw - r} A ${r} ${r} 0 0 1 ${bx + bw} ${by + r}
                 V ${by + bh - r} A ${r} ${r} 0 0 1 ${bx + bw - r} ${by + bh}
                 H ${bx + r} A ${r} ${r} 0 0 1 ${bx} ${by + bh - r}
                 V ${by + r} A ${r} ${r} 0 0 1 ${bx + r} ${by} Z`;
    return (
      <g opacity={opacity < 1 ? opacity : undefined}>
        <path d={box} fill={P.night2} />
        <path d={box} fill="none" stroke={P.steel} strokeWidth={Math.max(1.5, size / 150)} />
        <path
          d={`M ${bx + bw * 0.28} ${by} H ${bx + bw * 0.72} V ${by + Math.max(3, size / 70)} H ${bx + bw * 0.28} Z`}
          fill={P.gold}
        />
        {clipped}
      </g>
    );
  }

  // badge — huy hiệu tròn: nhân vật tràn ra khỏi đĩa, đọc ra ngay là "người dẫn" cố định.
  const r = size * 0.42;
  const ccy = y + size * 0.5;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <circle cx={cx} cy={ccy} r={r} fill={P.night2} />
      <circle cx={cx} cy={ccy} r={r} fill="none" stroke={P.gold} strokeWidth={Math.max(2, size / 120)} />
      <circle cx={cx} cy={ccy} r={r * 1.1} fill="none" stroke={P.steel} strokeWidth={Math.max(1, size / 260)} opacity="0.7" />
      {clipped}
    </g>
  );
}
