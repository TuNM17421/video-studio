import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { SvgText } from '../text/Text.jsx';

const STATES = {
  done: { fill: C.bgAlt, stroke: C.accent, dash: undefined, text: C.accentStrong },
  skip: { fill: C.bg, stroke: C.dotInactive, dash: '9 7', text: C.red },
  pending: { fill: C.bg, stroke: C.dotInactive, dash: undefined, text: C.textMuted },
};

/**
 * WorkStrip — a row of cells in order, each one unit of work: done, skipped, or still pending.
 *
 * This is what makes an invisible machine step countable: "GPU chỉ vẽ một khung hình trên hai" is a
 * sentence; a row where every other cell is dashed is a fact the viewer can check by eye. Not the same
 * as `UnitGrid`, which is a RATIO ("18 trên 60 lần") and may be read in any order — here the order IS
 * the content, so cells never reflow.
 *
 * Anatomy: cells of equal width across `w` with `gap` between, height `cellH`, radius 10, 3 px stroke ·
 * done = bgAlt + accent stroke, caption accentStrong · skip = white + dashed dotInactive stroke, caption
 * red · pending = white + solid dotInactive stroke, caption muted · `caption` 19/700 muted on a baseline
 * 18 px above the row.
 *
 * Rules: cells map 1-to-1 to something the narration counts, never decoration · at most 24 cells —
 * past that nobody counts, use `UnitGrid` · one strip per scene · `reveal` fills the row left to right.
 */
export function WorkStrip({ x, y, w, cells = [], cellH = 56, gap = 16, caption, size = 17, reveal = 1, opacity = 1 }) {
  if (opacity <= 0.001 || !cells.length) return null;
  const n = cells.length;
  const cw = (w - gap * (n - 1)) / n;
  const shown = clamp01(reveal) * n;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {caption ? (
        <SvgText x={x} y={y - 18} size={19} weight={700} anchor="start" color={C.textMuted}>
          {caption}
        </SvgText>
      ) : null}
      {cells.map((cell, i) => {
        const o = clamp01(shown - i);
        if (o <= 0.001) return null;
        const s = STATES[cell.state] || STATES.pending;
        const cx = x + i * (cw + gap);
        return (
          <g key={i} opacity={o < 1 ? o : undefined}>
            <rect x={cx} y={y} width={cw} height={cellH} rx={10} fill={s.fill} stroke={s.stroke} strokeWidth={3} strokeDasharray={s.dash} />
            {cell.label ? (
              <SvgText x={cx + cw / 2} y={y + cellH / 2 + size * 0.36} size={size} weight={700} color={s.text}>
                {cell.label}
              </SvgText>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
