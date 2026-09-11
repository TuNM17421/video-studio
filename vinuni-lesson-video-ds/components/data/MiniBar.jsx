import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { SvgText } from '../text/Text.jsx';

/**
 * Compact meter: muted 18 px label above an 18 px pill track (dotInactive) with an accent fill.
 * Use for counts inside a card ("7 ca", "2 ca"). Port of MiniBar in Day05 shared.tsx.
 */
export function MiniBar({ x, y, w, value, label, accent = C.accent, opacity = 1, h = 18 }) {
  if (opacity <= 0.001) return null;
  const v = clamp01(value);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {label ? (
        <SvgText x={x} y={y - 10} size={18} weight={600} anchor="start" color={C.textMuted}>
          {label}
        </SvgText>
      ) : null}
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={C.dotInactive} />
      <rect x={x} y={y} width={Math.max(1, w * v)} height={h} rx={h / 2} fill={accent} />
    </g>
  );
}
