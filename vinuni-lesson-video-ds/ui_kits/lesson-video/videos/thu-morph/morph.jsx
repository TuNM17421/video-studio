import React from 'react';
import { SvgText } from '../../../../components/index.js';
import { C, appear, clamp01, interpolate, CLAMP, linearProgress, morphPath } from '../../../../lib/index.js';
import { CUES } from './cues.js';

/*
 * THỬ BIẾN HÌNH — câu hỏi kỹ thuật duy nhất của clip này:
 * `morphPath` (flubber, đã nằm sẵn trong lib/paths.js nhưng chưa component nào dùng) có đủ mượt để kể
 * "dãy số này CHÍNH LÀ mũi tên kia" hay không, khi vẫn ở nền trắng và bảng 9 màu hiện tại.
 *
 * Ba thứ mượn từ 3Blue1Brown, không thứ nào cần màu mới:
 *   · một vật biến hình liên tục, không cắt cảnh — `morphPath` giữa hai path KHÉP KÍN;
 *   · thang độ đậm nhạt: phần chính 100 %, phần ngữ cảnh 40 %, phần khung 15 %;
 *   · nhịp chậm — mỗi chặng năm giây, biến hình chiếm gần hết chặng.
 *
 * Số trong clip là số minh hoạ cho phép thử kỹ thuật, không phải nội dung bài học nào.
 */
const S = (n) => CUES[n - 1].start;
const E = (n) => CUES[n - 1].end;

export const DIM = { main: 1, context: 0.4, frame: 0.15 };

const O = { x: 960, y: 700 }; // gốc toạ độ của mặt phẳng hai chiều
const AX = 400;
const V1 = [0.82, -0.3, 0.16, 0.6, -0.9, 0.42, 0.24, -0.55];
const V2 = [0.7, -0.15, 0.3, 0.52, -0.78, 0.5, 0.1, -0.4];

/* Dải ô: khung bao quanh, vẽ bằng path KHÉP KÍN để biến hình được. */
const CELL = 74;
const GAP = 6;
const STRIP_W = V1.length * CELL + (V1.length - 1) * GAP;
const strip = (x, y) => ({ x, y, w: STRIP_W, h: 92 });
const S1 = strip(960 - STRIP_W / 2, 330);
const S2 = strip(1320, 300);
const rectPath = (b) => `M ${b.x} ${b.y} L ${b.x + b.w} ${b.y} L ${b.x + b.w} ${b.y + b.h} L ${b.x} ${b.y + b.h} Z`;

/* Mũi tên khép kín từ gốc tới (x, y): thân hình thang + đầu tam giác. */
function arrowPath(x, y, { width = 13, head = 34 } = {}) {
  const dx = x - O.x;
  const dy = y - O.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const bx = O.x + ux * (len - head);
  const by = O.y + uy * (len - head);
  const p = (px, py) => `${Math.round(px * 10) / 10} ${Math.round(py * 10) / 10}`;
  return [
    `M ${p(O.x + nx * width, O.y + ny * width)}`,
    `L ${p(bx + nx * width, by + ny * width)}`,
    `L ${p(bx + nx * head * 0.62, by + ny * head * 0.62)}`,
    `L ${p(x, y)}`,
    `L ${p(bx - nx * head * 0.62, by - ny * head * 0.62)}`,
    `L ${p(bx - nx * width, by - ny * width)}`,
    `L ${p(O.x - nx * width, O.y - ny * width)}`,
    'Z',
  ].join(' ');
}

const TIP1 = { x: O.x + 330, y: O.y - 250 };
const TIP2_FAR = { x: O.x + 385, y: O.y - 60 };
const TIP2_NEAR = { x: O.x + 352, y: O.y - 196 };

const cellFill = (v) => (v < 0 ? C.red : C.accent);
const cellAlpha = (v) => 0.12 + 0.88 * clamp01(Math.abs(v));

function Strip({ box, values, reveal = 1, opacity = 1, label }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {values.map((v, i) => {
        const on = clamp01(reveal * values.length - i);
        if (on <= 0.001) return null;
        return (
          <rect key={i} x={box.x + i * (CELL + GAP)} y={box.y} width={CELL} height={box.h} rx={5}
            fill={cellFill(v)} fillOpacity={cellAlpha(v)} opacity={on} />
        );
      })}
      {label ? (
        <SvgText x={box.x + box.w / 2} y={box.y + box.h + 46} size={28} weight={600} color={C.textMuted}>{label}</SvgText>
      ) : null}
    </g>
  );
}

/* Một viên token — vẽ tại chỗ, không mượn TokenRow của nhánh illustrated (nhánh này tách từ bảng trắng). */
function TokenCell({ x, y, text, opacity = 1, size = 44 }) {
  if (opacity <= 0.001) return null;
  const w = text.length * size * 0.62 + 52;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={w} height={size * 2} rx={8} fill={C.bgAlt} stroke={C.accent} strokeWidth={2} />
      <SvgText x={x + w / 2} y={y + size * 1.2} size={size} weight={600} color={C.text}>{text}</SvgText>
    </g>
  );
}

/** Trục toạ độ — phần KHUNG, luôn ở 15 %. */
function Axes({ opacity }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity} stroke={C.text} strokeWidth={3} fill="none" strokeLinecap="round">
      <path d={`M ${O.x - AX} ${O.y} H ${O.x + AX}`} />
      <path d={`M ${O.x} ${O.y + 170} V ${O.y - AX}`} />
    </g>
  );
}

export default function MorphLayer({ frame }) {
  // chặng 1 — dải ô hiện ra
  const grow1 = linearProgress(frame, S(1) + 20, S(1) + 110);
  // chặng 2 — khung bao biến thành mũi tên
  const m1 = interpolate(frame, [S(2) + 10, E(2) - 24], [0, 1], CLAMP);
  const cellsOut = appear(frame, S(2) + 6, 34);
  const axes = appear(frame, S(2) + 20, 40) * DIM.frame;
  // chặng 3 — token thứ hai
  const grow2 = linearProgress(frame, S(3) + 8, S(3) + 60);
  const m2 = interpolate(frame, [S(3) + 55, E(3) - 10], [0, 1], CLAMP);
  // chặng 4 — góc, rồi quay lại gần nhau
  const arc = appear(frame, S(4) + 16, 34);
  const close = interpolate(frame, [S(4) + 70, E(4) - 26], [0, 1], CLAMP);

  const tip2 = {
    x: interpolate(close, [0, 1], [TIP2_FAR.x, TIP2_NEAR.x]),
    y: interpolate(close, [0, 1], [TIP2_FAR.y, TIP2_NEAR.y]),
  };
  const d1 = morphPath(rectPath(S1), arrowPath(TIP1.x, TIP1.y), m1);
  const d2 = morphPath(rectPath(S2), arrowPath(tip2.x, tip2.y, { width: 11, head: 30 }), m2);

  const ang = (p) => Math.atan2(p.y - O.y, p.x - O.x);
  const a1 = ang(TIP1);
  const a2 = ang(tip2);
  const R = 150;
  const arcD = `M ${O.x + Math.cos(a2) * R} ${O.y + Math.sin(a2) * R} A ${R} ${R} 0 0 1 ${O.x + Math.cos(a1) * R} ${O.y + Math.sin(a1) * R}`;

  return (
    <g>
      <Axes opacity={axes} />

      {/* token nguồn — ngữ cảnh, 40 % */}
      <TokenCell x={S1.x + STRIP_W / 2 - 92} y={180} text="␣trời"
        opacity={appear(frame, S(1) + 4) * (1 - appear(frame, S(3), 30) * 0.6)} />

      {/* chặng 1: các ô giá trị — mờ hẳn khi khung bao bắt đầu biến hình */}
      <Strip box={S1} values={V1} reveal={grow1} opacity={(1 - cellsOut) * DIM.main}
        label={frame < S(2) ? 'tám chiều, mỗi chiều một con số' : null} />
      <Strip box={S2} values={V2} reveal={grow2} opacity={(1 - appear(frame, S(3) + 52, 30)) * DIM.context} />

      {/* VẬT BIẾN HÌNH — cùng một path, từ khung bao thành mũi tên */}
      <path d={d1} fill={C.accent} fillOpacity={interpolate(m1, [0, 1], [0.1, 0.92])}
        stroke={C.accentStrong} strokeWidth={interpolate(m1, [0, 1], [3, 0])} opacity={appear(frame, S(1) + 16)} />
      <path d={d2} fill={C.red} fillOpacity={interpolate(m2, [0, 1], [0.1, 0.8])}
        stroke={C.red} strokeWidth={interpolate(m2, [0, 1], [3, 0])} opacity={appear(frame, S(3) + 4)} />

      {/* chặng 4: góc giữa hai mũi tên */}
      {arc > 0.01 ? (
        <g opacity={arc}>
          <path d={arcD} fill="none" stroke={C.text} strokeWidth={4} />
          <SvgText x={O.x + Math.cos((a1 + a2) / 2) * (R + 54)} y={O.y + Math.sin((a1 + a2) / 2) * (R + 54) + 12}
            size={36} weight={700} color={C.text}>góc</SvgText>
        </g>
      ) : null}

      {/* chữ của từng chặng — nằm cạnh hình, không phải tiêu đề cảnh */}
      <SvgText x={O.x} y={980} size={38} weight={700} color={C.text} opacity={appear(frame, S(2) + 60) * (1 - appear(frame, S(3), 24))}>
        cùng một thứ, nhìn như một mũi tên
      </SvgText>
      <SvgText x={O.x} y={980} size={38} weight={700} color={C.text} opacity={appear(frame, S(4) + 100)}>
        gần nghĩa thì góc nhỏ
      </SvgText>
      <SvgText x={TIP1.x + 40} y={TIP1.y - 10} size={30} weight={700} anchor="start" color={C.accentStrong}
        opacity={appear(frame, S(2) + 80) * DIM.context * 2.5}>␣trời</SvgText>
      <SvgText x={tip2.x + 40} y={tip2.y + 4} size={30} weight={700} anchor="start" color={C.red}
        opacity={appear(frame, S(3) + 96) * DIM.context * 2.5}>␣nắng</SvgText>
    </g>
  );
}
