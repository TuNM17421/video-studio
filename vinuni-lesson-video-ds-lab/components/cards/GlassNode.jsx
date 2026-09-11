import React from 'react';
import { C } from '../../lib/tokens.js';
import { Icon } from '../icons/Icons.jsx';
import { SvgText } from '../text/Text.jsx';

const TONE = { accent: C.accent, strong: C.accentStrong, danger: C.red };

/**
 * Editorial (Day28) system node: white card, radius 22, 3 px stroke, icon on top, bold label,
 * muted subtitle — centered on (x, y). tone: 'accent' | 'strong' (the active one) | 'danger'.
 * `logo` accepts an <image>/<svg> element for a NAMED technology (keep its native colors).
 * Port of GlassNode in src/videos/Day28/D28V01Shared.tsx.
 */
export function GlassNode({
  x,
  y,
  label,
  subtitle,
  icon,
  logo,
  w = 240,
  h = 150,
  tone = 'accent',
  opacity = 1,
  scale = 1,
  muted = false,
}) {
  const o = opacity * (muted ? 0.34 : 1);
  if (o <= 0.001) return null;
  const color = TONE[tone] ?? C.accent;
  const hasMark = Boolean(icon || logo);
  const blockH = (hasMark ? 52 : 0) + 24 + (subtitle ? 24 : 0);
  const top = y - blockH / 2;
  const labelY = top + (hasMark ? 52 : 0) + 19;
  return (
    <g
      opacity={o < 1 ? o : undefined}
      transform={scale !== 1 ? `translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})` : undefined}
    >
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={22} fill={C.bg} stroke={color} strokeWidth={3} />
      {icon ? <Icon name={icon} x={x} y={top + 21} size={42} color={color} /> : null}
      {logo ? <g transform={`translate(${x - 24} ${top - 3})`}>{logo}</g> : null}
      <SvgText x={x} y={labelY} size={23} weight={700} letterSpacing={0.3}>
        {label}
      </SvgText>
      {subtitle ? (
        <SvgText x={x} y={labelY + 26} size={17} weight={600} color={C.textMuted}>
          {subtitle}
        </SvgText>
      ) : null}
    </g>
  );
}
