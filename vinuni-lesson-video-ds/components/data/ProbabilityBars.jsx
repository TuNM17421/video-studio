import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { SvgText } from '../text/Text.jsx';

/**
 * Horizontal distribution bars — "phân bố cho token kế tiếp". Label · track · fill · value %.
 * Blue = candidate, red = the chosen / highlighted item. `reveal` (0–1) grows every bar from the
 * same continuous value; the % appears as the bars finish. For a reshaping distribution, pass
 * new `value`s every frame (the number and the bar always come from the same value).
 * `rounded` = Day05 pill bars on a dotInactive track; default = Day01 bars on bgAlt, radius 5.
 * Port of Bars (Day01 video-03-next-token/shared.tsx) and ProbabilityBars (Day05 Scene03).
 */
export function ProbabilityBars({
  x,
  y,
  items,
  reveal = 1,
  barW = 360,
  barH = 43,
  rowGap = 76,
  labelW = 155,
  size = 30,
  rounded = false,
  showValues = true,
  title,
  footnote,
  max,
  opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const m = max ?? Math.max(1, ...items.map((it) => it.value));
  const r = clamp01(reveal);
  const valueOpacity = clamp01((r - 0.6) / 0.4);
  const rx = rounded ? barH / 2 : 5;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {title ? (
        <SvgText x={x} y={y - 26} size={26} weight={600} anchor="start">
          {title}
        </SvgText>
      ) : null}
      {items.map((it, i) => {
        const top = y + i * rowGap;
        const color = it.highlight ? C.red : C.accent;
        const bw = barW * clamp01(it.value / m) * r;
        const base = top + barH / 2 + size * 0.35;
        return (
          <g key={it.label}>
            <SvgText x={x} y={base} size={size} weight={it.highlight ? 700 : 600} anchor="start" color={it.highlight ? C.red : C.text}>
              {it.label}
            </SvgText>
            <rect x={x + labelW} y={top} width={barW} height={barH} rx={rx} fill={rounded ? C.dotInactive : C.bgAlt} />
            {bw > 0.5 ? <rect x={x + labelW} y={top} width={Math.max(bw, rounded ? Math.min(barH, bw) : bw)} height={barH} rx={rx} fill={color} /> : null}
            {showValues ? (
              <SvgText
                x={x + labelW + barW + 22}
                y={base}
                size={size}
                weight={700}
                anchor="start"
                color={it.highlight ? C.red : C.text}
                opacity={valueOpacity}
              >
                {`${Math.round(it.value)}%`}
              </SvgText>
            ) : null}
          </g>
        );
      })}
      {footnote ? (
        <SvgText x={x + labelW} y={y + items.length * rowGap + 16} size={24} weight={600} anchor="start" color={C.textMuted} opacity={valueOpacity}>
          {footnote}
        </SvgText>
      ) : null}
    </g>
  );
}
