/**
 * Khung điện thoại tông POSTER — bản vẽ lại của `components/ui/PhoneFrame.jsx` cho nền đêm.
 *
 * VÌ SAO KHÔNG DÙNG LẠI `PhoneFrame`: nó khoá cứng bảng màu dòng slide ngay trong thân hàm
 * (`fill={C.bg}` cho thân máy, `C.bgAlt` cho thanh trạng thái, `stroke={C.accent}` cho viền,
 * `C.text` cho chữ — PhoneFrame.jsx:196-213) và KHÔNG có một prop màu nào. Đặt nó lên `night` thì
 * hai chiếc máy trở thành hai tấm bảng TRẮNG 280×606 — tức là đúng cái "hai card-bullet" mà dòng
 * poster tồn tại để tránh. Sửa `PhoneFrame` để nhận màu sẽ đụng mọi video dòng slide đã render.
 *
 * Thân `deep` (tối hơn nền `night` → đọc ra là một VẬT trên nền, không phải một ô nội dung), viền
 * `steel` hairline + một vệt `gold` mảnh ở cạnh trên, màn hình `night2`, chữ `cream`/`ice`.
 * `tone` đổi màu nhấn: `do` → `mint`, `dont` → `coral`.
 *
 * Mọi chữ là `<text>` SVG nên `qa-layout.mjs` đo được cỡ chữ BÊN TRONG khung máy — và nó đo CẢ
 * chrome của khung (giờ, tên app, placeholder ô nhập), nên cỡ 15-16 kiểu `PhoneFrame` dòng slide
 * làm gate đỏ ngay. Mọi chuỗi trong file này ≥ 19 (hệ 1600×900) = ≥ 22,8 px ở 1920×1080.
 *
 * Tất định: chỉ phụ thuộc `T` và prop. Không `Math.random`, không `window`, không RAF.
 */
import React from 'react';
import { POSTER as P, POSTER_FONT as FONT } from '../tokens.js';
import { usePosterTheme } from './theme.jsx';

const STATUS_H = 44;
const CORNER_R = 34;

/** Màu nhấn theo ý nghĩa của màn hình. */
export const PHONE_TONE = Object.freeze({ neutral: P.ice, do: P.mint, dont: P.coral });
const phoneTone = (th) => ({ neutral: th.lineStrong, do: th.positive, dont: th.negative });

/** Ô ruột của một khung máy — luôn đặt children bằng hàm này, đừng ước lượng dưới thanh trạng thái. */
export function posterPhoneBox({ x, y, w, h }, pad = 20) {
  return { x: x + pad, y: y + STATUS_H + pad, w: w - 2 * pad, h: h - STATUS_H - 2 * pad };
}

/**
 * Rung ngang tắt dần — dùng cho màn hình "AI trả lời chắc nịch nhưng sai".
 * Hàm thuần của `T`: `at` là giây bắt đầu, `dur` là thời gian rung, biên độ giảm tuyến tính về 0.
 */
export function shakeX(T, at, { amp = 6, hz = 9, dur = 0.5 } = {}) {
  const t = T - at;
  if (t < 0 || t > dur) return 0;
  return Math.sin(t * hz * Math.PI * 2) * amp * (1 - t / dur);
}

/** Chữ SVG trong khung máy. `y` là BASELINE. */
export function PhoneText({ x, y, size = 20, weight = 600, color, anchor = 'start', opacity = 1, children }) {
  const th = usePosterTheme();
  color = color || th.ink;
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

/** Một dòng "tin nhắn" trong màn hình app: bong bóng bo góc + chữ. */
export function PhoneBubble({ x, y, w, h = 52, text, size = 19, color = P.cream, fill = P.deep, stroke, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={12} fill={fill} stroke={stroke} strokeWidth={stroke ? 1.5 : undefined} />
      <PhoneText x={x + 14} y={y + h / 2 + size * 0.36} size={size} color={color}>
        {text}
      </PhoneText>
    </g>
  );
}

/** Nút trong màn hình app — `tone` quyết định màu viền/chữ. */
export function PhoneButton({ x, y, w, h = 46, label, tone = 'neutral', filled = false, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const c = PHONE_TONE[tone] || P.ice;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={filled ? c : 'none'} stroke={c} strokeWidth={2} />
      <PhoneText x={x + w / 2} y={y + h / 2 + 7} size={19} weight={700} anchor="middle" color={filled ? P.deep : c}>
        {label}
      </PhoneText>
    </g>
  );
}

/**
 * Khung máy.
 *
 * @param appName tên app HƯ CẤU (không bao giờ tên sản phẩm thật)
 * @param tone    'neutral' | 'do' | 'dont' — màu viền nhấn + màu vệt trên
 * @param variant 'plain' | 'chat' — `chat` vẽ thanh nhập liệu ở đáy, ĐÈ LÊN children
 */
export function PosterPhone({
  x,
  y,
  w = 280,
  h = 560,
  appName,
  time = '9:41',
  tone = 'neutral',
  variant = 'plain',
  opacity = 1,
  children,
}) {
  const th = usePosterTheme();
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  if (opacity <= 0.001) return null;
  const c = phoneTone(th)[tone] || th.lineStrong;
  /*
   * Nền đêm: thân `deep` TỐI hơn nền → đọc ra là một VẬT. Nền trắng thì ngược lại: một thân navy
   * đặc giữa khung trắng đọc ra là một MẢNG MỰC, không phải cái máy. Bản light dùng thân TRẮNG +
   * viền navy dày, màn `bgAlt` — đúng ngôn ngữ thẻ của design system (xem n5-01).
   */
  const light = th.chrome === 'vinuni';
  const bodyFill = light ? th.bg : P.deep;
  const screenFill = light ? th.surface : P.night2;
  const chromeInk = light ? th.inkMuted : P.ice;
  const clip = `pp-${uid}`;
  const iconY = y + STATUS_H / 2;
  const bars = [0.42, 0.62, 0.82, 1];

  const chatBar =
    variant === 'chat' ? (
      <g>
        <line x1={x} x2={x + w} y1={y + h - 62} y2={y + h - 62} stroke={P.steel} strokeWidth={1.5} opacity={0.6} />
        <rect x={x + 16} y={y + h - 52} width={w - 16 - 58} height={36} rx={18} fill={P.night} stroke={P.steel} strokeWidth={1.5} />
        <PhoneText x={x + 30} y={y + h - 27} size={19} weight={500} color={P.ice}>
          Nhắn tin…
        </PhoneText>
        <circle cx={x + w - 32} cy={y + h - 34} r={15} fill={c} />
        <path
          d={`M ${x + w - 39} ${y + h - 41} L ${x + w - 24} ${y + h - 34} L ${x + w - 39} ${y + h - 27} Z`}
          fill={P.deep}
        />
      </g>
    ) : (
      <rect x={x + w / 2 - w * 0.13} y={y + h - 16} width={w * 0.26} height={4} rx={2} fill={th.lineStrong} />
    );

  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <clipPath id={clip}>
        <rect x={x} y={y} width={w} height={h} rx={CORNER_R} />
      </clipPath>

      {/* thân máy: TỐI hơn nền → là một vật, không phải một ô nội dung */}
      <rect x={x} y={y} width={w} height={h} rx={CORNER_R} fill={bodyFill} stroke={light ? th.ink : undefined} strokeWidth={light ? 4 : undefined} />
      {/* màn hình */}
      <rect x={x} y={y + STATUS_H} width={w} height={h - STATUS_H} fill={screenFill} clipPath={`url(#${clip})`} />

      {/* thanh trạng thái — giờ, tên app hư cấu, cụm icon vẽ tay */}
      <PhoneText x={x + 18} y={iconY + 7} size={19} weight={700} color={chromeInk}>
        {time}
      </PhoneText>
      {appName ? (
        <PhoneText x={x + w / 2} y={iconY + 7} size={19} weight={700} anchor="middle" color={th.ink}>
          {appName}
        </PhoneText>
      ) : null}
      {bars.map((f, i) => (
        <rect
          key={i}
          x={x + w - 74 + i * 6}
          y={iconY + 5 - 11 * f}
          width={4}
          height={11 * f}
          rx={1}
          fill={chromeInk}
        />
      ))}
      <path
        d={`M ${x + w - 44} ${iconY + 1} A 8 8 0 0 1 ${x + w - 28} ${iconY + 1}`}
        fill="none"
        stroke={chromeInk}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={x + w - 36} cy={iconY + 6} r={1.8} fill={chromeInk} />
      <rect x={x + w - 22} y={iconY - 5} width={16} height={10} rx={3} fill="none" stroke={chromeInk} strokeWidth={1.5} />
      <rect x={x + w - 20} y={iconY - 3} width={10} height={6} rx={1.5} fill={chromeInk} />

      <line x1={x} x2={x + w} y1={y + STATUS_H} y2={y + STATUS_H} stroke={th.lineStrong} strokeWidth={1.5} opacity={0.7} />

      <g clipPath={`url(#${clip})`}>{children}</g>
      <g clipPath={`url(#${clip})`}>{chatBar}</g>

      {/* viền: steel hairline cho thân, vệt tone mảnh ở cạnh trên → nhận diện Do/Don't từ xa */}
      <rect x={x} y={y} width={w} height={h} rx={CORNER_R} fill="none" stroke={P.steel} strokeWidth={2} />
      <rect x={x + w * 0.3} y={y + 3} width={w * 0.4} height={3.5} rx={2} fill={c} />
    </g>
  );
}
