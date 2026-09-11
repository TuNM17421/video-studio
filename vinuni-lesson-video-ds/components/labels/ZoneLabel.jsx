import React from 'react';
import { C } from '../../lib/tokens.js';
import { textWidth } from '../../lib/geometry.js';
import { SvgText } from '../text/Text.jsx';

/**
 * Editorial (Day28) zone / lane label: white pill, 2 px colored stroke, 16 px bold uppercase
 * text with 1.5 px tracking, centered on (x, y) — "OPERATIONS", "GOVERNANCE", "BULKHEAD".
 * Port of ZoneLabel in src/videos/Day28/D28V01Shared.tsx.
 */
export function ZoneLabel({ x, y, label, color = C.accent, opacity = 1, size = 16 }) {
  if (opacity <= 0.001) return null;
  const w = Math.round(textWidth(label, size, 700) + label.length * 1.5 + 30);
  const h = 34;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} fill={C.bg} stroke={color} strokeWidth={2} />
      <SvgText x={x + 0.75} y={y + size * 0.36} size={size} weight={700} color={color} letterSpacing={1.5}>
        {label}
      </SvgText>
    </g>
  );
}
