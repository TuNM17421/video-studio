import React from 'react';
import { C } from '../../lib/tokens.js';
import { SvgText } from '../text/Text.jsx';

/**
 * A vector drawn with REAL square brackets (3-segment SVG paths: tick – vertical – tick),
 * never a generic rectangle. Values are bold, one per row; `highlight` turns one row red.
 * Port of the bracketed vectors in S2EmbedScene / Day01 V03 Scene06.
 */
export function VectorColumn({ x, y, values, cellH = 48, w = 110, size = 28, color = C.text, bracketColor = C.accent, highlight = -1, label, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const h = values.length * cellH + 16;
  const tick = 14;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <path d={`M ${x + tick} ${y} H ${x} V ${y + h} H ${x + tick}`} fill="none" stroke={bracketColor} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M ${x + w - tick} ${y} H ${x + w} V ${y + h} H ${x + w - tick}`} fill="none" stroke={bracketColor} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <SvgText key={`${i}-${v}`} x={x + w / 2} y={y + 8 + cellH * i + cellH / 2 + size * 0.35} size={size} weight={700} color={i === highlight ? C.red : color}>
          {v}
        </SvgText>
      ))}
      {label ? (
        <SvgText x={x + w / 2} y={y + h + 34} size={20} weight={600} color={C.textMuted}>
          {label}
        </SvgText>
      ) : null}
    </g>
  );
}
