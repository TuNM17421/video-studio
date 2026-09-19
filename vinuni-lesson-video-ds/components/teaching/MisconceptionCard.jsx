import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { SvgText } from '../text/Text.jsx';

/**
 * MisconceptionCard — "nhiều người nghĩ… / thực ra…": the common belief on a quiet muted card, a red
 * strike drawn through its title, then the correction on a red card underneath.
 * Anatomy: micro label above each card (17/700) · card 150 px, radius 22, 3 px stroke · title 24/700 +
 * one muted 21/600 line. The belief card is bgAlt with a dotInactive stroke and muted text; the correction
 * is redSoft with a red stroke. `strike` (0–1) draws the line across the title's estimated width plus
 * 10 px each side (titles are UPPERCASE, which textWidth() estimates closely); `reveal` (0–1) fades the
 * correction in — keep it at 0 until the narration says it.
 */
export function MisconceptionCard({
  x,
  y,
  w = 1000,
  wrong,
  right,
  strike = 0,
  reveal = 1,
  wrongLabel = 'NHIỀU NGƯỜI NGHĨ',
  rightLabel = 'THỰC RA',
  opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const h = 150;
  const gap = 96;
  const ry = y + h + gap;
  const titleW = Math.min(w - 88, textWidth(wrong.title, 24, 700) * 1.02);
  const s = clamp01(strike);
  const r = clamp01(reveal);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <SvgText x={x} y={y - 16} size={17} weight={700} anchor="start" color={C.textMuted}>
        {wrongLabel}
      </SvgText>
      <rect x={x} y={y} width={w} height={h} rx={22} fill={C.bgAlt} stroke={C.dotInactive} strokeWidth={3} />
      <SvgText x={x + 44} y={y + 64} size={24} weight={700} anchor="start" color={C.textMuted}>
        {wrong.title}
      </SvgText>
      {wrong.sub ? (
        <SvgText x={x + 44} y={y + 104} size={21} anchor="start" color={C.textMuted}>
          {wrong.sub}
        </SvgText>
      ) : null}
      {s > 0.001 ? (
        <path
          d={`M ${x + 34} ${y + 56} H ${x + 34 + (titleW + 20) * s}`}
          stroke={C.red}
          strokeWidth={6}
          strokeLinecap="round"
        />
      ) : null}
      {r > 0.001 ? (
        <g opacity={r < 1 ? r : undefined}>
          <SvgText x={x} y={ry - 16} size={17} weight={700} anchor="start" color={C.red}>
            {rightLabel}
          </SvgText>
          <rect x={x} y={ry} width={w} height={h} rx={22} fill={C.redSoft} stroke={C.red} strokeWidth={3} />
          <SvgText x={x + 44} y={ry + 64} size={24} weight={700} anchor="start">
            {right.title}
          </SvgText>
          {right.sub ? (
            <SvgText x={x + 44} y={ry + 104} size={21} anchor="start" color={C.textMuted}>
              {right.sub}
            </SvgText>
          ) : null}
        </g>
      ) : null}
    </g>
  );
}
