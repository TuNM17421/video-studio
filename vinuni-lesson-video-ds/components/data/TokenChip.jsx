import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { SvgText } from '../text/Text.jsx';

/**
 * Token box (170×80, radius 16, 2 px accent stroke, bgAlt, 36 px bold word). `selected` = the
 * newly chosen token (red-soft + red). `active` thickens the stroke up to 5 px while in focus.
 * Lay tokens out at fixed x positions (e.g. x = 180 + i * 200) — never flex.
 * Port of Box/Rail in Day01 video-03-next-token/shared.tsx.
 */
export function TokenChip({ x, y, text, w = 170, h = 80, size = 36, selected = false, active = 0, dashed = false, muted = false, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const sw = 2 + clamp01(active) * 3;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect
        x={x + sw / 2}
        y={y + sw / 2}
        width={w - sw}
        height={h - sw}
        rx={16}
        fill={selected ? C.redSoft : C.bgAlt}
        stroke={selected ? C.red : C.accent}
        strokeWidth={sw}
        strokeDasharray={dashed ? '10 8' : undefined}
      />
      <SvgText x={x + w / 2} y={y + h / 2 + size * 0.35} size={size} weight={700} color={selected ? C.red : muted ? C.textMuted : C.text}>
        {text}
      </SvgText>
    </g>
  );
}
