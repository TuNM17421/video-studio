import React from 'react';
import { C } from '../../lib/tokens.js';
import { pillWidth, textWidth } from '../../lib/geometry.js';
import { SvgText } from '../text/Text.jsx';

/**
 * Pill label, 50 px tall, full radius, 18 px bold text (uppercase copy).
 * variant 'outline' (white fill, accent stroke; `active` → red-soft fill + red) ·
 * 'solid' (accent or red fill, white text) · 'muted' (dotInactive fill, grey text).
 * Width defaults to an estimate from the label. Port of Pill in Day05 shared.tsx.
 */
export function Pill({ x, y, w, label, opacity = 1, active = false, accent = C.accent, variant = 'outline', h = 50, size = 18 }) {
  if (opacity <= 0.001) return null;
  const width = w ?? pillWidth(label, size);
  let fill = active ? C.redSoft : C.bg;
  let stroke = active ? C.red : accent;
  let color = active ? C.red : C.text;
  if (variant === 'solid') {
    fill = active ? C.red : accent;
    stroke = 'none';
    color = C.bg;
  } else if (variant === 'muted') {
    fill = C.dotInactive;
    stroke = 'none';
    color = C.textMuted;
  }
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect
        x={x}
        y={y}
        width={width}
        height={h}
        rx={h / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke === 'none' ? undefined : 2.5}
      />
      <SvgText x={x + width / 2} y={y + h / 2 + size * 0.36} size={size} weight={700} color={color}>
        {label}
      </SvgText>
    </g>
  );
}

/**
 * Small flat chip (no stroke), radius 14 — tags inside cards: "CHẶN", "ĐỌC", "Có mã".
 * tone 'blue' (dotInactive / accentStrong) · 'red' (redSoft / red) · 'muted'.
 * Port of Chip in Day03/Day04 rebuild-v1 shared.tsx.
 */
export function Chip({ x, y, label, tone = 'blue', size = 18, h = 36, w, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const width = w ?? Math.round(textWidth(label, size, 700) + 26);
  const fill = tone === 'red' ? C.redSoft : C.dotInactive;
  const color = tone === 'red' ? C.red : tone === 'muted' ? C.textMuted : C.accentStrong;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={width} height={h} rx={14} fill={fill} />
      <SvgText x={x + width / 2} y={y + h / 2 + size * 0.36} size={size} weight={700} color={color}>
        {label}
      </SvgText>
    </g>
  );
}
