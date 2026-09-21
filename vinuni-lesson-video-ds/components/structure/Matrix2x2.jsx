import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { SvgText } from '../text/Text.jsx';

const ORDER = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
];

/**
 * Matrix2x2 — a 2 × 2 decision grid: two axes, four quadrants, one quadrant highlighted (tự chủ × rủi ro,
 * tác động × công sức).
 * Anatomy: square of side `size` split into 4 cells with an 8 px gutter, radius 18, bgAlt with a 3 px
 * dotInactive stroke; the highlighted cell takes a redSoft fill, 5 px red stroke and a red label.
 * Cell text is centered: label 18/700 accentStrong + optional muted 21/600 line. Axis labels are 17/700
 * muted: `axisX` [left, right] under the columns, `axisY` [top, bottom] right-aligned left of the rows.
 * `cells` and `highlight` use reading order: 0 top-left, 1 top-right, 2 bottom-left, 3 bottom-right;
 * `highlight` -1 = none. `reveal` (0–1 array, optional) fills the quadrants one by one. Leave ~220 px
 * left of `x` for the row labels.
 */
export function Matrix2x2({ x, y, size = 480, axisX = [], axisY = [], cells = [], highlight = -1, reveal, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const half = size / 2;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {ORDER.map(([col, row], i) => {
        const r = reveal ? clamp01(reveal[i] ?? 0) : 1;
        if (r <= 0.001) return null;
        const on = i === highlight;
        const cx = x + col * half;
        const cy = y + row * half;
        const cell = cells[i];
        return (
          <g key={i} opacity={r < 1 ? r : undefined}>
            <rect
              x={cx + 4}
              y={cy + 4}
              width={half - 8}
              height={half - 8}
              rx={18}
              fill={on ? C.redSoft : C.bgAlt}
              stroke={on ? C.red : C.dotInactive}
              strokeWidth={on ? 5 : 3}
            />
            {cell ? (
              <g>
                <SvgText x={cx + half / 2} y={cy + half / 2 + (cell.sub ? -6 : 7)} size={18} weight={700} color={on ? C.red : C.accentStrong}>
                  {cell.label}
                </SvgText>
                {cell.sub ? (
                  <SvgText x={cx + half / 2} y={cy + half / 2 + 30} size={21} color={C.textMuted}>
                    {cell.sub}
                  </SvgText>
                ) : null}
              </g>
            ) : null}
          </g>
        );
      })}
      {axisX.map((t, i) => (
        <SvgText key={`x${i}`} x={x + half / 2 + i * half} y={y + size + 44} size={17} weight={700} color={C.textMuted}>
          {t}
        </SvgText>
      ))}
      {axisY.map((t, i) => (
        <SvgText key={`y${i}`} x={x - 28} y={y + half / 2 + i * half + 6} size={17} weight={700} anchor="end" color={C.textMuted}>
          {t}
        </SvgText>
      ))}
    </g>
  );
}
