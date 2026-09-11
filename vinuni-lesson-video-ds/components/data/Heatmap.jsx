import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { SvgText } from '../text/Text.jsx';

/**
 * Matrix / attention heatmap: rows × cols cells (radius 4) filled with ONE palette color at
 * 8–100 % alpha — value(r, c) returns 0–1. `reveal` scales every value from 0 (continuous).
 * Optional row / column labels (14 px). Port of the N×N attention matrix in S2ParallelSeqScene.
 */
export function Heatmap({ x, y, rows, cols, value, cell = 34, gap = 4, color = C.red, reveal = 1, rowLabels, colLabels, labelSize = 14, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = clamp01(value(r, c)) * clamp01(reveal);
      cells.push(
        <rect key={`${r}-${c}`} x={x + c * (cell + gap)} y={y + r * (cell + gap)} width={cell} height={cell} rx={4} fill={color} fillOpacity={0.08 + 0.92 * v} />,
      );
    }
  }
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {cells}
      {rowLabels
        ? rowLabels.map((l, r) => (
            <SvgText key={`r${l}`} x={x - 10} y={y + r * (cell + gap) + cell / 2 + labelSize * 0.35} size={labelSize} weight={600} anchor="end" color={C.textMuted}>
              {l}
            </SvgText>
          ))
        : null}
      {colLabels
        ? colLabels.map((l, c) => (
            <SvgText key={`c${l}`} x={x + c * (cell + gap) + cell / 2} y={y - 10} size={labelSize} weight={600} color={C.textMuted}>
              {l}
            </SvgText>
          ))
        : null}
    </g>
  );
}
