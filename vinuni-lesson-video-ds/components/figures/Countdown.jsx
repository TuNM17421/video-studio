import React from 'react';
import { C } from '../../lib/tokens.js';
import { SvgText } from '../text/Text.jsx';

/**
 * Countdown — the ring that runs during a held pause, with the seconds left written inside it.
 *
 * A quiz pause is the one stretch of a lesson video where nothing is said and nothing moves, and the
 * viewer has to trust that it will end. The ring answers "how much longer" at a glance while the number
 * answers it exactly; Stopwatch (Figures.jsx) sweeps a hand but never says how long is left, which is the
 * only thing being asked here.
 *
 * It is driven by the scene frame, not by wall-clock time — the render paints frames out of order and far
 * slower than real time, so anything reading a clock would come out wrong.
 */
export function Countdown({
  x,
  y,
  r = 96,
  seconds = 30,
  frame = 0,
  fps = 30,
  color = C.red,
  track = C.dotInactive,
  label,
  opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const total = Math.max(0.001, seconds);
  const left = Math.min(total, Math.max(0, total - frame / fps));
  const share = left / total;
  const ring = r - 10;
  // The arc starts at twelve o'clock and empties clockwise. SVG cannot draw a 360° arc in one command, so
  // a ring that is still (near enough) whole is drawn as a plain circle.
  const angle = -Math.PI / 2 + share * Math.PI * 2;
  const ex = x + Math.cos(angle) * ring;
  const ey = y + Math.sin(angle) * ring;
  const arc =
    share >= 0.999 ? (
      <circle cx={x} cy={y} r={ring} fill="none" stroke={color} strokeWidth={12} />
    ) : share <= 0.001 ? null : (
      <path
        d={`M ${x} ${y - ring} A ${ring} ${ring} 0 ${share > 0.5 ? 1 : 0} 1 ${ex} ${ey}`}
        fill="none"
        stroke={color}
        strokeWidth={12}
        strokeLinecap="round"
      />
    );

  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <circle cx={x} cy={y} r={ring} fill={C.bg} stroke={track} strokeWidth={12} />
      {arc}
      {/* Ceil, so the number only reaches zero when the pause is actually over. */}
      <SvgText x={x} y={y + r * 0.22} size={r * 0.78} weight={800} color={color}>
        {String(Math.ceil(left - 0.0001) > 0 ? Math.ceil(left - 0.0001) : 0)}
      </SvgText>
      {label ? (
        <SvgText x={x} y={y + r + 40} size={24} weight={700} color={C.textMuted}>
          {label}
        </SvgText>
      ) : null}
    </g>
  );
}
