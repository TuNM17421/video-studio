import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { pillWidth } from '../../lib/geometry.js';
import { Pill } from '../labels/Pill.jsx';

/**
 * The "glassbox machine": a translucent bgAlt panel (radius 30, 3 px accent stroke) that shows
 * what happens INSIDE a black-box concept (model, agent, pipeline). Children are drawn inside;
 * a Pill label straddles the top edge. `active` flashes the red-soft overlay while data passes.
 * Port of GlassBox in Day05 shared.tsx.
 */
export function GlassBox({ x, y, w, h, label, opacity = 1, active = 0, accent = C.accent, children }) {
  if (opacity <= 0.001) return null;
  const a = clamp01(active);
  const pw = label ? Math.min(w - 48, Math.max(180, pillWidth(label, 18))) : 0;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={30} fill={C.bgAlt} fillOpacity={0.68} stroke={accent} strokeWidth={3} />
      {a > 0.001 ? (
        <rect x={x} y={y} width={w} height={h} rx={30} fill={C.redSoft} stroke={C.red} strokeWidth={5} opacity={a * 0.5} />
      ) : null}
      {children}
      {label ? <Pill x={x + 24} y={y - 25} w={pw} label={label} active={a > 0.45} /> : null}
    </g>
  );
}
