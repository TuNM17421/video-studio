import React from 'react';
import { C } from '../../lib/tokens.js';
import { SvgText } from '../text/Text.jsx';

/**
 * Round step badge (r 24): dotInactive fill, 2 px accent stroke, 17 px bold accentStrong number.
 * `active` → red-soft fill, red stroke and text. Keep the same diameter across siblings.
 * Port of NumberBadge in Day05 shared.tsx.
 */
export function NumberBadge({ x, y, value, opacity = 1, active = false, r = 24 }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <circle cx={x} cy={y} r={r} fill={active ? C.redSoft : C.dotInactive} stroke={active ? C.red : C.accent} strokeWidth={2} />
      <SvgText x={x} y={y + 6} size={17} weight={700} color={active ? C.red : C.accentStrong}>
        {value}
      </SvgText>
    </g>
  );
}

/** 9 px status dot — accent (normal) or red (active / alert). */
export function StatusDot({ x, y, opacity = 1, active = false, r = 9 }) {
  if (opacity <= 0.001) return null;
  return <circle cx={x} cy={y} r={r} fill={active ? C.red : C.accent} opacity={opacity < 1 ? opacity : undefined} />;
}
