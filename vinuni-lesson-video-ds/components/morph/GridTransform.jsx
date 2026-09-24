import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { LAYER } from './Layer.jsx';
import { arrow } from './shapes.js';

/**
 * Cả MẶT PHẲNG bị một ma trận kéo giãn — hình nền tảng của "Essence of Linear Algebra".
 *
 * Đây là thứ `MorphSequence` không làm được: nó biến hình MỘT vật, còn ở đây cái biến đổi là **không
 * gian**. Ý của Grant Sanderson: ma trận không phải bảng số, ma trận là một phép biến đổi; hai cột của
 * nó là chỗ hai vector cơ sở î và ĵ **đáp xuống** sau phép biến đổi. Vẽ được hình này thì câu ấy không
 * cần giải thích thêm.
 *
 *   <GridTransform o={O} m={[[2, 1], [0, 1]]} t={t} unit={90} span={5} vectors />
 *
 * `m` là ma trận 2×2 theo cột: `[[a, c], [b, d]]` — cột một là î đáp xuống đâu, cột hai là ĵ.
 * `t` 0→1 nội suy từ ma trận đơn vị tới `m`, nên lưới **kéo dần** chứ không nhảy.
 * Lưới gốc ở lại phía sau ở mức `frame` (15 %) để người xem so được trước / sau — bỏ nó đi là mất
 * một nửa ý nghĩa.
 *
 * Trục y của màn hình hướng xuống, nên toạ độ toán học được lật: y dương đi LÊN.
 */
const lerp = (a, b, t) => a + (b - a) * t;

/** Ma trận ở thời điểm `t`: nội suy từ đơn vị tới `m`. */
export function matrixAt(m, t) {
  const k = clamp01(t);
  const [[a, c], [b, d]] = m;
  return [[lerp(1, a, k), lerp(0, c, k)], [lerp(0, b, k), lerp(1, d, k)]];
}

/** Điểm lưới (u, v) → điểm màn hình, dưới ma trận `mt` quanh gốc `o` với ô `unit` px. */
export const gridPoint = (o, mt, unit, u, v) => ({
  x: o.x + (mt[0][0] * u + mt[0][1] * v) * unit,
  y: o.y - (mt[1][0] * u + mt[1][1] * v) * unit,
});

export function GridTransform({
  o, m = [[1, 0], [0, 1]], t = 1, unit = 90, span = 5, color = C.accent,
  ghost = true, ghostColor = C.text, vectors = false, opacity = 1, width = 2, clip, id = 'gt',
}) {
  if (opacity <= 0.001) return null;
  const mt = matrixAt(m, t);
  const line = (p, q) => `M ${Math.round(p.x * 10) / 10} ${Math.round(p.y * 10) / 10} L ${Math.round(q.x * 10) / 10} ${Math.round(q.y * 10) / 10}`;
  const lines = [];
  for (let i = -span; i <= span; i += 1) {
    lines.push(line(gridPoint(o, mt, unit, i, -span), gridPoint(o, mt, unit, i, span)));
    lines.push(line(gridPoint(o, mt, unit, -span, i), gridPoint(o, mt, unit, span, i)));
  }
  const ghostLines = [];
  if (ghost) {
    const id = [[1, 0], [0, 1]];
    for (let i = -span; i <= span; i += 1) {
      ghostLines.push(line(gridPoint(o, id, unit, i, -span), gridPoint(o, id, unit, i, span)));
      ghostLines.push(line(gridPoint(o, id, unit, -span, i), gridPoint(o, id, unit, span, i)));
    }
  }
  const iHat = gridPoint(o, mt, unit, 1, 0);
  const jHat = gridPoint(o, mt, unit, 0, 1);
  // Lưới trải rộng hơn khung hình sau khi bị kéo; `clip` cắt nó gọn trong một ô thay vì để tràn ra mép.
  const clipId = clip ? `grid-${id}` : null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {clip ? (
        <clipPath id={clipId}>
          <rect x={clip.x} y={clip.y} width={clip.w} height={clip.h} rx={clip.r ?? 0} />
        </clipPath>
      ) : null}
      <g clipPath={clipId ? `url(#${clipId})` : undefined} fill="none" strokeLinecap="round">
        {ghost ? <g stroke={ghostColor} strokeWidth={width} opacity={LAYER.frame}>{ghostLines.map((d, i) => <path key={i} d={d} />)}</g> : null}
        <g stroke={color} strokeWidth={width} opacity={0.55}>{lines.map((d, i) => <path key={i} d={d} />)}</g>
        {/* hai trục của lưới đã biến đổi — dày hơn, vì chúng là "khung" của không gian mới */}
        <path d={line(gridPoint(o, mt, unit, -span, 0), gridPoint(o, mt, unit, span, 0))} stroke={color} strokeWidth={width * 2} />
        <path d={line(gridPoint(o, mt, unit, 0, -span), gridPoint(o, mt, unit, 0, span))} stroke={color} strokeWidth={width * 2} />
      </g>
      {/* î và ĵ vẽ CUỐI và có đầu mũi tên: chúng là nhân vật chính, không được chìm dưới đường lưới */}
      {vectors ? (
        <g>
          <path d={arrow({ from: o, to: iHat, width: width * 3.4, head: unit * 0.34 })} fill={C.red} />
          <path d={arrow({ from: o, to: jHat, width: width * 3.4, head: unit * 0.34 })} fill={C.accentStrong} />
        </g>
      ) : null}
    </g>
  );
}
