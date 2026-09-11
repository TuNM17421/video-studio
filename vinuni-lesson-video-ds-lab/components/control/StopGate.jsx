import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01, pulse } from '../../lib/motion.js';
import { LineIcon } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';

/** Script stop conditions → LineIcon. Any other label falls back to 'x'. */
export const STOP_PRESETS = Object.freeze({
  'HẾT BƯỚC': 'list-checks',
  'ĐỦ 3 LẦN': 'repeat',
  'CẦN NGƯỜI': 'user-check',
  'HẾT GIỜ': 'clock',
});

const octagon = (cx, cy, r) =>
  Array.from({ length: 8 }, (_, i) => {
    const a = ((22.5 + 45 * i) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

/**
 * StopGate — one stop condition of an agent loop ("HẾT BƯỚC", "ĐỦ 3 LẦN", "CẦN NGƯỜI", "HẾT GIỜ").
 * Anatomy: an octagon (circumradius 48, flat top) · a 40 px LineIcon inside (from STOP_PRESETS or
 * `icon`) · 17/700 uppercase label 34 px under the octagon · optional lowercase `detail` 17/500
 * muted below it.
 * States: idle = white fill, 3 px accent stroke, accent icon, ink label · triggered = red-soft
 * fill, 5 px red stroke, red icon + label.
 * Timing: `triggered` may be a boolean or 0–1. With `frame` + `at` (and no `triggered`) it
 * triggers at `at`, with a 54-frame pulse() halo ring. Default props render the idle gate.
 * @category control
 */
export function StopGate({ x, y, label, detail, icon, triggered, frame, at, opacity = 1, r = 48 }) {
  if (opacity <= 0.001) return null;
  const timed = frame != null && at != null;
  const t = triggered != null ? (typeof triggered === 'number' ? clamp01(triggered) : triggered ? 1 : 0) : timed && frame >= at ? 1 : 0;
  const hot = t > 0.5;
  const p = timed ? clamp01(pulse(frame, at)) : 0;
  const glyph = icon || STOP_PRESETS[label] || 'x';
  const stroke = hot ? C.red : C.accent;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {p > 0.001 ? <polygon points={octagon(x, y, r + 14)} fill="none" stroke={C.red} strokeWidth={3} opacity={p * 0.5} strokeLinejoin="round" /> : null}
      <polygon points={octagon(x, y, r)} fill={C.bg} stroke={C.accent} strokeWidth={3} strokeLinejoin="round" />
      {t > 0.001 ? (
        <polygon points={octagon(x, y, r)} fill={C.redSoft} stroke={C.red} strokeWidth={5} strokeLinejoin="round" opacity={t < 1 ? t : undefined} />
      ) : null}
      <LineIcon name={glyph} x={x} y={y} size={40} color={stroke} strokeWidth={1.5} />
      {label ? (
        <SvgText x={x} y={y + r + 34} size={17} weight={700} color={hot ? C.red : C.text} letterSpacing={0.6}>
          {label}
        </SvgText>
      ) : null}
      {detail ? (
        <SvgText x={x} y={y + r + 60} size={17} weight={500} color={C.textMuted}>
          {detail}
        </SvgText>
      ) : null}
    </g>
  );
}
