import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { Pill } from '../labels/Pill.jsx';
import { SvgText } from '../text/Text.jsx';

/**
 * WipeSplit — ONE continuous drawing cut by a vertical divider, with the name of whatever causes the
 * change riding on the divider.
 *
 * That label is the whole point. Two pictures side by side say "these differ"; a divider labelled "AI"
 * says "AI made that side happen" — a causal sentence, which is what the narration is actually saying.
 * Because the subject runs across the cut (let a shape straddle it), the viewer sees the same thing
 * change rather than two separate pictures.
 *
 * Anatomy: stage box, radius 22, 3 px dotInactive · `left` clipped to x < split, `right` to x ≥ split ·
 * divider 5 px red, full height · label = solid red Pill centred on the divider at `labelY` · side
 * captions 21/700 on a baseline 46 px below the stage top, left one anchored start, right one end.
 *
 * Two recipes: a **held comparison** puts the before state in `left` (Vietnamese reads left to right)
 * and keeps `at` at 0.5; a **running wipe** puts the after state in `left` and animates `at` 0→1, so
 * the divider travels left to right and leaves the new state behind it. Either way the side captions
 * say which is which, so a frozen frame is never ambiguous.
 */
export function WipeSplit({
  x,
  y,
  w,
  h,
  at = 0.5,
  label,
  labelY,
  left,
  right,
  leftLabel,
  rightLabel,
  frame = true,
  opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const t = clamp01(at);
  const split = x + w * t;
  // The id must encode EVERYTHING the clips depend on, `at` included. SVG resolves url(#id) to the
  // first definition in the document, so two splits sharing an id share a divider: the second one draws
  // its red line in the right place and clips its halves in the wrong one. Keyed this way, two ids
  // collide only when the clips are identical, which is harmless.
  const key = `${Math.round(x)}-${Math.round(y)}-${Math.round(w)}-${Math.round(h)}-${Math.round(t * 1000)}`;
  const lid = `vk-ws-l-${key}`;
  const rid = `vk-ws-r-${key}`;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <defs>
        <clipPath id={lid}>
          <rect x={x} y={y} width={Math.max(0, split - x)} height={h} />
        </clipPath>
        <clipPath id={rid}>
          <rect x={split} y={y} width={Math.max(0, x + w - split)} height={h} />
        </clipPath>
      </defs>
      {frame ? <rect x={x} y={y} width={w} height={h} rx={22} fill={C.bg} stroke={C.dotInactive} strokeWidth={3} /> : null}
      <g clipPath={`url(#${lid})`}>{left}</g>
      <g clipPath={`url(#${rid})`}>{right}</g>
      {leftLabel && t > 0.12 ? (
        <SvgText x={x + 32} y={y + 46} size={21} weight={700} anchor="start" color={C.textMuted}>
          {leftLabel}
        </SvgText>
      ) : null}
      {rightLabel && t < 0.88 ? (
        <SvgText x={x + w - 32} y={y + 46} size={21} weight={700} anchor="end">
          {rightLabel}
        </SvgText>
      ) : null}
      <line x1={split} y1={y} x2={split} y2={y + h} stroke={C.red} strokeWidth={5} />
      {label ? <Pill x={split - 48} y={labelY ?? y + h / 2 - 25} w={96} label={label} variant="solid" accent={C.red} /> : null}
    </g>
  );
}
