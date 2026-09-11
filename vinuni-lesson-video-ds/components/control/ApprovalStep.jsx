import React from 'react';
import { C, ROLE } from '../../lib/tokens.js';
import { clamp01, popScale, pulse } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { LineIcon } from '../icons/LineIcon.jsx';
import { Multiline, SvgText } from '../text/Text.jsx';
import { illustrativeTag } from '../labels/IllustrativeStamp.jsx';

/** state → [hue, header LineIcon, default status label, action unlocked?]. */
export const APPROVAL_STATES = Object.freeze({
  waiting: [ROLE.amber, 'hourglass', 'CHỜ DUYỆT', false],
  approved: [ROLE.green, 'user-check', 'ĐÃ DUYỆT', true],
  rejected: [C.red, 'x', 'TỪ CHỐI', false],
  edited: [ROLE.purple, 'pencil', 'ĐÃ SỬA · DUYỆT', true],
});

/**
 * ApprovalStep — the human-in-the-loop step: a draft waits for a person before the action runs.
 * Anatomy (default 440×260): card (radius 22, 3 px stroke in the state hue, bgAlt fill) ·
 * header = state LineIcon (28 px) + 17/700 status label in the hue ("CHỜ DUYỆT") · draft title
 * 24/700 · ≤ 2 body lines 20/500 muted · footer: reviewer micro label (user-check icon + "Minh")
 * at left and the action button at right (50 px, radius 25: locked = dotInactive + lock + muted
 * text · unlocked = accent fill, white send icon + text).
 * States: waiting (amber, button locked) · approved (green, unlocks) · rejected (red, stays
 * locked) · edited (purple pencil, unlocks).
 * Timing: with `frame` + `at`, the card shows `waiting` before `at` and `state` from `at` on —
 * a 54-frame pulse() on the card stroke + halo, and the unlocked button pops in (popScale).
 * Default props render the settled `state`. `illustrative` default false; pass true for mock drafts.
 * @category control
 */
export function ApprovalStep({
  x,
  y,
  w = 440,
  h = 260,
  title,
  lines = [],
  reviewer,
  action = 'GỬI',
  state = 'waiting',
  statusLabel,
  frame,
  at,
  opacity = 1,
  illustrative = false,
}) {
  if (opacity <= 0.001) return null;
  const timed = frame != null && at != null;
  const shown = timed && frame < at ? 'waiting' : state;
  const [hue, icon, defLabel, unlocked] = APPROVAL_STATES[shown] || APPROVAL_STATES.waiting;
  const p = timed ? clamp01(pulse(frame, at)) : 0;
  const pop = timed && unlocked ? Math.max(0, popScale(frame, at)) : 1;
  const status = statusLabel ?? defLabel;

  const bw = Math.round(textWidth(action, 18, 700) + 78);
  const bh = 50;
  const bx = x + w - 24 - bw;
  const by = y + h - 24 - bh;
  const bcx = bx + bw / 2;
  const bcy = by + bh / 2;

  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {p > 0.001 ? (
        <rect x={x - 10} y={y - 10} width={w + 20} height={h + 20} rx={30} fill="none" stroke={hue} strokeWidth={3} opacity={p * 0.5} />
      ) : null}
      <rect x={x} y={y} width={w} height={h} rx={22} fill={C.bgAlt} stroke={hue} strokeWidth={3 + 2 * p} />
      <LineIcon name={icon} x={x + 38} y={y + 32} size={28} color={hue} strokeWidth={1.6} />
      <SvgText x={x + 62} y={y + 38} size={17} weight={700} anchor="start" color={hue} letterSpacing={0.6}>
        {status}
      </SvgText>
      {title ? (
        <SvgText x={x + 24} y={y + 90} size={24} weight={700} anchor="start">
          {title}
        </SvgText>
      ) : null}
      <Multiline x={x + 24} y={y + 126 + ((Math.min(lines.length, 2) - 1) * 28) / 2} lines={lines.slice(0, 2)} size={20} lineHeight={28} weight={500} color={C.textMuted} anchor="start" />
      {reviewer ? (
        <g>
          <LineIcon name="user-check" x={x + 36} y={bcy} size={24} color={C.textMuted} strokeWidth={1.6} />
          <SvgText x={x + 56} y={bcy + 6} size={17} weight={600} anchor="start" color={C.textMuted}>
            {reviewer}
          </SvgText>
        </g>
      ) : null}
      <g transform={pop !== 1 ? `translate(${bcx} ${bcy}) scale(${pop}) translate(${-bcx} ${-bcy})` : undefined}>
        <rect x={bx} y={by} width={bw} height={bh} rx={bh / 2} fill={unlocked ? C.accent : C.dotInactive} />
        <LineIcon name={unlocked ? 'send' : 'lock'} x={bx + 30} y={bcy} size={22} color={unlocked ? C.bg : C.textMuted} strokeWidth={1.8} />
        <SvgText x={bx + 50} y={bcy + 6.5} size={18} weight={700} anchor="start" color={unlocked ? C.bg : C.textMuted} letterSpacing={0.6}>
          {action}
        </SvgText>
      </g>
      {illustrativeTag(illustrative, { x, y, w, h })}
    </g>
  );
}
