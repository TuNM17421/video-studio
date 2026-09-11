import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { SvgText } from '../text/Text.jsx';

/**
 * Parameter slider (e.g. temperature): 12 px dotInactive track, red fill up to the knob,
 * white knob (r 18) with a 6 px red ring, muted extreme labels on the track line 34 px outside
 * each end (clear of the knob at both extremes), red caption underneath.
 * Anything the slider controls must reshape continuously with the same `value`, and the scene
 * should HOLD at both extremes long enough to read the contrast.
 * Port of TemperatureSlider in Day05 video-01 Scene03.
 */
export function Slider({ x1, x2, y, value, left, right, title, color = C.red, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const kx = x1 + (x2 - x1) * clamp01(value);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {left ? (
        <SvgText x={x1 - 34} y={y + 6} size={17} weight={700} anchor="end" color={C.textMuted}>
          {left}
        </SvgText>
      ) : null}
      <path d={`M ${x1} ${y} H ${x2}`} fill="none" stroke={C.dotInactive} strokeLinecap="round" strokeWidth={12} />
      <path d={`M ${x1} ${y} H ${kx}`} fill="none" stroke={color} strokeLinecap="round" strokeWidth={12} />
      <circle cx={kx} cy={y} r={18} fill={C.bg} stroke={color} strokeWidth={6} />
      {right ? (
        <SvgText x={x2 + 34} y={y + 6} size={17} weight={700} anchor="start" color={C.textMuted}>
          {right}
        </SvgText>
      ) : null}
      {title ? (
        <SvgText x={(x1 + x2) / 2} y={y + 60} size={18} weight={700} color={color}>
          {title}
        </SvgText>
      ) : null}
    </g>
  );
}
