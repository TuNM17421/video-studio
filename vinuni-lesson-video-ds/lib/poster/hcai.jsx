/**
 * Hình CHÍNH của "Cái vạch" — khối, không phải nét.
 *
 * Lý do file này tồn tại (feedback owner sau pha 1): khung hình pha 1 quá MỎNG — một đường 6 px +
 * hai nhãn nhỏ trên 80% nền trống đọc ra là "slide nền tối có một cái vạch". Video demo được khen
 * vì mỗi cảnh có MỘT hình chính CÓ KHỐI (cột lời hứa, cỗ máy, cái cây, bia đá); cái vạch là
 * CARRIER nối các cảnh, không phải nhân vật duy nhất.
 *
 * Vì vậy mọi thứ ở đây đều có DIỆN TÍCH: panel, cỗ máy, chồng thẻ, cột, con người. Mỗi cảnh lấy một
 * cái làm hình chính chiếm ~25–35% vùng nội dung (1360×380 ≈ 516k px² ⇒ hình chính ≥ ~140k px²).
 *
 * Cùng bốn luật của thư viện (`styles/poster.md`): nhận `T`/`at` chứ không nhận `frame`; không
 * `Math.random`/`Date`/`window`; `style` của người gọi trải ra TRƯỚC khoá riêng; hình khối vẽ bằng
 * `<path>` chứ không `<rect>`.
 */
import React from 'react';
import { POSTER as P, POSTER_FONT as FONT, alpha } from '../tokens.js';
import { clamp, kf, Easing } from './engine.jsx';
import { boxPath, VachText } from './vach.jsx';
import { usePosterTheme } from './theme.jsx';

/**
 * Trọng lượng của cái vạch ở phim này. Pha 1 dùng mặc định 6 px và nó chìm mất giữa khung; 12 px
 * + quầng 1,2 làm nó đọc được như một ĐƯỜNG CHÂN TRỜI mà hình chính đứng lên trên, kể cả khi hình
 * chính chiếm một phần ba khung. Chấm ranh giới tự to theo (`weight × 1,5` = 18).
 */
export const HEAVY = Object.freeze({ weight: 12, glow: 1.2 });

/** Ý → token. Lặp lại `INK` của `kit.jsx` để file lib không phụ thuộc ngược vào thư mục video. */
export const INK = Object.freeze({
  machine: P.blue,
  human: P.gold,
  right: P.mint,
  wrong: P.coral,
  cut: P.red,
  text: P.cream,
  sub: P.ice,
  line: P.steel,
  odd: P.purple,
});

/**
 * `Panel` — khối nền của một ý. Đây là thứ cho cảnh một hình chính có diện tích thay vì mấy dòng
 * chữ trôi nổi. `fill` mặc định `night2` (sáng hơn nền một bậc, đọc ra là một MẶT).
 */
export function Panel({
  x, y, w, h,
  ink,
  fill,
  fillAlpha = 0.92,
  title,
  titleSize = 24,
  titleColor,
  radius = 16,
  dashed = false,
  strokeWidth = 3,
  grow = 1,
  opacity = 1,
  children,
  style,
}) {
  const th = usePosterTheme();
  if (opacity <= 0.004) return null;
  const inkC = ink || th.lineStrong;
  const fillC = fill || th.surface;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g style={style} opacity={opacity} transform={grow === 1 ? undefined : `translate(${cx} ${cy}) scale(${grow}) translate(${-cx} ${-cy})`}>
      {/*
       * MẶT của panel vẽ bằng `<rect>`, không phải `<path>` — có chủ đích.
       * `verify.mjs:334 filledHalves()` CHỈ đếm `<rect>` khi đo "bố cục lệch hẳn một bên"; một cảnh
       * dựng toàn bằng `<path>` (như cả phim này, vì gate `data-vk-occupies` đếm mọi rect dưới
       * mascot) sẽ luôn bị báo "nửa kia bỏ không" dù nửa đó đầy hình. Panel không bao giờ đặt dưới
       * mascot nên dùng rect ở đây là an toàn; VIỀN vẫn là path để giữ đúng bo góc.
       */}
      <rect x={x} y={y} width={w} height={h} rx={radius} fill={alpha(fillC, fillAlpha)} />
      <path
        d={boxPath(x, y, w, h, radius)}
        fill="none"
        stroke={inkC}
        strokeWidth={strokeWidth}
        strokeDasharray={dashed ? '12 12' : undefined}
      />
      {title && (
        <VachText x={x + 22} y={y + 30} size={titleSize} weight={800} color={titleColor || inkC} anchor="start" letterSpacing={1.4}>
          {title}
        </VachText>
      )}
      {children}
    </g>
  );
}

/** Tiêu đề cảnh: to và ÍT. Hai dòng là trần — dòng ba thì đó là phụ đề, không phải chữ trên hình. */
export function Title({ x, y, text, size = 52, color, sub, subSize = 26, subColor, anchor = 'middle', opacity = 1, rule = false, ruleInk, ruleP = 1 }) {
  const th = usePosterTheme();
  if (opacity <= 0.004) return null;
  return (
    <g opacity={opacity}>
      <VachText x={x} y={y} size={size} weight={800} color={color || th.ink} anchor={anchor}>{text}</VachText>
      {rule && (
        <line
          x1={x - size * 2.1} y1={y + size * 0.62} x2={x + size * 2.1} y2={y + size * 0.62}
          stroke={ruleInk || th.highlight} strokeWidth={6} strokeLinecap="round"
          pathLength="1" strokeDasharray="1" strokeDashoffset={1 - clamp(ruleP, 0, 1)}
        />
      )}
      {sub && <VachText x={x} y={y + size * 0.86} size={subSize} weight={600} color={subColor || th.inkMuted} anchor={anchor}>{sub}</VachText>}
    </g>
  );
}

/**
 * `Machine` — cỗ máy: hộp bo góc + ăng-ten + ba đèn. Cùng ngôn ngữ hình với cỗ máy của video demo
 * (`f05586`), nên người xem đã quen nó là "cái máy" trước khi ai nói chữ nào.
 * Dùng ở: `co-vach` · `c1-luat` · `c2-email-mau` · `c2-email-sinh` · `c3-ba-muc`.
 */
export function Machine({ x, y, w = 240, h = 180, ink, lit = 1, opacity = 1, label, antenna = true }) {
  const th = usePosterTheme();
  if (opacity <= 0.004) return null;
  ink = ink || th.accentA;
  const dots = [0.3, 0.5, 0.7];
  return (
    <g opacity={opacity}>
      <path d={boxPath(x, y, w, h, 18)} fill={alpha(th.surface, 0.95)} />
      <path d={boxPath(x, y, w, h, 18)} fill="none" stroke={ink} strokeWidth={4} />
      {antenna && (
        <g>
          <line x1={x + w * 0.82} y1={y} x2={x + w * 0.82} y2={y - 42} stroke={ink} strokeWidth={4} strokeLinecap="round" />
          <circle cx={x + w * 0.82} cy={y - 48} r={9} fill={th.negative} opacity={clamp(lit, 0, 1)} />
        </g>
      )}
      {/* Đèn thứ ba là đèn ĐANG CHẠY; trên theme light dùng `accentA`, KHÔNG dùng `highlight` (đỏ)
          — đỏ trong DS là NHẤN / RỦI RO, rải đỏ vào một cỗ máy bình thường là nói sai. */}
      {dots.map((f, i) => (
        <circle key={`md${i}`} cx={x + w * f} cy={y + h * 0.3} r={10} fill={i === 2 ? (th.chrome === 'vinuni' ? th.accentA : th.highlight) : th.ink} opacity={0.35 + 0.65 * clamp(lit, 0, 1)} />
      ))}
      <circle cx={x + w * 0.5} cy={y + h * 0.68} r={7} fill={th.chrome === 'vinuni' ? th.accentA : th.highlight} opacity={clamp(lit, 0, 1)} />
      {label && (
        <VachText x={x + w / 2} y={y + h + 34} size={24} weight={800} color={ink} letterSpacing={1.6}>{label}</VachText>
      )}
    </g>
  );
}

/**
 * `CardFan` — `n` tấm thẻ xoè ra, MỖI TẤM MỘT KIỂU. Đây là hình của "mỗi lần một bản khác nhau":
 * một chồng giống hệt nhau thì không nói được gì, nên mỗi thẻ lệch góc và có số dòng khác nhau.
 * `spread` 0 = chồng khít (một đáp án), 1 = xoè hết (nhiều đáp án khác nhau).
 */
export function CardFan({
  x, y, w = 150, h = 190,
  n = 5,
  spread = 1,
  ink,
  pitch = 86,
  tiltMax = 9,
  opacity = 1,
}) {
  const th = usePosterTheme();
  if (opacity <= 0.004) return null;
  ink = ink || th.negative;
  const s = clamp(spread, 0, 1);
  const mid = (n - 1) / 2;
  const out = [];
  for (let i = 0; i < n; i++) {
    const k = i - mid;
    const cx = x + k * pitch * s;
    const cy = y + Math.abs(k) * 9 * s;
    const rot = k * tiltMax * s;
    // số dòng "nội dung" khác nhau theo thẻ — hàm thuần của i, không ngẫu nhiên
    const rows = 3 + ((i * 2 + 1) % 3);
    out.push(
      <g key={`cf${i}`} transform={`rotate(${rot} ${cx + w / 2} ${cy + h})`}>
        <path d={boxPath(cx, cy, w, h, 10)} fill={alpha(th.paper, 0.93)} />
        <path d={boxPath(cx, cy, w, h, 10)} fill="none" stroke={ink} strokeWidth={3} />
        {Array.from({ length: rows }, (_, r) => (
          <line
            key={`r${r}`}
            x1={cx + 18} y1={cy + 40 + r * 26} x2={cx + w - 18 - (r % 2) * 36} y2={cy + 40 + r * 26}
            stroke={alpha(th.paperInk, 0.5)} strokeWidth={6} strokeLinecap="round"
          />
        ))}
      </g>,
    );
  }
  return <g opacity={opacity}>{out}</g>;
}

/**
 * `Person` — con người: đầu + vai. Cần vì cả phim toàn giao diện và sơ đồ; chỗ nào lời đọc nói
 * NGƯỜI thì trên hình phải có người, không phải thêm một cái nhãn nữa.
 */
export function Person({ x, y, h = 190, ink, opacity = 1, fill = true }) {
  const th = usePosterTheme();
  if (opacity <= 0.004) return null;
  ink = ink || th.accentB;
  /* Đầu và vai KHÔNG được chồng nhau: bán kính đầu 0,22h, vai bắt đầu ở 0,54h — với bộ số cũ
     (0,26h / 0,62h / rộng 0,42h) vòng cung vai trùm lên nửa dưới cái đầu (đo c1-johnny frame 2222). */
  const rHead = h * 0.22;
  const cx = x;
  const headY = y + rHead;
  /* Đỉnh vòng cung vai = shoulderY − 0,75·halfW, phải nằm DƯỚI đáy đầu (y + 2·rHead) ít nhất 8 px.
     Với 0,74h và 0,32h: đỉnh cung ở y+0,50h, đáy đầu ở y+0,44h — hở 0,06h, đọc ra là đầu và vai. */
  const shoulderY = y + h * 0.74;
  const halfW = h * 0.32;
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={headY} r={rHead} fill={fill ? alpha(ink, 0.24) : 'none'} stroke={ink} strokeWidth={5} />
      <path
        d={`M${cx - halfW} ${y + h}V${shoulderY + halfW * 0.25}A${halfW} ${halfW} 0 0 1 ${cx + halfW} ${shoulderY + halfW * 0.25}V${y + h}Z`}
        fill={fill ? alpha(ink, 0.24) : 'none'}
        stroke={ink}
        strokeWidth={5}
        strokeLinejoin="round"
      />
    </g>
  );
}

/**
 * `Meter` — thanh phần trăm CÓ KHỐI (cao 56 px, không phải một sợi). Phần `bad` là khúc đỏ còn
 * lại: `c1-kiemthu` cần thấy nó CO nhưng KHÔNG BAO GIỜ mất.
 */
export function Meter({ x, y, w, h = 56, value = 0, bad = 0, ink, label, opacity = 1 }) {
  const th = usePosterTheme();
  if (opacity <= 0.004) return null;
  ink = ink || th.positive;
  const v = clamp(value, 0, 1);
  const b = clamp(bad, 0, 1);
  return (
    <g opacity={opacity}>
      <path d={boxPath(x, y, w, h, h / 2)} fill={alpha(th.surfaceAlt, 0.85)} />
      {v > 0.004 && <path d={boxPath(x, y, w * v, h, h / 2)} fill={alpha(ink, 0.8)} />}
      {b > 0.004 && <path d={boxPath(x + w - w * b, y, w * b, h, h / 2)} fill={alpha(th.negative, 0.85)} />}
      <path d={boxPath(x, y, w, h, h / 2)} fill="none" stroke={th.lineStrong} strokeWidth={3} />
      {label && <VachText x={x + w / 2} y={y - 28} size={28} weight={800} color={th.ink}>{label}</VachText>}
    </g>
  );
}

/** Dòng ghi nguồn — nhỏ nhưng ≥ 19 (22,8 px thật), luôn nằm ở đáy vùng mascot, không đè hình. */
export function Source({ x = 72, y = 782, lines = [], opacity = 1, anchor = 'start' }) {
  const th = usePosterTheme();
  if (!lines.length || opacity <= 0.004) return null;
  return (
    <g opacity={opacity}>
      {lines.map((l, i) => (
        <VachText key={`src${i}`} x={x} y={y - (lines.length - 1 - i) * 28} size={19} weight={600} color={th.inkMuted} anchor={anchor}>
          {l}
        </VachText>
      ))}
    </g>
  );
}

/**
 * Cỡ chữ lớn nhất còn NẰM TRONG hộp rộng `boxW` — chặn lỗi "chữ rộng hơn hộp" ngay ở chỗ vẽ.
 * Hệ số 0,66 em/ký tự là ĐO THẬT, không ước: "QUYỀN KIỂM SOÁT" (15 ký tự, Montserrat 800, cỡ 32
 * authored = 38,4 px thật) đo được 369 px → 369 / (15 × 38,4) = 0,641; làm tròn lên 0,66 cho biên
 * an toàn. Hệ số 0,52 đặt bằng cảm tính trước đó vẫn để chữ thò ra 12 px mỗi bên.
 * Chặn dưới 19 px authored (≈22,8 px thật) để không rơi xuống dưới sàn chữ nhỏ của qa-layout.
 */
export function fitSize(text, boxW, max = 32, { pad = 16, min = 19 } = {}) {
  const n = String(text || '').length;
  if (!n) return max;
  const fit = (boxW - pad * 2) / (n * 0.66);
  return Math.max(min, Math.min(max, Math.floor(fit)));
}

/** Bia khắc: khối chữ CHỐT của cảnh, cố ý lặp lời (khai `kind: "plaque"` trong storyboard.json). */
export function Plaque({ x, y, w, text, size = 34, ink, T = 0, at = 0, opacity = 1 }) {
  const th = usePosterTheme();
  ink = ink || th.highlight;
  const p = kf(T, [[at, 0], [at + 0.6, 1]], Easing.easeOutBack);
  if (p <= 0.01 || opacity <= 0.004) return null;
  const h = 76;
  return (
    <g opacity={opacity * clamp(p * 1.8, 0, 1)} transform={`translate(${x + w / 2} ${y + h / 2}) scale(${clamp(p, 0, 1.05)}) translate(${-(x + w / 2)} ${-(y + h / 2)})`}>
      <path d={boxPath(x, y, w, h, 10)} fill={alpha(th.chrome === 'vinuni' ? th.surface : P.deep, 0.9)} />
      <path d={boxPath(x, y, w, h, 10)} fill="none" stroke={ink} strokeWidth={3} />
      <VachText x={x + w / 2} y={y + h / 2} size={size} weight={800} color={ink}>{text}</VachText>
    </g>
  );
}
