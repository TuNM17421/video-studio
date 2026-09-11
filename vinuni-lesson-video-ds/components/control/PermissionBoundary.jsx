import React from 'react';
import { C, ROLE_OF, alpha } from '../../lib/tokens.js';
import { textWidth } from '../../lib/geometry.js';
import { LineIcon } from '../icons/LineIcon.jsx';
import { Cross } from '../marks/Marks.jsx';
import { SvgText } from '../text/Text.jsx';
import { illustrativeTag } from '../labels/IllustrativeStamp.jsx';

/** tone → stroke color: 'accent' | 'red' | a ROLE_OF key ('process', 'output', 'check', 'action', 'memory', …). */
export function toneColor(tone = 'accent') {
  if (tone === 'accent') return C.accent;
  if (tone === 'red') return C.red;
  if (ROLE_OF[tone]) return ROLE_OF[tone][0];
  return tone; // already a color
}

/**
 * Red "not allowed" badge: a 44 px red-soft disc with a red cross, centered on (x, y).
 * PermissionBoundary puts one on the top-right corner of every `blocked` box.
 */
export function BlockedBadge({ x, y, size = 44, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <circle cx={x} cy={y} r={size / 2} fill={C.redSoft} stroke={C.red} strokeWidth={3} />
      <Cross x={x} y={y} size={size * 0.36} strokeWidth={4.5} />
    </g>
  );
}

/**
 * PermissionBoundary — a dashed permission zone (like Enclosure) that says "the agent may act
 * only in here". Anatomy: rounded rect (radius 32, 4 px stroke, dash 15 12) in the tone color with
 * a 4 % tint · a 50 px badge pill straddling the top edge (36 px in) with a lock / lock-open
 * LineIcon + 18/700 uppercase label ("PHẠM VI QUYỀN", "CHỈ ĐỌC") · children drawn inside ·
 * `blocked` boxes (items drawn OUTSIDE by the caller, e.g. a "HOÀN TIỀN" card) get a BlockedBadge
 * on their top-right corner.
 * States: locked (default true → lock icon) / unlocked (lock-open). No built-in animation:
 * drive `opacity` (appear) and the blocked items' reveal from the scene.
 * `illustrative` defaults to false (structural); pass true / a label when the zone names a mock product.
 * @category control
 */
export function PermissionBoundary({
  x,
  y,
  w,
  h,
  label = 'PHẠM VI QUYỀN',
  tone = 'accent',
  locked = true,
  opacity = 1,
  illustrative = false,
  blocked = [],
  labelX,
  children,
}) {
  if (opacity <= 0.001) return null;
  const color = toneColor(tone);
  const bw = label ? Math.round(textWidth(label, 18, 700) + 44 + 34) : 0;
  const bx = labelX ?? x + 36;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={32} fill={alpha(color, 0.04)} stroke={color} strokeDasharray="15 12" strokeWidth={4} />
      {children}
      {label ? (
        <g>
          <rect x={bx} y={y - 25} width={bw} height={50} rx={25} fill={C.bg} stroke={color} strokeWidth={2.5} />
          <LineIcon name={locked ? 'lock' : 'lock-open'} x={bx + 32} y={y} size={26} color={color} strokeWidth={1.6} />
          <SvgText x={bx + 52} y={y + 6.5} size={18} weight={700} anchor="start" color={color}>
            {label}
          </SvgText>
        </g>
      ) : null}
      {blocked.map((b, i) => (
        <BlockedBadge key={i} x={b.x + b.w - 4} y={b.y + 4} />
      ))}
      {illustrativeTag(illustrative, { x, y: y + 4, w, h })}
    </g>
  );
}
