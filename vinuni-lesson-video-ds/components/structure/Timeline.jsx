import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { SvgText } from '../text/Text.jsx';

/**
 * Timeline — milestones on one horizontal rail (năm · mốc), filled left to right as the narration
 * walks forward, with the milestone being discussed in red.
 * Anatomy: 10 px round-capped rail, dotInactive, with the accent fill on top up to `progress` · dots
 * r 18 (r 24 for the current one) spaced evenly from x to x + w · label 24/700 text 48 px above the rail ·
 * year 17/700 below (muted, red on the current milestone).
 * A milestone lights up (accent dot, full opacity) the moment the fill reaches it; before that it is a
 * hollow dotInactive dot at 45 %. `progress` (0–1) and the lit dots come from the same value, so drive
 * it with one smooth() per step and hold between steps. Labels are centered on their dot — keep them
 * under ~16 characters at 4 milestones across 1480 px, fewer characters with more milestones.
 */
export function Timeline({ x, y, w = 1480, items = [], progress = 1, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const n = items.length;
  const step = n > 1 ? w / (n - 1) : 0;
  const p = clamp01(progress);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <path d={`M ${x} ${y} H ${x + w}`} stroke={C.dotInactive} strokeWidth={10} strokeLinecap="round" />
      {p > 0.001 ? (
        <path d={`M ${x} ${y} H ${x + w * p}`} stroke={C.accent} strokeWidth={10} strokeLinecap="round" />
      ) : null}
      {items.map((it, i) => {
        const cx = x + i * step;
        const on = n <= 1 || i / (n - 1) <= p + 0.001;
        const now = on && it.current;
        return (
          <g key={i} opacity={on ? undefined : 0.45}>
            <circle
              cx={cx}
              cy={y}
              r={now ? 24 : 18}
              fill={now ? C.red : on ? C.accent : C.bg}
              stroke={on ? 'none' : C.dotInactive}
              strokeWidth={4}
            />
            <SvgText x={cx} y={y - 48} size={24} weight={700} color={now ? C.red : C.text}>
              {it.label}
            </SvgText>
            <SvgText x={cx} y={y + 62} size={17} weight={700} color={now ? C.red : C.textMuted}>
              {it.year}
            </SvgText>
          </g>
        );
      })}
    </g>
  );
}
