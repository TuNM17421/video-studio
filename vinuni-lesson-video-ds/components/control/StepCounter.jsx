import React from 'react';
import { C, ROLE } from '../../lib/tokens.js';
import { popScale } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { LineIcon } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';
import { illustrativeTag } from '../labels/IllustrativeStamp.jsx';

const TAG_W = (label) => textWidth(label, 17, 700) + 44 + label.length * 1.1;

/**
 * StepCounter — an agent-loop counter "0/3 → 3/3" with pips: tool calls, retries, steps.
 * Anatomy: card (radius 22, 3 px stroke, bgAlt) · 17/700 uppercase label top-left
 * ("LƯỢT GỌI CÔNG CỤ") · optional MINH HỌA tag top-right (`illustrative`, e.g. "GIỚI HẠN MINH HỌA")
 * · a row of `max` pips (r 13, 40 px pitch; filled = accent, empty = white with dotInactive ring)
 * · the count "2/3" 36/700 right-aligned · when `paused`, a footer row with an amber pause icon and
 * a muted note ("chờ người dùng — bộ đếm không tăng").
 * States: ok (value < max, accent) · limit (value ≥ max → red stroke, red pips and number).
 * Timing: drive `value` from the scene (e.g. value = f >= 90 ? 2 : f >= 60 ? 1 : 0) and pass
 * `frame` + `at` = the frame the latest pip was added → that pip pops in (popScale). Width is
 * computed from the label / tag / pips / note unless `w` is given.
 * @category control
 */
export function StepCounter({
  x,
  y,
  value = 0,
  max = 3,
  label = 'LƯỢT GỌI CÔNG CỤ',
  illustrative = false,
  frame,
  at,
  paused = false,
  pausedNote = 'chờ người dùng — bộ đếm không tăng',
  w,
  opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const n = Math.max(0, Math.min(max, Math.floor(value)));
  const limit = n >= max;
  const hue = limit ? C.red : C.accent;
  const tagLabel = illustrative ? (typeof illustrative === 'string' ? illustrative : 'MINH HỌA') : '';
  const count = `${n}/${max}`;
  const pitch = 40;
  const pipsW = (max - 1) * pitch + 26;
  const numW = textWidth(count, 36, 700);
  const width =
    w ??
    Math.round(
      Math.max(
        280,
        textWidth(label, 17, 700) + 48 + (tagLabel ? TAG_W(tagLabel) + 24 : 0),
        pipsW + numW + 48 + 40,
        paused ? textWidth(pausedNote, 17, 500) * 1.2 + 58 + 32 : 0,
      ),
    );
  const h = paused ? 172 : 128;
  const rowY = y + 88;
  const pop = frame != null && at != null ? Math.max(0, popScale(frame, at)) : 1;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={width} height={h} rx={22} fill={C.bgAlt} stroke={hue} strokeWidth={3} />
      <SvgText x={x + 24} y={y + 36} size={17} weight={700} anchor="start" color={hue} letterSpacing={0.6}>
        {label}
      </SvgText>
      {Array.from({ length: max }, (_, i) => {
        const cx = x + 24 + 13 + i * pitch;
        const filled = i < n;
        const s = filled && i === n - 1 ? pop : 1;
        return filled ? (
          <circle key={i} cx={cx} cy={rowY} r={13 * s} fill={hue} />
        ) : (
          <circle key={i} cx={cx} cy={rowY} r={11.5} fill={C.bg} stroke={C.dotInactive} strokeWidth={3} />
        );
      })}
      <SvgText x={x + width - 24} y={rowY + 13} size={36} weight={700} anchor="end" color={limit ? C.red : C.text}>
        {count}
      </SvgText>
      {paused ? (
        <g>
          <line x1={x + 24} y1={y + 124} x2={x + width - 24} y2={y + 124} stroke={C.dotInactive} strokeWidth={2} />
          <LineIcon name="pause" x={x + 36} y={y + 148} size={24} color={ROLE.amber} strokeWidth={1.8} />
          <SvgText x={x + 58} y={y + 154} size={17} weight={500} anchor="start" color={C.textMuted}>
            {pausedNote}
          </SvgText>
        </g>
      ) : null}
      {illustrativeTag(illustrative, { x, y: y - 2, w: width, h })}
    </g>
  );
}
