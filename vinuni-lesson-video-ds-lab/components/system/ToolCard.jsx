import React from 'react';
import { C, MONO, alpha } from '../../lib/tokens.js';
import { clamp01, pulse } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { LineIcon } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';
import { illustrativeTag } from '../labels/IllustrativeStamp.jsx';

const BAR_H = 64;
const PAD = 24;
const LABEL_GAP = 30; // label baseline → first body baseline
const BODY = 22;
const BODY_LH = 30;
const CHIP_H = 40;
const CHIP_GAP = 12;
const MONO_EM = 0.6;

const monoWidth = (s, size) => String(s).length * size * MONO_EM;

/** Greedy word wrap by estimated Montserrat width. Accepts a string or pre-split lines. */
function wrap(text, size, maxW, weight = 500) {
  if (!text) return [];
  if (Array.isArray(text)) return text;
  const out = [];
  let cur = '';
  for (const word of String(text).split(/\s+/)) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && textWidth(next, size, weight) * 1.1 > maxW) { // textWidth runs ~8 % narrow on Vietnamese
      out.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

function chipWidth(p) {
  return Math.round(16 + (p.required ? 18 : 0) + monoWidth(p.name, 20) + (p.type ? 12 + textWidth(p.type, 17, 600) : 0) + 16);
}

/** Lay out param chips in rows inside `innerW`; returns [{p, x, y, w}] relative to the zone origin + total height. */
function layoutChips(inputs, innerW) {
  const items = [];
  let cx = 0;
  let row = 0;
  for (const p of inputs) {
    const w = chipWidth(p);
    if (cx > 0 && cx + w > innerW) {
      cx = 0;
      row += 1;
    }
    items.push({ p, x: cx, y: row * (CHIP_H + CHIP_GAP), w });
    cx += w + CHIP_GAP;
  }
  return { items, height: inputs.length ? (row + 1) * CHIP_H + row * CHIP_GAP : 0 };
}

/** Height ToolCard will use for these props when `h` is omitted. */
export function toolCardHeight({ w = 560, does, inputs = [], returns, errorText, state }) {
  const inner = w - PAD * 2;
  const doesLines = wrap(does, BODY, inner).length;
  const ret = state === 'error' && errorText ? errorText : returns;
  const retLines = wrap(ret, BODY, inner).length;
  const chips = layoutChips(inputs, inner).height;
  const zone = (body) => 20 + LABEL_GAP + body + 18;
  return BAR_H + zone(Math.max(1, doesLines) * BODY_LH - 8) + zone(chips + 4) + zone(Math.max(1, retLines) * BODY_LH - 8);
}

/**
 * ToolCard — a tool DECLARATION as the model sees it: name + "what it does" + "what it needs" +
 * "what it returns". The script's "tấm giới thiệu": Tên · Làm việc gì? · Cần thông tin gì? · Trả về gì?
 *
 * Anatomy (w default 560, h auto via toolCardHeight): radius-22 card, bgAlt body, 3 px accent stroke ·
 * NAME BAR 64 px, accent fill, white wrench icon + tool name in MONO 26/700 (`tra_han_nop`) ·
 * zone "LÀM VIỆC GÌ?" (17/700 accent label, 22/500 wrapped description) · zone "CẦN THÔNG TIN GÌ?" —
 * param chips (white, 2 px dotInactive stroke, MONO name + muted type, red dot = required) ·
 * zone "TRẢ VỀ GÌ?" — the output description. Zones are separated by 2 px dotInactive rules.
 *
 * States: 'default' · 'active' (being called: red bar, 5 px red stroke, red glow ring that pulses
 * once at `at` via pulse(frame, at) — 54 f) · 'disabled' (not allowed: grey bar, lock icon, 45 %) ·
 * 'error' (call failed: red-soft bar + alert icon, red outline, `errorText` replaces the return zone).
 *
 * `illustrative` (tag drawn inside the name bar, right) defaults to false (a declaration is structural); pass true / a label when the
 * tool or its fields are invented for the example.
 */
export function ToolCard({
  x,
  y,
  w = 560,
  h,
  name,
  does,
  inputs = [],
  returns,
  state = 'default',
  errorText,
  frame,
  at,
  opacity = 1,
  illustrative = false,
  labels = { does: 'LÀM VIỆC GÌ?', inputs: 'CẦN THÔNG TIN GÌ?', returns: 'TRẢ VỀ GÌ?' },
}) {
  const disabled = state === 'disabled';
  const o = opacity * (disabled ? 0.45 : 1);
  if (o <= 0.001) return null;
  const active = state === 'active';
  const error = state === 'error';
  const H = h ?? toolCardHeight({ w, does, inputs, returns, errorText, state });
  const inner = w - PAD * 2;
  const glow = active ? (frame != null && at != null ? pulse(frame, at) : 0) : 0;

  const stroke = active || error ? C.red : disabled ? C.textMuted : C.accent;
  const barFill = active ? C.red : error ? C.redSoft : disabled ? C.dotInactive : C.accent;
  const barInk = error ? C.red : disabled ? C.textMuted : C.bg;
  const labelColor = disabled ? C.textMuted : active || error ? C.red : C.accent;

  const doesLines = wrap(does, BODY, inner);
  const ret = error && errorText ? errorText : returns;
  const retLines = wrap(ret, BODY, inner);
  const chips = layoutChips(inputs, inner);

  // zone tops
  const z1 = y + BAR_H;
  const z1h = 20 + LABEL_GAP + Math.max(1, doesLines.length) * BODY_LH - 8 + 18;
  const z2 = z1 + z1h;
  const z2h = 20 + LABEL_GAP + chips.height + 4 + 18;
  const z3 = z2 + z2h;

  const zoneLabel = (zy, text, extra) => (
    <>
      <SvgText x={x + PAD} y={zy + 20 + 13} size={17} weight={700} anchor="start" color={labelColor} letterSpacing={1}>
        {text}
      </SvgText>
      {extra}
    </>
  );
  const bodyLines = (zy, lines, color = C.text) =>
    lines.map((ln, i) => (
      <SvgText key={`${zy}-${i}`} x={x + PAD} y={zy + 20 + 13 + LABEL_GAP + i * BODY_LH} size={BODY} weight={500} anchor="start" color={color}>
        {ln}
      </SvgText>
    ));
  const hasRequired = inputs.some((p) => p.required);

  return (
    <g opacity={o < 1 ? o : undefined}>
      {active ? (
        <rect
          x={x - 10}
          y={y - 10}
          width={w + 20}
          height={H + 20}
          rx={30}
          fill="none"
          stroke={C.red}
          strokeWidth={8}
          opacity={0.18 + 0.4 * clamp01(glow)}
        />
      ) : null}
      <rect x={x} y={y} width={w} height={H} rx={22} fill={C.bgAlt} />
      {/* name bar: rounded top, square bottom */}
      <path
        d={`M ${x} ${y + BAR_H} V ${y + 22} Q ${x} ${y} ${x + 22} ${y} H ${x + w - 22} Q ${x + w} ${y} ${x + w} ${y + 22} V ${y + BAR_H} Z`}
        fill={barFill}
      />
      <LineIcon name="wrench" x={x + PAD + 16} y={y + BAR_H / 2} size={30} color={barInk} strokeWidth={1.4} />
      <SvgText x={x + PAD + 44} y={y + BAR_H / 2 + 9} size={26} weight={700} anchor="start" color={barInk} family={MONO}>
        {name}
      </SvgText>
      {disabled ? <LineIcon name="lock" x={x + w - PAD - 14} y={y + BAR_H / 2} size={28} color={barInk} /> : null}
      {error ? <LineIcon name="triangle-alert" x={x + w - PAD - 14} y={y + BAR_H / 2} size={30} color={C.red} /> : null}

      {zoneLabel(z1, labels.does)}
      {bodyLines(z1, doesLines)}
      <line x1={x + PAD} y1={z2} x2={x + w - PAD} y2={z2} stroke={C.dotInactive} strokeWidth={2} />

      {zoneLabel(
        z2,
        labels.inputs,
        hasRequired ? (
          <g>
            <circle cx={x + w - PAD - textWidth('bắt buộc', 17, 500) - 16} cy={z2 + 27} r={5} fill={C.red} />
            <SvgText x={x + w - PAD} y={z2 + 33} size={17} weight={500} anchor="end" color={C.textMuted}>
              bắt buộc
            </SvgText>
          </g>
        ) : null,
      )}
      {chips.items.map(({ p, x: cx, y: cy, w: cw }, i) => {
        const bx = x + PAD + cx;
        const by = z2 + 20 + LABEL_GAP + cy - 4;
        const tx = bx + 16 + (p.required ? 18 : 0);
        return (
          <g key={`chip-${i}`}>
            <rect x={bx} y={by} width={cw} height={CHIP_H} rx={14} fill={C.bg} stroke={p.required ? alpha('red', 0.45) : C.dotInactive} strokeWidth={2} />
            {p.required ? <circle cx={bx + 21} cy={by + CHIP_H / 2} r={5} fill={C.red} /> : null}
            <SvgText x={tx} y={by + CHIP_H / 2 + 7} size={20} weight={700} anchor="start" color={C.text} family={MONO}>
              {p.name}
            </SvgText>
            {p.type ? (
              <SvgText x={tx + monoWidth(p.name, 20) + 12} y={by + CHIP_H / 2 + 6} size={17} weight={600} anchor="start" color={C.textMuted}>
                {p.type}
              </SvgText>
            ) : null}
          </g>
        );
      })}
      <line x1={x + PAD} y1={z3} x2={x + w - PAD} y2={z3} stroke={C.dotInactive} strokeWidth={2} />

      {zoneLabel(z3, error ? 'LỖI TRẢ VỀ' : labels.returns)}
      {bodyLines(z3, retLines, error ? C.red : C.text)}

      <rect x={x} y={y} width={w} height={H} rx={22} fill="none" stroke={stroke} strokeWidth={active ? 5 : 3} />
      {illustrativeTag(illustrative, { x, y: y + 3, w: w - (disabled || error ? 48 : 0), h: BAR_H })}
    </g>
  );
}
