import React from 'react';
import { C, ROLE } from '../../lib/tokens.js';
import { appear } from '../../lib/motion.js';
import { LineIcon } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';

/** card tone → [stroke / icon hue, fill]. */
const TONES = {
  accent: [C.accent, C.bg],
  red: [C.red, C.redSoft],
  memory: [ROLE.amber, ROLE.amberSoft],
  amber: [ROLE.amber, ROLE.amberSoft],
  green: [ROLE.green, ROLE.greenSoft],
  purple: [ROLE.purple, ROLE.purpleSoft],
  orange: [ROLE.orange, ROLE.orangeSoft],
};

const HEAD = 62;
const PAD = 20;
const GAP = 12;

/**
 * ContextTray — "khay ngữ cảnh": the model's input tray with a fixed number of places.
 * Anatomy: bgAlt tray (radius 22, 3 px accent stroke) · header (LineIcon inbox + 17/700 label, a
 * "used/capacity" counter on the right that turns red when full) · `capacity` empty dashed slots ·
 * item chip-cards (radius 14, 2 px tone stroke, LineIcon file-text + 21/600 label) filling the slots
 * top-down. Items beyond capacity queue OUTSIDE to the right: grey dashed cards at 55 % under a
 * muted "KHÔNG VỪA" caption — they are not in the context.
 * Timing: with `frame`, item i (tray and queue alike) slides in from the right over 18 frames at
 * start + i·per. Default: settled (every item shown).
 * @category context
 */
export function ContextTray({
  x,
  y,
  w,
  h,
  label = 'KHAY NGỮ CẢNH',
  items = [],
  capacity = 3,
  frame,
  start = 0,
  per = 12,
  queueW,
  queueLabel = 'KHÔNG VỪA · chờ ngoài khay',
  showCount = true,
  opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const slotH = Math.min(68, (h - HEAD - PAD - (capacity - 1) * GAP) / capacity);
  const slotBox = (i) => ({ x: x + PAD, y: y + HEAD + i * (slotH + GAP), w: w - 2 * PAD, h: slotH });
  const qW = queueW ?? w - 2 * PAD;
  const qx = x + w + 48;
  const vis = (i) => (frame == null ? 1 : appear(frame, start + i * per, 18));
  const used = items.slice(0, capacity).reduce((n, _, i) => n + (vis(i) > 0.5 ? 1 : 0), 0);
  const full = used >= capacity;
  const queued = items.slice(capacity);
  const card = (it, b, i, muted) => {
    const o = vis(i);
    if (o <= 0.001) return null;
    const [hue, fill] = muted ? [C.textMuted, C.bg] : TONES[it.tone] || TONES.accent;
    const dx = (1 - o) * 70;
    return (
      <g key={`${i}-${it.label}`} opacity={(muted ? 0.55 : 1) * o < 1 ? (muted ? 0.55 : 1) * o : undefined} transform={dx > 0.1 ? `translate(${dx} 0)` : undefined}>
        <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={14} fill={fill} stroke={hue} strokeWidth={2} strokeDasharray={muted ? '12 10' : undefined} />
        <LineIcon name={it.icon ?? 'file-text'} x={b.x + 30} y={b.y + b.h / 2} size={26} color={hue} strokeWidth={1.5} />
        <SvgText x={b.x + 54} y={b.y + b.h / 2 + 7.5} size={21} weight={600} anchor="start" color={muted ? C.textMuted : C.text}>
          {it.label}
        </SvgText>
      </g>
    );
  };
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={22} fill={C.bgAlt} stroke={C.accent} strokeWidth={3} />
      <LineIcon name="inbox" x={x + 38} y={y + 32} size={28} color={C.accentStrong} strokeWidth={1.5} />
      <SvgText x={x + 62} y={y + 38} size={17} weight={700} anchor="start" color={C.accentStrong} letterSpacing={1.2}>
        {label}
      </SvgText>
      {showCount ? (
        <SvgText x={x + w - 24} y={y + 38} size={17} weight={700} anchor="end" color={full ? C.red : C.textMuted} letterSpacing={0.8}>
          {`${used}/${capacity} CHỖ`}
        </SvgText>
      ) : null}
      {Array.from({ length: capacity }, (_, i) => {
        const b = slotBox(i);
        return <rect key={`slot${i}`} x={b.x} y={b.y} width={b.w} height={b.h} rx={14} fill="none" stroke={C.accent} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="12 10" />;
      })}
      {items.slice(0, capacity).map((it, i) => card(it, slotBox(i), i, false))}
      {queued.length && queued.some((_, j) => vis(capacity + j) > 0.001) ? (
        <SvgText x={qx} y={y + 38} size={17} weight={700} anchor="start" color={C.textMuted} letterSpacing={0.8}>
          {queueLabel}
        </SvgText>
      ) : null}
      {queued.map((it, j) => card(it, { x: qx, y: y + HEAD + j * (slotH + GAP), w: qW, h: slotH }, capacity + j, true))}
    </g>
  );
}
