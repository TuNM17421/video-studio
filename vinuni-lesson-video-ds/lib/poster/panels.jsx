/**
 * Bốn primitive mà 36 cảnh của `d05-v06-human-centered-ai-design` dùng lặp lại, và `lib/poster/`
 * chưa có. Mỗi cái đều ≥2 chỗ dùng (luật 4 của `styles/poster.md` — một chỗ dùng thì để nguyên trong
 * thư mục video):
 *
 *   `Paper`     tấm séc (c1-sec) · hoá đơn chuyến đi (c3-case-trip) · hồ sơ (c3-case-cv) ·
 *               tờ giấy hẹn khám (c5-sua) · trang nhật ký (c3-case-tam-trang)
 *   `StatePill` cặp nút Do/Don't: c1-sec · c3-case-trip · c3-case-calo · c3-case-cv ·
 *               c3-case-tam-trang · c4-hoi-lai · c4-duyet · c5-undo
 *   `Stack`     cột kịch bản (c2-email-mau/sinh) · chồng hồ sơ (c3-case-cv) ·
 *               ngăn xếp phiên bản (c5-undo) · đống gợi ý rơi (c4-copilot)
 *   `PhoneRow`  ba mức độ chắc (c3-ba-muc) · cặp Do/Don't của mọi case app · c5-flora
 *
 * Cùng bốn luật của thư viện: nhận `T`/`at` chứ không nhận `frame`; không `Math.random`/`Date`/
 * `window`; `style` của người gọi trải ra TRƯỚC khoá riêng; hình KHỐI vẽ bằng `<path>` không
 * `<rect>` (gate `data-vk-occupies`).
 */
import React from 'react';
import { POSTER as P, POSTER_FONT as FONT, alpha } from '../tokens.js';
import { clamp, kf, Easing } from './engine.jsx';
import { boxPath, VachText } from './vach.jsx';
import { PosterPhone } from './phone.jsx';
import { usePosterTheme } from './theme.jsx';

export const TONE_INK = Object.freeze({ neutral: P.ice, do: P.mint, dont: P.coral, warm: P.gold });
/** Tông theo THEME — `TONE_INK` giữ lại cho code cũ, cái dùng thật là hàm này. */
const toneInk = (th) => ({ neutral: th.inkMuted, do: th.positive, dont: th.negative, warm: th.accentB });

/** Ngưỡng chữ đọc được trên khung render: 19 ở hệ 1600×900 = 22,8 px ở 1920×1080. */
export const MIN_TEXT = 19;

/**
 * `Paper` — một tờ giấy vector trên nền đêm: séc, hoá đơn, hồ sơ, giấy hẹn.
 *
 * Thân `cream` (13,5:1 với `night`) nên nó đọc ra là GIẤY chứ không phải một card giao diện; chữ
 * trên giấy dùng `deep`. `grow` là hệ số phóng to quanh tâm — đó là cách `c1-sec` cho thấy tấm séc
 * VƯỢT khỏi hộp năng lực mà không phải vẽ hai tờ khác nhau.
 */
export function Paper({
  x, y, w, h,
  title,
  lines = [],
  amount,
  tone = 'neutral',
  grow = 1,
  tilt = 0,
  sealed = 0,
  sealText = 'ĐÃ LOẠI',
  opacity = 1,
  style,
}) {
  const th = usePosterTheme();
  const ink = toneInk(th)[tone] || th.inkMuted;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const seal = clamp(sealed, 0, 1);
  return (
    <g style={style} opacity={opacity} transform={`translate(${cx} ${cy}) rotate(${tilt}) scale(${grow}) translate(${-cx} ${-cy})`}>
      <path d={boxPath(x + 5, y + 8, w, h, 6)} fill={alpha(th.ink, th.chrome === 'vinuni' ? 0.12 : 0.5)} />
      <path d={boxPath(x, y, w, h, 6)} fill={th.chrome === 'vinuni' ? th.bg : th.paper} />
      <path d={boxPath(x, y, w, h, 6)} fill="none" stroke={ink} strokeWidth={3} />
      <line x1={x} y1={y + 46} x2={x + w} y2={y + 46} stroke={alpha(th.lineStrong, 0.55)} strokeWidth={2} />
      {title && (
        <text x={x + 20} y={y + 30} fontFamily={FONT} fontSize={21} fontWeight={800} fill={th.paperInk} letterSpacing={1.3}>
          {title}
        </text>
      )}
      {lines.map((l, i) => (
        <text key={`pl${i}`} x={x + 20} y={y + 78 + i * 32} fontFamily={FONT} fontSize={MIN_TEXT} fontWeight={600} fill={th.paperInk} opacity={0.82}>
          {l}
        </text>
      ))}
      {amount && (
        <text x={x + w - 20} y={y + h - 22} fontFamily={FONT} fontSize={34} fontWeight={800} fill={th.paperInk} textAnchor="end">
          {amount}
        </text>
      )}
      {seal > 0 && (
        <g opacity={seal} transform={`translate(${cx} ${cy}) rotate(${-11}) scale(${0.7 + 0.3 * Easing.easeOutBack(seal)}) translate(${-cx} ${-cy})`}>
          <path d={boxPath(cx - 96, cy - 26, 192, 52, 8)} fill="none" stroke={th.cut} strokeWidth={5} />
          <text x={cx} y={cy + 9} fontFamily={FONT} fontSize={28} fontWeight={800} fill={th.cut} textAnchor="middle" letterSpacing={2}>
            {sealText}
          </text>
        </g>
      )}
    </g>
  );
}

/**
 * `StatePill` — một nút ở đúng MỘT trong hai trạng thái, và trạng thái đọc được từ xa bằng MÀU
 * chứ không bằng một cái thẻ "NÊN / KHÔNG NÊN" dán bên dưới (PROBE §B: đó là thứ biến cặp máy
 * thành hai card-bullet).
 *
 * `state`: `do` (mint) · `dont` (coral, kèm gạch ✕) · `neutral` (ice).
 * `at` là mốc `T` của cảnh; primitive tự bật ra bằng `easeOutBack` — "một item bật lên".
 */
export function StatePill({
  x, y, w, h = 52,
  text,
  state = 'neutral',
  T = 0,
  at = 0,
  filled = false,
  size = 22,
  opacity = 1,
  style,
}) {
  const th = usePosterTheme();
  const ink = toneInk(th)[state] || th.inkMuted;
  const p = kf(T, [[at, 0], [at + 0.45, 1]], Easing.easeOutBack);
  if (p <= 0.01) return null;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g style={style} opacity={opacity * clamp(p * 2, 0, 1)} transform={`translate(${cx} ${cy}) scale(${clamp(p, 0, 1.08)}) translate(${-cx} ${-cy})`}>
      <path d={boxPath(x, y, w, h, h / 2)} fill={filled ? alpha(ink, 0.9) : alpha(state === 'dont' ? th.negativeSoft : th.surface, 0.92)} />
      <path d={boxPath(x, y, w, h, h / 2)} fill="none" stroke={ink} strokeWidth={3} />
      <text
        x={cx}
        y={cy + 1}
        fontFamily={FONT}
        fontSize={size}
        fontWeight={700}
        fill={filled ? (th.chrome === 'vinuni' ? th.bg : P.deep) : ink}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {text}
      </text>
      {/* dấu ✕ vẽ ở MÉP TRÁI, không phải giữa pill: vẽ ở giữa thì nó đè lên chính dòng chữ
          (đo trên c1-sec frame 3024 — "✕ Auto-resolve customer issue" bị gạch mất chữ).
          Nhãn nào đã tự mở đầu bằng ✕ thì không vẽ thêm lần nữa. */}
      {state === 'dont' && p > 0.85 && !String(text).includes('✕') && (
        <g stroke={th.cut} strokeWidth={5} strokeLinecap="round">
          <line x1={x + 20} y1={cy - 13} x2={x + 46} y2={cy + 13} />
          <line x1={x + 46} y1={cy - 13} x2={x + 20} y2={cy + 13} />
        </g>
      )}
    </g>
  );
}

/**
 * `Stack` — một chồng lớp xếp theo chiều sâu: cột kịch bản, chồng hồ sơ, ngăn xếp phiên bản.
 *
 * `count` lớp, lớp `active` được kéo lên trên và sáng hơn. `reveal` 0→1 là số lớp đã xuất hiện —
 * đó là cách `c2-email-sinh` cho thấy cột dài THÊM ba ô mà không vẽ lại cả cột.
 * `lost` (0…1) làm các lớp dưới mờ đi rồi biến mất — `c5-undo` bản sai: không lấy lại được gì.
 */
export function Stack({
  x, y, w, h = 44,
  count = 3,
  pitch = 56,
  active = -1,
  reveal = 1,
  lost = 0,
  labels = [],
  tones = [],
  T = 0,
  opacity = 1,
  style,
}) {
  const th = usePosterTheme();
  const TI = toneInk(th);
  const shown = clamp(reveal, 0, 1) * count;
  const out = [];
  for (let i = 0; i < count; i++) {
    const app = clamp(shown - i, 0, 1);
    if (app <= 0) continue;
    const isActive = i === active;
    const ink = TI[tones[i]] || (isActive ? th.highlight : th.lineStrong);
    const fade = i === 0 ? 1 : 1 - clamp(lost, 0, 1);
    if (fade <= 0.02) continue;
    const ly = y + i * pitch - (isActive ? 12 : 0);
    const lx = x + (isActive ? -10 : 0) + (1 - app) * 34;
    out.push(
      <g key={`st${i}`} opacity={opacity * app * fade}>
        <path d={boxPath(lx, ly, w, h, 8)} fill={alpha(isActive ? th.surface : (th.chrome === 'vinuni' ? th.bg : P.deep), 0.94)} />
        <path d={boxPath(lx, ly, w, h, 8)} fill="none" stroke={ink} strokeWidth={isActive ? 4 : 2} />
        {labels[i] && (
          <text x={lx + 16} y={ly + h / 2 + 1} fontFamily={FONT} fontSize={MIN_TEXT} fontWeight={isActive ? 800 : 600} fill={isActive ? th.ink : th.inkMuted} dominantBaseline="middle">
            {labels[i]}
          </text>
        )}
      </g>,
    );
  }
  return <g style={style}>{out}</g>;
}

/**
 * `PhoneRow` — hai hoặc ba `PosterPhone` đứng thành hàng, kèm ĐƯỜNG NỐI mảnh giữa chúng.
 *
 * Đường nối là thứ nói "cùng một mô hình, chỉ khác cách thiết kế" — không có nó thì hai khung máy
 * đọc ra là hai card so sánh (PROBE §B). `enter` 0→1 là tiến độ trượt vào hàng; máy trượt từ ngoài
 * vào chứ không fade tại chỗ, để chuyển động có HƯỚNG.
 *
 * `items = [{ appName, tone, time, children }]` — nội dung mỗi màn do CẢNH vẽ, primitive chỉ lo
 * khung, chỗ đứng và đường nối.
 *
 * Trả về `<g>`: phải đặt bên trong một lớp SVG 1600×900 (`VachLayer` hoặc `MascotLayer`), giống
 * `PosterPhone` mà nó bọc.
 */
export function PhoneRow({
  x, y,
  items = [],
  w = 280,
  h = 512,
  gap = 96,
  link = true,
  enter = 1,
  T = 0,
  opacity = 1,
  style,
}) {
  const th = usePosterTheme();
  const n = items.length;
  if (!n) return null;
  const pitch = w + gap;
  const total = n * w + (n - 1) * gap;
  const left = x - total / 2;
  return (
    <g style={style} opacity={opacity < 1 ? opacity : undefined}>
      {link && n > 1 && items.slice(0, -1).map((_, i) => {
        const a = left + i * pitch + w;
        const p = clamp(enter * 1.4 - 0.4, 0, 1);
        return (
          <line
            key={`lk${i}`}
            x1={a} y1={y + h / 2} x2={a + gap} y2={y + h / 2}
            stroke={th.lineStrong} strokeWidth={2}
            pathLength="1" strokeDasharray="1" strokeDashoffset={1 - p}
          />
        );
      })}
      {items.map((it, i) => {
        const e = clamp(enter * (1 + n * 0.14) - i * 0.14, 0, 1);
        const slide = (1 - Easing.easeOutCubic(e)) * (i === 0 ? -110 : i === n - 1 ? 110 : 0);
        return (
          <PosterPhone
            key={`ph${i}`}
            x={left + i * pitch + slide}
            y={y}
            w={w}
            h={h}
            appName={it.appName}
            time={it.time}
            tone={it.tone}
            opacity={e}
          >
            {it.children}
          </PosterPhone>
        );
      })}
    </g>
  );
}

export { VachText };
