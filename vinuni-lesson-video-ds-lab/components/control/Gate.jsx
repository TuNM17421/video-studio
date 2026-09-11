import React from 'react';
import { C, ROLE } from '../../lib/tokens.js';
import { clamp01, pulse } from '../../lib/motion.js';
import { LineIcon } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';

/** state → [stroke, soft fill, LineIcon]. */
export const GATE_STATES = Object.freeze({
  open: [ROLE.green, ROLE.greenSoft, 'lock-open'],
  blocked: [C.red, C.redSoft, 'lock'],
  error: [ROLE.orange, ROLE.orangeSoft, 'triangle-alert'],
  pending: [ROLE.amber, ROLE.amberSoft, 'hourglass'],
});

const THICK = 64;

/** Post rectangle of a gate ({x, y, w, h}); `x`, `y` are the gate CENTER. */
export function gateBox({ x, y, h = 164, orientation = 'vertical' }) {
  const vertical = orientation !== 'horizontal';
  const w = vertical ? THICK : h;
  const hh = vertical ? h : THICK;
  return { x: x - w / 2, y: y - hh / 2, w, h: hh };
}

/**
 * Where a connector meets the gate: `side` 'left' | 'right' | 'top' | 'bottom' of the post,
 * pushed `gap` px outward (default 10) so the arrowhead does not touch the stroke.
 * A particle that STOPS at the gate = `<Flow points={[anchor(A,'right'), gateStop(g)]} />` +
 * a dashed, dim `StaticPath` from `gateStop(g, 'right')` to the tool it never reaches.
 */
export function gateStop(gate, side = 'left', gap = 10) {
  const b = gateBox(gate);
  const cy = b.y + b.h / 2;
  const cx = b.x + b.w / 2;
  if (side === 'right') return { x: b.x + b.w + gap, y: cy };
  if (side === 'top') return { x: cx, y: b.y - gap };
  if (side === 'bottom') return { x: cx, y: b.y + b.h + gap };
  return { x: b.x - gap, y: cy };
}

/**
 * Gate — a checkpoint barrier sitting ON a connector (permission, approval, validation,
 * source check). Anatomy: a 64 px-thick rounded post (≈64×164, radius 18, 3 px stroke in the
 * state hue, soft fill) · a 52 px white disc in the middle holding the state LineIcon ·
 * a 17/700 uppercase label 34 px below the post (hue colored).
 * States: open (green, lock-open) · blocked (red, lock, red-soft fill) · error (orange,
 * triangle-alert) · pending (amber, hourglass).
 * Timing: pass `frame` + `at` (the frame something arrives) → a 54-frame pulse(): stroke 3→5
 * and a hue halo 10 px outside the post. Default props render the settled, un-pulsed gate.
 * Stop a Flow particle at the gate with `gateStop(gate, 'left')` (see helper above).
 * @category control
 */
export function Gate({
  x,
  y,
  h = 164,
  label,
  state = 'blocked',
  frame,
  at,
  opacity = 1,
  orientation = 'vertical',
}) {
  if (opacity <= 0.001) return null;
  const [hue, soft, icon] = GATE_STATES[state] || GATE_STATES.blocked;
  const b = gateBox({ x, y, h, orientation });
  const p = frame != null && at != null ? clamp01(pulse(frame, at)) : 0;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {p > 0.001 ? (
        <rect x={b.x - 10} y={b.y - 10} width={b.w + 20} height={b.h + 20} rx={26} fill="none" stroke={hue} strokeWidth={3} opacity={p * 0.5} />
      ) : null}
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={18} fill={soft} stroke={hue} strokeWidth={3 + 2 * p} />
      <circle cx={x} cy={y} r={26} fill={C.bg} stroke={hue} strokeWidth={2} />
      <LineIcon name={icon} x={x} y={y} size={34} color={hue} strokeWidth={1.5} />
      {label ? (
        <SvgText x={x} y={b.y + b.h + 34} size={17} weight={700} color={hue} letterSpacing={0.6}>
          {label}
        </SvgText>
      ) : null}
    </g>
  );
}
