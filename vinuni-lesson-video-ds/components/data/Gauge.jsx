import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { SvgText } from '../text/Text.jsx';

/**
 * Gauge — a half-circle dial for one reading against a threshold (độ tin cậy 0,72 so với ngưỡng 0,6).
 * Anatomy: 180° arc of radius `r` opening downward from the left, stroke 0.21·r, round caps ·
 * dotInactive track, accent fill up to `value` — red once the value is past `threshold` in the
 * `danger` direction · threshold = a 7 px red tick across the track · readout centered inside the arc
 * (0.38·r, 700) · optional label 18/700 accentStrong above and muted 17/700 end labels under both ends.
 * `value` (0–1) is continuous: derive both the arc and `readout` from it (round only in the text) and
 * sweep it with smooth(); hold ≥ 45 f at the reading the narration names. `danger` 'above' (default)
 * turns the fill red when value > threshold, 'below' when value < threshold, 'none' keeps it accent.
 */
export function Gauge({
  cx,
  cy,
  r = 200,
  value = 0.5,
  threshold,
  danger = 'above',
  label,
  readout,
  min,
  max,
  opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const sw = r * 0.21;
  const v = clamp01(value);
  const at = (t, rr = r) => {
    const a = Math.PI * (1 - clamp01(t));
    return [cx + rr * Math.cos(a), cy - rr * Math.sin(a)];
  };
  const [ex, ey] = at(v);
  const past =
    threshold != null && ((danger === 'above' && v > threshold) || (danger === 'below' && v < threshold));
  const fill = past ? C.red : C.accent;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {label ? (
        <SvgText x={cx} y={cy - r - sw / 2 - 40} size={18} weight={700} color={C.accentStrong}>
          {label}
        </SvgText>
      ) : null}
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={C.dotInactive} strokeWidth={sw} strokeLinecap="round" />
      {v > 0.001 ? (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${ex} ${ey}`} fill="none" stroke={fill} strokeWidth={sw} strokeLinecap="round" />
      ) : null}
      {threshold != null
        ? (() => {
            const [x1, y1] = at(threshold, r - sw * 0.85);
            const [x2, y2] = at(threshold, r + sw * 0.85);
            return <path d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke={C.red} strokeWidth={7} strokeLinecap="round" />;
          })()
        : null}
      {readout != null ? (
        <SvgText x={cx} y={cy - 22} size={Math.round(r * 0.38)} weight={700} color={past ? C.red : C.text}>
          {readout}
        </SvgText>
      ) : null}
      {min != null ? (
        <SvgText x={cx - r} y={cy + sw / 2 + 36} size={17} weight={700} color={C.textMuted}>
          {min}
        </SvgText>
      ) : null}
      {max != null ? (
        <SvgText x={cx + r} y={cy + sw / 2 + 36} size={17} weight={700} color={C.textMuted}>
          {max}
        </SvgText>
      ) : null}
    </g>
  );
}
