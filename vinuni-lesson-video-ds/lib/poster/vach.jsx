/**
 * CÁI VẠCH — carrier xuyên suốt `d05-v06-human-centered-ai-design` (11 phút, 36 cảnh).
 *
 * Một ẩn dụ duy nhất đi hết phim: **một đường sáng nằm ngang** chia khung thành hai phía —
 * bên TRÁI "máy tự làm" (lạnh, `blue`), bên PHẢI "người quyết" (ấm, `gold`). Mọi chương chỉ đổi
 * THAM SỐ của chính đường đó, không ai vẽ lại một cái vạch mới:
 *
 *   cold open  `p` 0→1 (vẽ ra) · `shift` (cả vạch trượt)
 *   C1         `cracks` (ray tước sợi, rạn)
 *   C2         `tilt` (đòn bẩy chúi hai phía) · `notches` (ba khấc đòn bẩy)
 *   C3         `band` (một ĐIỂM nở thành một KHOẢNG)
 *   C4         `zones` (ba băng KHÔNG LÀM · HỎI · TỰ LÀM co/nở theo cái giá khi sai)
 *   C5         `gapAt` (chỗ đứt) · `branches` (ba nhánh lối thoát mọc ra)
 *   outro      tất cả cùng lúc + `shift` sang phải
 *
 * Bốn luật của `styles/poster.md` được giữ: nhận `T`/`at` chứ không nhận `frame`; không
 * `Math.random`/`Date`/`window`; `style` của người gọi trải ra TRƯỚC khoá riêng; mọi hình KHỐI vẽ
 * bằng `<path>` chứ không `<rect>` (gate `data-vk-occupies` của `verify` đếm mọi `<rect>`, kể cả
 * rect trong `<clipPath>`, là "hộp nằm dưới mascot" — PROBE.md §E).
 */
import React from 'react';
import { POSTER as P, POSTER_FONT as FONT, alpha } from '../tokens.js';
import { clamp, kf, Easing, breathe } from './engine.jsx';
import { usePosterTheme } from './theme.jsx';

export const W = 1600;
export const H = 900;

/**
 * Hình học ĐÓNG BĂNG sau pha 1. Hai lane dựng cảnh đọc chung bộ số này; đổi một số ở đây là đổi
 * vị trí carrier ở cả 36 cảnh, nên đừng đổi mà không báo owner.
 *
 *   y = 556   — dưới tâm khung; chừa y 110–500 cho nội dung cảnh, y 600–812 cho nhãn + mascot
 *   x 150…1450 (rộng 1300) — hai mép chừa 150 px để nhãn hai phía không chạm mép khung
 *   shiftMax  — biên độ tối đa khi cả vạch trượt ngang (cold open, outro)
 */
export const VACH = Object.freeze({
  y: 556,
  x0: 150,
  x1: 1450,
  get w() { return this.x1 - this.x0; },
  weight: 6,
  shiftMax: 118,
  labelY: 612,
  lampY: 300,
  leftLabel: 'MÁY TỰ LÀM',
  rightLabel: 'NGƯỜI QUYẾT',
});

/** Toạ độ tuyệt đối của một điểm 0..1 trên vạch (dùng ở cảnh để đặt vật thể đúng chỗ). */
export const vachX = (u, { x0 = VACH.x0, x1 = VACH.x1 } = {}) => x0 + clamp(u, 0, 1) * (x1 - x0);

/** Hộp bo góc bằng `<path>` — thay cho `<rect>` (xem đầu file). */
export function boxPath(x, y, w, h, r = 0) {
  const rr = Math.min(r, w / 2, h / 2);
  if (rr <= 0) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  return (
    `M${x + rr} ${y}H${x + w - rr}A${rr} ${rr} 0 0 1 ${x + w} ${y + rr}` +
    `V${y + h - rr}A${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h}` +
    `H${x + rr}A${rr} ${rr} 0 0 1 ${x} ${y + h - rr}` +
    `V${y + rr}A${rr} ${rr} 0 0 1 ${x + rr} ${y}Z`
  );
}

/**
 * LƯỚI DỌC CỦA CẢNH — một chuỗi `transform` SVG mà MỌI lớp của cảnh cùng áp.
 *
 * Chrome của mỗi series chiếm phần trên khung một mức khác nhau (chrome poster cũ: một nhãn nhỏ
 * góc trái; chrome VinUni: eyebrow + headline + divider ăn tới y 220 thật). Thay vì sửa toạ độ
 * trong 36 cảnh mỗi lần đổi chrome, cảnh giữ nguyên hệ toạ độ của nó và `PosterStage` bơm xuống
 * đây một phép DỜI/THU đo được. `null` = không đụng gì, đúng hành vi cũ.
 */
export const SceneFitContext = React.createContext(null);

/** Lớp SVG 1600×900 cho cái vạch và mọi thứ vẽ chung hệ toạ độ với nó. */
export function VachLayer({ children, zIndex = 5, style }) {
  const fit = React.useContext(SceneFitContext);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      style={{ ...style, position: 'absolute', left: 0, top: 0, zIndex }}
    >
      {fit ? <g transform={fit}>{children}</g> : children}
    </svg>
  );
}

/** Chữ SVG trong cùng lớp với vạch — `verify` đọc `<text>`, không đọc `<div>` (video-anatomy §4). */
export function VachText({ x, y, size = 22, weight = 700, color, anchor = 'middle', opacity = 1, letterSpacing, children }) {
  const th = usePosterTheme();
  return (
    <text
      x={x}
      y={y}
      fontFamily={FONT}
      fontSize={size}
      fontWeight={weight}
      fill={color || th.inkMuted}
      textAnchor={anchor}
      letterSpacing={letterSpacing}
      opacity={opacity}
      dominantBaseline="middle"
    >
      {children}
    </text>
  );
}

/**
 * Một đoạn của vạch, vẽ bằng `<line>` có `pathLength=1` nên `p` cắt đúng theo BỀ NGANG.
 * Tách riêng để đoạn trái và đoạn phải nhận hai màu khác nhau mà vẫn là MỘT đường liền.
 */
function Seg({ x1, x2, y, stroke, width, p = 1, opacity = 1, cap = 'round' }) {
  if (x2 <= x1 || p <= 0) return null;
  return (
    <line
      x1={x1}
      y1={y}
      x2={x2}
      y2={y}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap={cap}
      pathLength="1"
      strokeDasharray="1"
      strokeDashoffset={1 - clamp(p, 0, 1)}
      opacity={opacity}
    />
  );
}

/**
 * Các sợi "tước ra" của C1: đường thẳng tách thành `n` sợi toả ra, biên độ theo `cracks`.
 * Hàm thuần của tham số — không `Math.random`, lệch pha bằng chỉ số sợi.
 */
function Frays({ x0, x1, y, n, amount, ink, weight }) {
  if (amount <= 0) return null;
  const out = [];
  const mid = (n - 1) / 2;
  for (let i = 0; i < n; i++) {
    const spread = (i - mid) / Math.max(mid, 1);
    const dy = spread * 52 * amount;
    const start = x0 + (x1 - x0) * 0.42;
    out.push(
      <path
        key={`fray${i}`}
        d={`M${start} ${y}Q${(start + x1) / 2} ${y + dy * 0.55} ${x1} ${y + dy}`}
        fill="none"
        stroke={ink}
        strokeWidth={weight * (0.42 + 0.22 * (1 - Math.abs(spread)))}
        strokeLinecap="round"
        opacity={clamp(amount * (0.55 + 0.45 * (1 - Math.abs(spread))), 0, 1)}
      />,
    );
  }
  return <g>{out}</g>;
}

/** Tông của ba băng theo THEME — `block` là vùng chưa kích hoạt, `ask` là nhấn, `auto` là đúng. */
const zoneInk = (th) => ({ block: th.chrome === 'vinuni' ? th.inkMuted : P.stripe, ask: th.accentB, auto: th.positive, warm: th.accentB, cold: th.accentA });

/**
 * `Vach` — cái vạch tham số hoá. MỘT primitive cho cả 11 phút.
 *
 * | tham số | nghĩa |
 * |---|---|
 * | `p` | 0→1 tiến độ VẼ RA của chính đường (cold open) |
 * | `shift` | −1…1 · cả vạch trượt ngang `shiftMax` px (câu hỏi "ai được dịch nó") |
 * | `divide` | 0…1 · vị trí điểm ranh giới giữa hai phía |
 * | `band` | `{ from, to }` · cái KHOẢNG (C3 → C4); `from === to` là một ĐIỂM |
 * | `zones` | `[{ from, to, tone, label }]` · ba băng KHÔNG LÀM · HỎI · TỰ LÀM (C4) |
 * | `tilt` | độ · đòn bẩy chúi (C2); quay quanh `divide` |
 * | `cracks` | 0…1 · ray tước thành sợi (C1) |
 * | `gapAt` | `{ at, w }` · chỗ ĐỨT trên vạch (C5) |
 * | `branches` | 0…1 · tiến độ vẽ ba nhánh lối thoát mọc ra từ chỗ đứt (C5) |
 * | `notches` | `[{ at, on }]` · các khấc khắc xuống vạch (C2 ba đòn bẩy) |
 * | `labels` | hiện hai nhãn hai phía |
 * | `pulse` | biên độ "thở" của quầng sáng; 0 = đứng im (mặc định — luật không idle-wobble) |
 *
 * Mọi tham số là số THUẦN do cảnh tính từ `beatT()`; primitive không tự đặt mốc thời gian nào.
 */
export function Vach({
  T = 0,
  y = VACH.y,
  x0 = VACH.x0,
  x1 = VACH.x1,
  p = 1,
  shift = 0,
  divide = 0.5,
  band = null,
  zones = null,
  tilt = 0,
  cracks = 0,
  gapAt = null,
  branches = 0,
  notches = null,
  labels = true,
  leftLabel = VACH.leftLabel,
  rightLabel = VACH.rightLabel,
  weight = VACH.weight,
  glow = 1,
  pulse = 0,
  opacity = 1,
  style,
}) {
  const th = usePosterTheme();
  const ZONE_INK = zoneInk(th);
  const dx = shift * VACH.shiftMax;
  const L = x0 + dx;
  const R = x1 + dx;
  const cut = L + clamp(divide, 0, 1) * (R - L);
  const live = clamp(p, 0, 1);
  const halo = glow * (pulse > 0 ? breathe(T, { min: 1 - pulse, max: 1, hz: 0.35 }) : 1);

  // Chỗ đứt: đoạn [gL, gR] không vẽ. Vạch vẫn là MỘT đường — đứt là một tham số, không phải hai vạch.
  const gL = gapAt ? L + clamp(gapAt.at, 0, 1) * (R - L) - (gapAt.w ?? 64) / 2 : null;
  const gR = gapAt ? gL + (gapAt.w ?? 64) : null;

  /**
   * Tiến độ vẽ của MỘT đoạn theo `p` TOÀN ĐƯỜNG: đoạn bên trái vẽ xong rồi mới tới đoạn bên phải.
   * Nếu để mỗi đoạn tự chạy 0→1 theo cùng `p` thì nửa trái và nửa phải mọc SONG SONG — nhìn ra hai
   * cái vạch cùng vẽ, không phải một đường quét từ mép này sang mép kia (đo trên frame 82).
   */
  const progOf = (a, b) => {
    const span = R - L;
    if (span <= 0) return live;
    const u0 = (a - L) / span;
    const u1 = (b - L) / span;
    return u1 <= u0 ? live : clamp((live - u0) / (u1 - u0), 0, 1);
  };
  const seg = (a, b, ink) => {
    if (!gapAt) return [{ a, b, ink }];
    const out = [];
    if (a < gL) out.push({ a, b: Math.min(b, gL), ink });
    if (b > gR) out.push({ a: Math.max(a, gR), b, ink });
    return out;
  };

  const pieces = [
    ...seg(L, cut, th.accentA),
    ...seg(cut, R, th.accentB),
  ].filter((s) => s.b > s.a).map((s) => ({ ...s, prog: progOf(s.a, s.b) }));

  /**
   * `data-vk-vach` — TRẠNG THÁI THẬT của carrier ở frame đang render, không phải bảng khai báo.
   *
   * Hai lane dựng song song thì bảng `VACH_STATE` chỉ là lời hứa; thứ duy nhất chứng minh carrier
   * đi liền mạch qua một ranh giới cảnh là tham số ĐANG VẼ ở frame cuối cảnh trước so với frame đầu
   * cảnh sau. `tools/vach-boundary.mjs` đọc đúng chuỗi này. Số làm tròn 3 chữ số để so được bằng
   * `===`; khoá nào không có thì vắng mặt, không ghi `undefined` (verify chặn `undefined` trong
   * attribute).
   */
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const state = { p: r3(live), shift: r3(shift), divide: r3(divide), tilt: r3(tilt), cracks: r3(clamp(cracks, 0, 1)), branches: r3(clamp(branches, 0, 1)) };
  if (band) state.band = { from: r3(band.from), to: r3(band.to) };
  if (zones) state.zones = zones.map((z) => ({ from: r3(z.from), to: r3(z.to), tone: z.tone || 'block' }));
  if (gapAt) state.gap = { at: r3(gapAt.at), w: r3(gapAt.w ?? 64) };
  if (notches) state.notches = notches.map((n) => ({ at: r3(n.at), on: r3(clamp(n.on ?? 1, 0, 1)), lit: Boolean(n.lit) }));

  return (
    <g style={style} opacity={opacity} data-vk-vach={JSON.stringify(state)} transform={`rotate(${tilt} ${cut} ${y})`}>
      {/* quầng sáng — đứng SAU đường, không bao giờ sáng hơn chính đường */}
      {/* Nền đêm: QUẦNG SÁNG cream. Nền trắng: không có quầng sáng nào cả — vật thể tách khỏi nền
          bằng BÓNG ĐỔ mảnh ngay dưới đường và một nền ray nhạt. Đây là chỗ đổi theme KHÔNG phải
          đổi màu: cùng một khoá `halo`, hai cách vẽ khác hẳn nhau. */}
      {halo > 0 && live > 0.02 && th.halo === 'glow' && (
        <Seg x1={L} x2={R} y={y} stroke={alpha(P.cream, 0.1 * halo)} width={weight * 3.6} p={live} />
      )}
      {halo > 0 && live > 0.02 && th.halo === 'shadow' && (
        <React.Fragment>
          <Seg x1={L} x2={R} y={y} stroke={th.surfaceAlt} width={weight * 2.6} p={live} />
          <Seg x1={L} x2={R} y={y + weight * 0.9} stroke={alpha(th.ink, 0.1 * halo)} width={weight * 0.9} p={live} />
        </React.Fragment>
      )}

      {/* ba băng vùng của C4 — vẽ TRƯỚC đường để đường luôn nằm trên */}
      {(zones || []).map((z, i) => {
        const a = L + clamp(z.from, 0, 1) * (R - L);
        const b = L + clamp(z.to, 0, 1) * (R - L);
        if (b - a < 1) return null;
        const ink = ZONE_INK[z.tone] || P.stripe;
        return (
          <g key={`zone${i}`}>
            <path d={boxPath(a, y - 17, b - a, 34, 8)} fill={alpha(ink, z.tone === 'ask' ? 0.34 : 0.22)} />
            {z.label && b - a > 92 && (
              <VachText x={(a + b) / 2} y={y - 44} size={21} weight={800} color={ink} letterSpacing={1.4}>
                {z.label}
              </VachText>
            )}
          </g>
        );
      })}

      {/* cái KHOẢNG — điểm nở ra thành khoảng; luôn `mint` vì nó là câu trả lời ĐÚNG của C3 */}
      {band && (() => {
        const a = L + clamp(band.from, 0, 1) * (R - L);
        const b = L + clamp(band.to, 0, 1) * (R - L);
        const h = band.h ?? 26;
        return (
          <g>
            <path d={boxPath(a, y - h / 2, Math.max(b - a, 3), h, h / 2)} fill={alpha(th.positive, 0.3)} />
            <Seg x1={a} x2={b} y={y - h / 2 - 1} stroke={th.positive} width={3} />
            <Seg x1={a} x2={b} y={y + h / 2 + 1} stroke={th.positive} width={3} />
            {band.label && (
              <VachText x={(a + b) / 2} y={y - h / 2 - 28} size={22} weight={800} color={th.positive}>
                {band.label}
              </VachText>
            )}
          </g>
        );
      })()}

      {pieces.map((s, i) => (
        <Seg key={`seg${i}`} x1={s.a} x2={s.b} y={y} stroke={s.ink} width={weight} p={s.prog} />
      ))}

      <Frays x0={cut} x1={R} y={y} n={5} amount={clamp(cracks, 0, 1) * live} ink={th.accentA} weight={weight} />

      {/* điểm ranh giới — cái mốc mà cả phim hỏi "nó nên nằm ở đâu" */}
      {live > 0.6 && !band && (
        <circle cx={cut} cy={y} r={weight * 1.5} fill={th.chrome === 'vinuni' ? th.ink : P.cream} stroke={th.bg} strokeWidth={th.chrome === 'vinuni' ? 3 : 0} opacity={clamp((live - 0.6) / 0.3, 0, 1)} />
      )}

      {/* khấc khắc xuống vạch (ba đòn bẩy của C2) */}
      {(notches || []).map((n, i) => {
        const nx = L + clamp(n.at, 0, 1) * (R - L);
        const on = clamp(n.on ?? 1, 0, 1);
        if (on <= 0) return null;
        return (
          <g key={`notch${i}`} opacity={on}>
            <line x1={nx} y1={y - 22 * on} x2={nx} y2={y + 22 * on} stroke={n.lit ? th.highlight : th.lineStrong} strokeWidth={4} strokeLinecap="round" />
            {n.label && (
              <VachText x={nx} y={y - 46} size={21} weight={700} color={n.lit ? th.highlight : th.inkMuted} opacity={on}>
                {n.label}
              </VachText>
            )}
          </g>
        );
      })}

      {/* ba nhánh lối thoát mọc ra từ chỗ đứt — không nhánh nào quay về chỗ đứt (C5) */}
      {gapAt && branches > 0 && [-1, 0, 1].map((k, i) => {
        const prog = clamp(branches * 1.25 - i * 0.18, 0, 1);
        if (prog <= 0) return null;
        const sx = gR;
        const ey = y + k * 96;
        return (
          <path
            key={`br${i}`}
            d={`M${sx} ${y}C${sx + 120} ${y} ${sx + 150} ${ey} ${sx + 300} ${ey}`}
            fill="none"
            stroke={th.positive}
            strokeWidth={4}
            strokeLinecap="round"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - prog}
          />
        );
      })}

      {labels && live > 0.35 && (
        <g opacity={clamp((live - 0.35) / 0.35, 0, 1)}>
          <VachText x={L + (cut - L) / 2} y={VACH.labelY} size={24} weight={800} color={th.chrome === 'vinuni' ? th.accentA : P.ice} letterSpacing={2.2}>
            {leftLabel}
          </VachText>
          <VachText x={cut + (R - cut) / 2} y={VACH.labelY} size={24} weight={800} color={th.chrome === 'vinuni' ? th.accentB : P.cream} letterSpacing={2.2}>
            {rightLabel}
          </VachText>
        </g>
      )}
    </g>
  );
}

/**
 * `LampRow` — bốn ngọn đèn câu hỏi treo TRÊN cái vạch.
 *
 * Dùng ở ba chỗ: `c1-bon-cau` (treo lên, đèn 4 sáng sẵn) · `c5-flora` (đèn 1 sáng lại — callback) ·
 * `outro` (sáng đủ bốn). Vì vậy nó là primitive, không phải hình vẽ riêng của một cảnh.
 *
 * `drop` 0→1 là tiến độ RƠI XUỐNG treo thành hàng; `lit` là mảng boolean từng đèn.
 */
export function LampRow({
  x0 = VACH.x0 + 90,
  x1 = VACH.x1 - 90,
  y = VACH.lampY,
  items = [],
  lit = [],
  drop = 1,
  size = 26,
  T = 0,
  opacity = 1,
}) {
  const th = usePosterTheme();
  const n = items.length;
  if (!n) return null;
  const step = (x1 - x0) / Math.max(n - 1, 1);
  return (
    <g opacity={opacity}>
      {items.map((label, i) => {
        const d = clamp(drop * (1 + n * 0.16) - i * 0.16, 0, 1);
        if (d <= 0) return null;
        const e = Easing.easeOutBack(d);
        const cx = x0 + i * step;
        const cy = y - (1 - e) * 84;
        const on = Boolean(lit[i]);
        const warm = on ? th.highlight : th.lineStrong;
        const glow = on ? breathe(T, { min: 0.78, max: 1, hz: 0.28, phase: i }) : 1;
        return (
          <g key={`lamp${i}`} opacity={d}>
            <line x1={cx} y1={y - 118} x2={cx} y2={cy - size} stroke={th.lineStrong} strokeWidth={2} />
            {on && <circle cx={cx} cy={cy} r={size * 2.1} fill={alpha(th.highlight, 0.14 * glow)} />}
            <circle cx={cx} cy={cy} r={size} fill={on ? alpha(th.highlight, 0.85) : alpha(th.surface, 0.9)} stroke={warm} strokeWidth={3} />
            <VachText x={cx} y={cy + size + 30} size={22} weight={on ? 800 : 600} color={on ? th.ink : th.inkMuted}>
              {label}
            </VachText>
          </g>
        );
      })}
    </g>
  );
}

/**
 * `RangeBar` — độ chắc hiển thị bằng một KHOẢNG, không bằng một con số.
 *
 * Đây là nội dung bài học, nên nó là primitive chứ không phải hình vẽ một lần: `c3-case-trip`
 * (tổng tiền cứng → dải mềm), `c3-case-calo` (387 → 350–430), `c3-ba-muc` (ba mức cư xử),
 * `c3-khong-phai-so` (số tan, mức ở lại), `c4-cau-noi` (khoảng hạ xuống thành vùng trên vạch).
 *
 * `spread` 0→1: 0 là một ĐIỂM sắc lẹm (độ chính xác giả), 1 là khoảng đã nở hết.
 */
export function RangeBar({
  x, y, w, h = 22,
  at = 0.5,
  spread = 0,
  label,
  pointLabel,
  tone = 'mint',
  T = 0,
  opacity = 1,
}) {
  const th = usePosterTheme();
  const ink = zoneInk(th)[tone] || th.positive;
  const cx = x + clamp(at, 0, 1) * w;
  const half = clamp(spread, 0, 1) * w * 0.2;
  const a = clamp(cx - half, x, x + w);
  const b = clamp(cx + half, x, x + w);
  return (
    <g opacity={opacity}>
      <path d={boxPath(x, y - h / 2, w, h, h / 2)} fill={alpha(th.surface, 0.85)} />
      <path d={boxPath(x, y - h / 2, w, h, h / 2)} fill="none" stroke={th.lineStrong} strokeWidth={2} />
      {half > 1 ? (
        <path d={boxPath(a, y - h / 2, b - a, h, h / 2)} fill={alpha(ink, 0.55)} />
      ) : (
        <line x1={cx} y1={y - h / 2 - 6} x2={cx} y2={y + h / 2 + 6} stroke={th.negative} strokeWidth={4} strokeLinecap="round" />
      )}
      {half > 1 && (
        <g>
          <line x1={a} y1={y - h / 2 - 5} x2={a} y2={y + h / 2 + 5} stroke={ink} strokeWidth={3} strokeLinecap="round" />
          <line x1={b} y1={y - h / 2 - 5} x2={b} y2={y + h / 2 + 5} stroke={ink} strokeWidth={3} strokeLinecap="round" />
        </g>
      )}
      {label && <VachText x={x + w / 2} y={y - h / 2 - 30} size={24} weight={800} color={half > 1 ? ink : th.negative}>{label}</VachText>}
      {pointLabel && <VachText x={x + w / 2} y={y + h / 2 + 32} size={21} weight={600} color={th.inkMuted}>{pointLabel}</VachText>}
    </g>
  );
}

/**
 * `CostAxis` — trục "cái giá khi sai", dựng VUÔNG GÓC với cái vạch.
 *
 * Cao trào của phim (`c4-sai-dat` → `c4-sai-re`) là: cùng một độ chắc, ngưỡng tự-làm nằm ở hai
 * chỗ khác nhau vì cái giá khi sai khác nhau. Trục này + `Vach.zones` là cặp làm việc đó; `outro`
 * dùng lại để đóng công thức "độ chắc × cái giá khi sai".
 *
 * `load` −1…1: dương là quả cân ĐÈ xuống (sai thì đắt), âm là nhấc ra (sai thì rẻ).
 */
export function CostAxis({
  x,
  yTop = 236,
  yBottom = VACH.y,
  load = 0,
  label = 'CÁI GIÁ KHI SAI',
  T = 0,
  p = 1,
  opacity = 1,
}) {
  const th = usePosterTheme();
  const live = clamp(p, 0, 1);
  const k = clamp(load, -1, 1);
  // `load` DƯƠNG = ĐÈ XUỐNG. Bản cũ trừ từ `yBottom` nên dương lại đẩy quả cân LÊN — ngược hẳn
  // với cả JSDoc ở trên lẫn `styles/poster.md`, và ngược với cách `c4-sai-dat` dùng nó (load 0→+1 khi
  // lời đọc nói "sai mà rất đắt"). Cộng từ `yTop` mới đúng: k=+1 là quả cân nằm sát cái vạch.
  const wy = yTop + (0.5 + k * 0.42) * (yBottom - yTop);
  const wSize = 30 + 24 * Math.abs(k);
  const ink = k >= 0 ? th.negative : th.positive;
  return (
    <g opacity={opacity}>
      <line
        x1={x} y1={yBottom} x2={x} y2={yTop}
        stroke={th.lineStrong} strokeWidth={3} strokeLinecap="round"
        pathLength="1" strokeDasharray="1" strokeDashoffset={1 - live}
      />
      {live > 0.8 && (
        <g opacity={clamp((live - 0.8) / 0.2, 0, 1)}>
          <path d={boxPath(x - wSize / 2, wy - wSize / 2, wSize, wSize, 7)} fill={alpha(ink, 0.34)} stroke={ink} strokeWidth={3} />
          <VachText x={x - wSize / 2 - 16} y={wy} size={21} weight={700} color={ink} anchor="end">
            {k >= 0 ? 'ĐẮT' : 'RẺ'}
          </VachText>
          <VachText x={x} y={yTop - 26} size={21} weight={800} color={th.inkMuted} letterSpacing={1.6}>{label}</VachText>
        </g>
      )}
    </g>
  );
}

/** Nhịp "vạch trượt rồi dừng": dịch tới `to` rồi ghìm lại — dùng ở cold open và outro. */
export const slide = (T, at, to, dur = 1.1) => kf(T, [[at, 0], [at + dur, to]], Easing.easeInOutCubic);
