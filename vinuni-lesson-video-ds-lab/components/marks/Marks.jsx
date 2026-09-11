import React from 'react';
import { C } from '../../lib/tokens.js';
import { pillWidth } from '../../lib/geometry.js';
import { Pill } from '../labels/Pill.jsx';

/** Hand-drawn check (8 px red stroke). Port of Check in Day05 shared.tsx (size 44). */
export function Check({ x, y, size = 44, color = C.red, strokeWidth = 8, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const k = size / 44;
  return (
    <path
      d={`M ${x - 18 * k} ${y} L ${x - 3 * k} ${y + 15 * k} L ${x + 26 * k} ${y - 21 * k}`}
      fill="none"
      opacity={opacity < 1 ? opacity : undefined}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    />
  );
}

/** Hand-drawn cross (8 px red stroke). Port of Cross in Day05 shared.tsx (size 42). */
export function Cross({ x, y, size = 42, color = C.red, strokeWidth = 8, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const s = size / 2;
  return (
    <g opacity={opacity < 1 ? opacity : undefined} stroke={color} strokeLinecap="round" strokeWidth={strokeWidth}>
      <path d={`M ${x - s} ${y - s} L ${x + s} ${y + s}`} />
      <path d={`M ${x + s} ${y - s} L ${x - s} ${y + s}`} />
    </g>
  );
}

/**
 * Real vector bracket that groups the items above it (U shape, 4 px): "Ý CHÍNH CHUNG".
 * direction 'up' draws the ∩ shape to group items below. Port of Bracket in Day05 shared.tsx.
 */
export function Bracket({ x, y, w, h = 28, direction = 'down', color = C.accent, strokeWidth = 4, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const yy = direction === 'down' ? y + h : y - h;
  return (
    <path
      d={`M ${x} ${y} V ${yy} H ${x + w} V ${y}`}
      fill="none"
      opacity={opacity < 1 ? opacity : undefined}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    />
  );
}

/**
 * Dashed group enclosure (15/12 dash, 4 px, radius 32) with a Pill label straddling the top
 * edge. Red = "this is the part we are talking about"; accent for neutral grouping.
 * Size it from the union of the enclosed cards + a consistent margin.
 */
export function Enclosure({ x, y, w, h, label, color = C.red, opacity = 1, labelX, labelW }) {
  if (opacity <= 0.001) return null;
  const pw = labelW ?? (label ? pillWidth(label, 18) : 0);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={32} fill="none" stroke={color} strokeDasharray="15 12" strokeWidth={4} />
      {label ? <Pill x={labelX ?? x + 36} y={y - 25} w={pw} label={label} active={color === C.red} accent={color} /> : null}
    </g>
  );
}
