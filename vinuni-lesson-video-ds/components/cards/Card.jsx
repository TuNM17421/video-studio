import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { Icon } from '../icons/Icons.jsx';
import { Multiline, SvgText } from '../text/Text.jsx';

/**
 * The base diagram card (SVG). bgAlt fill, 3 px accent stroke, radius 22, optional micro label
 * (17 px, top-left, uppercase copy), 1–3 centered lines with a bold first line.
 * `active` (0–1) cross-fades a red-soft overlay with a 5 px red stroke — drive it with pulse().
 * `muted` (0–1) dims a card that is not the current focus.
 * Port of Card in src/videos/Day05/rebuild-v1/.../shared.tsx.
 */
export function Card({
  x,
  y,
  w,
  h,
  lines = [],
  label,
  icon,
  opacity = 1,
  active = 0,
  accent = C.accent,
  fill = C.bgAlt,
  size = 24,
  lineHeight = 33,
  dashed = false,
  muted = 0,
  children,
}) {
  const o = opacity * (1 - clamp01(muted) * 0.64);
  if (o <= 0.001) return null;
  const a = clamp01(active);
  const hot = a > 0.45;
  return (
    <g opacity={o < 1 ? o : undefined}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={22}
        fill={fill}
        stroke={accent}
        strokeWidth={3}
        strokeDasharray={dashed ? '12 10' : undefined}
      />
      {a > 0.001 ? (
        <rect x={x} y={y} width={w} height={h} rx={22} fill={C.redSoft} stroke={C.red} strokeWidth={5} opacity={a * 0.72} />
      ) : null}
      {icon ? <Icon name={icon} x={x + 40} y={y + 27} size={30} color={hot ? C.red : accent} /> : null}
      {label ? (
        <SvgText x={x + (icon ? 64 : 24)} y={y + 32} size={17} weight={700} anchor="start" color={hot ? C.red : accent}>
          {label}
        </SvgText>
      ) : null}
      <Multiline
        x={x + w / 2}
        y={y + h / 2 + (label || icon ? 12 : 7)}
        lines={lines}
        size={size}
        lineHeight={lineHeight}
        firstWeight={700}
      />
      {children}
    </g>
  );
}
