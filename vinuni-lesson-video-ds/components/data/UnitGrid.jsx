import React from 'react';
import { C } from '../../lib/tokens.js';
import { SvgText } from '../text/Text.jsx';

/**
 * UnitGrid — a count shown as filled cells out of a whole ("18 trên 60 lần"), so a ratio reads as
 * individual cases instead of an abstract percentage.
 * Anatomy: `cols` × `rows` squares of side `cell`, `gap` apart, radius 8 · dotInactive when empty,
 * `color` (default red) when filled, filled in reading order (left→right, top→bottom) · optional caption
 * 18/700 in `color`, centered 52 px under the grid.
 * `filled` is continuous: the cell at the boundary fades in by its fractional part, so counting up with
 * countUp() fills the grid smoothly and the caption can show the same value rounded. Keep the total
 * (cols × rows) the number the script names — do not pad the grid to look fuller.
 */
export function UnitGrid({ x, y, cols = 10, rows = 6, cell = 54, gap = 12, filled = 0, color = C.red, caption, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const w = cols * (cell + gap) - gap;
  const total = cols * rows;
  const f = Math.max(0, Math.min(total, filled));
  const cells = [];
  for (let i = 0; i < total; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const on = Math.max(0, Math.min(1, f - i));
    const cx = x + c * (cell + gap);
    const cy = y + r * (cell + gap);
    cells.push(
      <g key={i}>
        <rect x={cx} y={cy} width={cell} height={cell} rx={8} fill={C.dotInactive} />
        {on > 0.001 ? <rect x={cx} y={cy} width={cell} height={cell} rx={8} fill={color} opacity={on < 1 ? on : undefined} /> : null}
      </g>,
    );
  }
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {cells}
      {caption ? (
        <SvgText x={x + w / 2} y={y + rows * (cell + gap) - gap + 52} size={18} weight={700} color={color}>
          {caption}
        </SvgText>
      ) : null}
    </g>
  );
}
