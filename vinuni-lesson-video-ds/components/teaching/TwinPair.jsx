import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { StatusDot } from '../labels/NumberBadge.jsx';
import { SvgText } from '../text/Text.jsx';

/**
 * TwinPair — the same object drawn twice, differing in exactly ONE thing.
 *
 * The point is not saved code, it is the rule. Both sides come from a single `render(side)` and get an
 * identical box, so the two drawings cannot drift apart by a stroke width or ten pixels; the only thing
 * `render` is given to branch on is `side.variant` ('a' | 'b'). If a scene needs to change the geometry
 * between the sides, it is no longer a comparison — it is two examples, and belongs in two cards.
 *
 * Anatomy: left label with an accent StatusDot, right label with a red one, 22/700 on a baseline 26 px
 * above the boxes · two boxes of (w − gap) / 2 · `diff` = one line, 19/600 muted, centered under the
 * pair: the single sentence naming what differs. Never mirror one side — mirroring makes identical
 * shapes look different.
 *
 * Rules: one variable per pair · side B (red) is where the lesson lands · reveal left then right on
 * their own spoken phrases · put a `MetricRow` with the SAME labels under each side.
 */
export function TwinPair({
  x,
  y,
  w,
  h,
  gap = 60,
  a = {},
  b = {},
  diff,
  render,
  aReveal = 1,
  bReveal = 1,
  diffReveal = 1,
  opacity = 1,
}) {
  if (opacity <= 0.001 || typeof render !== 'function') return null;
  const cw = (w - gap) / 2;
  const sides = [
    { variant: 'a', index: 0, x, y, w: cw, h, accent: C.accent, label: a.label, reveal: clamp01(aReveal) },
    { variant: 'b', index: 1, x: x + cw + gap, y, w: cw, h, accent: C.red, label: b.label, reveal: clamp01(bReveal) },
  ];
  const dr = clamp01(diffReveal);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {sides.map((s) =>
        s.reveal <= 0.001 ? null : (
          <g key={s.variant} opacity={s.reveal < 1 ? s.reveal : undefined}>
            {s.label ? (
              <g>
                <StatusDot x={s.x + 9} y={s.y - 26} active={s.variant === 'b'} />
                <SvgText x={s.x + 30} y={s.y - 18} size={22} weight={700} anchor="start">
                  {s.label}
                </SvgText>
              </g>
            ) : null}
            {render(s)}
          </g>
        ),
      )}
      {diff && dr > 0.001 ? (
        <SvgText x={x + w / 2} y={y + h + 44} size={19} weight={600} color={C.textMuted} opacity={dr}>
          {diff}
        </SvgText>
      ) : null}
    </g>
  );
}
