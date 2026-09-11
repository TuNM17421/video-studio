import React from 'react';
import { C, ROLE_OF, alpha } from '../../lib/tokens.js';
import { clamp01, pulse } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { LineIcon } from '../icons/LineIcon.jsx';
import { Multiline, SvgText } from '../text/Text.jsx';

function toneOf(tone) {
  if (!tone) return [C.accent, C.dotInactive];
  if (ROLE_OF[tone]) return ROLE_OF[tone];
  if (tone === 'red' || tone === C.red) return [C.red, C.redSoft];
  const hex = C[tone] || tone;
  return [hex, alpha(hex, 0.12)];
}

/** The four tips of the diamond: {top, left, right, bottom} — start branch Flows here. */
export function decisionPorts({ x, y, size = 220 }) {
  const r = size / 2;
  return {
    top: { x, y: y - r },
    right: { x: x + r, y },
    bottom: { x, y: y + r },
    left: { x: x - r, y },
  };
}

/**
 * DecisionNode — the diamond of a flowchart: one question, two or more exits ("ĐỦ THÔNG TIN?",
 * "CẦN GỌI TOOL?"). Centered on (x, y); `size` is the tip-to-tip diagonal (default 220).
 *
 * Anatomy: a square rotated 45° with radius 14 corners, bgAlt fill, 3 px tone stroke · question text
 * 21/700 uppercase inside (1–2 lines; pass an array to break) — or `labelPos="below"`, then a
 * circle-help icon sits inside and the question goes under the bottom tip · decisionPorts() gives
 * the tips for branch Flows.
 *
 * States: 'idle' · 'active' — deciding now: red stroke 5 + red-soft fill; with `frame`/`at` it pulses
 * once (54 f) and settles to a red outline · 'resolved' — decided: stroke back to tone, a red
 * `answer` chip (e.g. "CÓ", "CHƯA ĐỦ") appears beside the `answerSide` tip (above-right of a left/right
 * tip, left of a top/bottom tip — clear of the branch Flow).
 */
export function DecisionNode({
  x,
  y,
  size = 220,
  label,
  labelPos = 'inside',
  state = 'idle',
  answer,
  answerSide = 'right',
  frame,
  at,
  tone,
  opacity = 1,
  muted = 0,
}) {
  const o = opacity * (1 - clamp01(muted) * 0.64);
  if (o <= 0.001) return null;
  const [stroke] = toneOf(tone);
  const side = size / Math.SQRT2;
  const lines = Array.isArray(label) ? label : label ? [label] : [];
  const active = state === 'active';
  const resolved = state === 'resolved';
  const p = active ? (frame != null && at != null ? pulse(frame, at) : 0) : 0;
  const hot = active ? 0.55 + 0.45 * clamp01(p) : 0;
  const ports = decisionPorts({ x, y, size });
  const diamond = (props) => (
    <rect x={x - side / 2} y={y - side / 2} width={side} height={side} rx={14} transform={`rotate(45 ${x} ${y})`} {...props} />
  );
  const textColor = active ? C.red : C.text;

  let chip = null;
  if (resolved && answer) {
    const cw = Math.round(textWidth(answer, 18, 700) + 30);
    const ch = 38;
    const pt = ports[answerSide] ?? ports.right;
    const off = 16;
    let cx = pt.x + off;
    let cy = pt.y - ch - 10;
    if (answerSide === 'left') cx = pt.x - off - cw;
    // top / bottom exits usually turn right, so their chip sits LEFT of the tip, clear of the Flow.
    if (answerSide === 'bottom') {
      cx = pt.x - 14 - cw;
      cy = pt.y + 6;
    }
    if (answerSide === 'top') {
      cx = pt.x - 14 - cw;
      cy = pt.y - ch - 6;
    }
    chip = (
      <g>
        <rect x={cx} y={cy} width={cw} height={ch} rx={14} fill={C.redSoft} stroke={C.red} strokeWidth={2} />
        <SvgText x={cx + cw / 2} y={cy + ch / 2 + 6.5} size={18} weight={700} color={C.red}>
          {answer}
        </SvgText>
      </g>
    );
  }

  return (
    <g opacity={o < 1 ? o : undefined}>
      {active && p > 0.001 ? diamond({ fill: 'none', stroke: C.red, strokeWidth: 8, opacity: 0.25 * p, transform: `rotate(45 ${x} ${y}) translate(${x} ${y}) scale(${1 + 0.08 * p}) translate(${-x} ${-y})` }) : null}
      {diamond({ fill: C.bgAlt, stroke, strokeWidth: 3 })}
      {active ? diamond({ fill: C.redSoft, stroke: C.red, strokeWidth: 5, opacity: hot }) : null}
      {labelPos === 'inside' ? (
        <Multiline x={x} y={y + 7} lines={lines} size={21} lineHeight={27} weight={700} color={textColor} />
      ) : (
        <>
          <LineIcon name="circle-help" x={x} y={y} size={size * 0.3} color={active ? C.red : stroke} />
          <Multiline x={x} y={y + size / 2 + 34 + ((lines.length - 1) * 27) / 2} lines={lines} size={21} lineHeight={27} weight={700} color={textColor} />
        </>
      )}
      {chip}
    </g>
  );
}
