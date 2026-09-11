import React from 'react';
import { C, ROLE_OF, alpha } from '../../lib/tokens.js';
import { appear, clamp01, pulse, smooth } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { LineIcon } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';
import { Chip } from '../labels/Pill.jsx';
import { illustrativeTag } from '../labels/IllustrativeStamp.jsx';

/** slot kind → [stroke, soft fill, uppercase kind tag]. */
export const ENVELOPE_KINDS = Object.freeze({
  system: [C.accentStrong, C.dotInactive, 'HỆ THỐNG'],
  user: [...ROLE_OF.input, 'NGƯỜI DÙNG'],
  message: [...ROLE_OF.input, 'TIN NHẮN'],
  tool: [...ROLE_OF.action, 'CÔNG CỤ'],
  doc: [...ROLE_OF.memory, 'TÀI LIỆU'],
  output: [...ROLE_OF.output, 'ĐẦU RA'],
});

const HEAD = 84; // header band (label + flap apex room)
const PAD = 24;
const GAP = 14;
const FLAP = 64; // open flap rises this far above y

const slotMetrics = ({ y, h, slots = [], slotH }) => {
  const n = Math.max(1, slots.length);
  const top = y + HEAD + 26;
  const sh = slotH ?? Math.min(66, (y + h - PAD - top - (n - 1) * GAP) / n);
  return { top, sh };
};

/** Box {x, y, w, h} of slot `i` inside an Envelope with these props — connect Flows to it with anchor(). */
export function envelopeSlot(props, i) {
  const { x, w } = props;
  const { top, sh } = slotMetrics(props);
  return { x: x + PAD, y: top + i * (sh + GAP), w: w - 2 * PAD, h: sh };
}

/**
 * Envelope — the request payload sent to the model ("GÓI GỬI ĐI"). Anatomy: a bgAlt body
 * (radius 22, 3 px accent stroke) · a triangular flap on the top edge · centered header
 * (LineIcon send + 17/700 label) · stacked slot cards (radius 14, 2 px role stroke, soft fill,
 * 21/600 label left + 15/700 kind tag right) · items NOT sent sit outside to the right as dashed,
 * muted cards with a red "KHÔNG GỬI" chip.
 * States: open (flap stands up, rising 64 px above y) · sealed (flap folded down to a red seal disc
 * holding the send icon). With `frame` + `at`, the flap closes over at…at+18 (smooth) and a 54-frame
 * send pulse (5 px stroke + halo) peaks after it; without `frame`, `sealed` renders settled.
 * Slots may stagger in with `start` / `per` (appear per slot). Default: settled, all visible.
 * Geometry helper: envelopeSlot(props, i) → slot box.
 * @category context
 */
export function Envelope({
  x,
  y,
  w,
  h,
  label = 'GÓI GỬI ĐI',
  slots = [],
  outside,
  left,
  outsideW = 300,
  outsideLabel = 'KHÔNG GỬI',
  slotH,
  sealed = false,
  frame,
  at,
  start,
  per = 8,
  illustrative = false,
  opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const out = outside ?? left ?? [];
  const cx = x + w / 2;
  const hasClock = frame != null && at != null;
  const t = sealed ? (hasClock ? smooth(frame, at, at + 18) : 1) : 0;
  const p = sealed && hasClock ? clamp01(pulse(frame, at + 18)) : 0;
  const apexY = y - FLAP + t * (FLAP + HEAD - 6);
  const stroke = C.accent;
  const { top, sh } = slotMetrics({ y, h, slots, slotH });
  const reveal = (i) => (start != null && frame != null ? appear(frame, start + i * per, 18) : 1);
  const labelW = textWidth(label, 17, 700) + 1.2 * label.length;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {p > 0.001 ? (
        <rect x={x - 12} y={y - 12} width={w + 24} height={h + 24} rx={30} fill="none" stroke={C.red} strokeWidth={3} opacity={p * 0.5} />
      ) : null}
      {/* open flap stands behind the body */}
      {t < 0.5 ? (
        <path d={`M ${x + 10} ${y} L ${cx} ${apexY} L ${x + w - 10} ${y}`} fill={C.bg} stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
      ) : null}
      <rect x={x} y={y} width={w} height={h} rx={22} fill={C.bgAlt} stroke={sealed && p > 0.001 ? C.red : stroke} strokeWidth={3 + 2 * p} />
      {t >= 0.5 ? (
        <path
          d={`M ${x + 6} ${y + 4} L ${cx} ${apexY} L ${x + w - 6} ${y + 4}`}
          fill={alpha('dotInactive', 0.55)}
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ) : (
        <path d={`M ${x + 22} ${y + HEAD} H ${x + w - 22}`} stroke={C.dotInactive} strokeWidth={2} />
      )}
      <LineIcon name="send" x={cx + 12 - labelW / 2 - 24} y={y + 38} size={26} color={C.accentStrong} strokeWidth={1.5} />
      <SvgText x={cx + 12} y={y + 44} size={17} weight={700} color={C.accentStrong} letterSpacing={1.2}>
        {label}
      </SvgText>
      {t >= 0.5 ? (
        <g>
          <circle cx={cx} cy={apexY} r={20} fill={C.red} />
          <LineIcon name="send" x={cx - 1} y={apexY + 1} size={22} color={C.bg} strokeWidth={1.75} />
        </g>
      ) : null}
      {slots.map((s, i) => {
        const o = reveal(i);
        if (o <= 0.001) return null;
        const b = { x: x + PAD, y: top + i * (sh + GAP), w: w - 2 * PAD, h: sh };
        const kind = ENVELOPE_KINDS[s.kind] || ENVELOPE_KINDS.message;
        const [hue, soft] = s.tone === 'red' ? [C.red, C.redSoft] : kind;
        const tag = s.tag ?? (s.kind ? kind[2] : null);
        return (
          <g key={`${i}-${s.label}`} opacity={o < 1 ? o : undefined} transform={o < 1 ? `translate(0 ${(1 - o) * 14})` : undefined}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={14} fill={soft} stroke={hue} strokeWidth={2} />
            <rect x={b.x} y={b.y + 10} width={6} height={b.h - 20} rx={3} fill={hue} />
            <SvgText x={b.x + 22} y={b.y + b.h / 2 + 7.5} size={21} weight={600} anchor="start">
              {s.label}
            </SvgText>
            {tag ? (
              <SvgText x={b.x + b.w - 18} y={b.y + b.h / 2 + 5.5} size={15} weight={700} anchor="end" color={hue} letterSpacing={0.8}>
                {tag}
              </SvgText>
            ) : null}
          </g>
        );
      })}
      {out.map((s, i) => {
        const b = { x: x + w + 40, y: top + i * (sh + GAP + 20), w: outsideW, h: sh };
        const chipW = Math.round(textWidth(outsideLabel, 15, 700) + 22);
        return (
          <g key={`o-${i}-${s.label}`}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={14} fill={C.bg} stroke={C.textMuted} strokeWidth={2} strokeDasharray="12 10" opacity={0.7} />
            <SvgText x={b.x + 20} y={b.y + b.h / 2 + 7} size={20} weight={600} anchor="start" color={C.textMuted}>
              {s.label}
            </SvgText>
            <Chip x={b.x + b.w - chipW - 14} y={b.y - 15} h={30} size={15} label={outsideLabel} tone="red" w={chipW} />
          </g>
        );
      })}
      {illustrativeTag(illustrative, { x, y, w, h })}
    </g>
  );
}
