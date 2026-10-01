import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { pillWidth, textWidth } from '../../lib/geometry.js';
import { SvgText } from '../text/Text.jsx';

/**
 * MetricRow — the readings that belong to one case: 1–3 big numbers with their labels, in a bgAlt
 * strip. Sibling rows under a TwinPair must carry the SAME labels in the SAME order, because the
 * reader compares them by column, not by hunting.
 *
 * Anatomy: bgAlt box, radius 16 · 6 px red rail down the left edge when `lead` (this is the case the
 * lesson lands on) · label 17/600 muted on a baseline a third of the way down · value `size`/700 (36 by
 * default) at 76 % of the height, so the rhythm holds at any `h` · `delta` = red-soft pill, 2 px red
 * stroke, 17/700 red, measured off the real width of the value — only for a ratio the script states.
 *
 * Rules: at most three items — a fourth turns a reading into a spec sheet · only the number the
 * narration names carries `accent` · never put a unit in `label` and again in `value` · allow roughly
 * 170 px of row per reading at the default size; below that the value shrinks to fit rather than
 * colliding with its neighbour.
 */
export function MetricRow({ x, y, w, h = 108, items = [], size = 36, lead = false, fill = C.bgAlt, opacity = 1, reveal = 1 }) {
  const o = clamp01(opacity) * clamp01(reveal);
  if (o <= 0.001 || !items.length) return null;
  const pad = 26;
  const step = (w - pad) / items.length;
  return (
    <g opacity={o < 1 ? o : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={16} fill={fill} />
      {lead ? <rect x={x} y={y} width={6} height={h} rx={3} fill={C.red} /> : null}
      {items.map((it, i) => {
        const ix = x + pad + i * step;
        const dw = it.delta ? Math.max(58, pillWidth(it.delta, 17)) : 0;
        // The value shrinks to its column rather than running into the next reading: a row that is one
        // word too narrow must not silently overlap two numbers.
        const room = step - 14 - (it.delta ? dw + 16 : 0);
        const full = textWidth(String(it.value), size, 700);
        const vs = full > room ? Math.max(18, Math.floor((size * room) / full)) : size;
        const vw = textWidth(String(it.value), vs, 700);
        return (
          <g key={i}>
            <SvgText x={ix} y={y + h * 0.333} size={17} weight={600} anchor="start" color={C.textMuted}>
              {it.label}
            </SvgText>
            <SvgText x={ix} y={y + h * 0.759} size={vs} weight={700} anchor="start" color={it.accent ? C.red : C.text}>
              {it.value}
            </SvgText>
            {it.delta ? (
              <g>
                <rect x={ix + vw + 16} y={y + h * 0.759 - vs * 0.62} width={dw} height={38} rx={10} fill={C.redSoft} stroke={C.red} strokeWidth={2} />
                <SvgText x={ix + vw + 16 + dw / 2} y={y + h * 0.759 - vs * 0.62 + 25} size={17} weight={700} color={C.red}>
                  {it.delta}
                </SvgText>
              </g>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
