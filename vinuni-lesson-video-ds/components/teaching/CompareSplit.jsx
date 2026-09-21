import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { pillWidth } from '../../lib/geometry.js';
import { SvgText } from '../text/Text.jsx';

function Column({ x, y, w, side, color, fill, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <SvgText x={x} y={y - 22} size={17} weight={700} anchor="start" color={color}>
        {side.tag}
      </SvgText>
      <rect x={x} y={y} width={w} height={132} rx={22} fill={fill} stroke={color} strokeWidth={3} />
      <SvgText x={x + 40} y={y + 76} size={24} weight={700} anchor="start">
        {side.title}
      </SvgText>
      {(side.lines || []).map((t, i) => (
        <SvgText key={i} x={x + 40} y={y + 196 + i * 44} size={21} anchor="start" color={C.textMuted}>
          {t}
        </SvgText>
      ))}
    </g>
  );
}

/**
 * CompareSplit — two versions side by side (BẢN A / BẢN B, trước / sau) split by a dashed divider,
 * each a title card plus up to 3 muted lines underneath, and an optional verdict pill across the bottom
 * that names the one difference that matters.
 * Anatomy: micro tag above each card (A accent, B red) · card 132 px, radius 22, 3 px stroke (A bgAlt,
 * B redSoft) · title 24/700 · lines 21/600 muted, 44 px apart · divider 4 px dotInactive, dash `12 10` ·
 * verdict = white pill, 3 px red stroke, 18/700 red, centered on the bottom edge of the zone.
 * `leftReveal` / `rightReveal` / `verdictReveal` (0–1) show the three parts in order; the right side is
 * the one the lesson lands on. When the two sides are processes, use the `flow-compare` scene template
 * (Flow + Enclosure) instead; this is for two static versions of one thing.
 */
export function CompareSplit({
  x,
  y,
  w = 1520,
  h = 420,
  left,
  right,
  verdict,
  leftReveal = 1,
  rightReveal = 1,
  verdictReveal = 1,
  opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const cw = (w - 100) / 2;
  const bx = x + w - cw;
  const pw = verdict ? Math.max(360, pillWidth(verdict, 18) * 1.1) : 0;
  const vo = clamp01(verdictReveal);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <path
        d={`M ${x + w / 2} ${y - 20} V ${y + h - 40}`}
        stroke={C.dotInactive}
        strokeWidth={4}
        strokeDasharray="12 10"
      />
      <Column x={x} y={y} w={cw} side={left} color={C.accent} fill={C.bgAlt} opacity={clamp01(leftReveal)} />
      <Column x={bx} y={y} w={cw} side={right} color={C.red} fill={C.redSoft} opacity={clamp01(rightReveal)} />
      {verdict && vo > 0.001 ? (
        <g opacity={vo < 1 ? vo : undefined}>
          <rect x={x + w / 2 - pw / 2} y={y + h - 36} width={pw} height={64} rx={32} fill={C.bg} stroke={C.red} strokeWidth={3} />
          <SvgText x={x + w / 2} y={y + h + 2} size={18} weight={700} color={C.red}>
            {verdict}
          </SvgText>
        </g>
      ) : null}
    </g>
  );
}
