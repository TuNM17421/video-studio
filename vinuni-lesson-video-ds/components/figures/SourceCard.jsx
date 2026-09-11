import React from 'react';
import { C, ROLE } from '../../lib/tokens.js';
import { textWidth } from '../../lib/geometry.js';
import { LineIcon } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';
import { illustrativeTag } from '../labels/IllustrativeStamp.jsx';

/** state → [stroke, fill, chip label, chip fill, chip ink, chip icon]. */
export const SOURCE_STATES = Object.freeze({
  verified: [ROLE.green, C.bgAlt, 'ĐÃ ĐỐI CHIẾU', ROLE.greenSoft, ROLE.green, 'check'],
  unverified: [C.red, C.bg, 'KHÔNG CÓ NGUỒN', C.redSoft, C.red, 'x'],
  neutral: [C.accent, C.bgAlt, null, null, null, null],
});

const BODY = 20;
const LH = 30;
const W600 = (s) => textWidth(s, BODY, 700) * 1.05; // Montserrat 600 runs ≈ textWidth(700)

/** Greedy word wrap of `text` into lines ≤ `room` px (estimate). */
function wrap(text, room) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && W600(next) > room) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * SourceCard — a citation card (thẻ nguồn). Anatomy: card (radius 22, 3 px stroke by state) ·
 * LineIcon quote + source title 20/700 (e.g. "Quy chế học vụ 2026 · Điều 12") · page reference
 * 17/700 muted ("[Trang 15]") · the excerpt in quotes, 20/600, word-wrapped to the card, with the
 * `highlight` substring on a marker band (amber default, or accent) · a state chip bottom-left.
 * States: verified (green outline, "ĐÃ ĐỐI CHIẾU" + check) · unverified (red dashed outline, white
 * fill, "KHÔNG CÓ NGUỒN" + x; with no excerpt it shows two empty dashed lines) · neutral (accent,
 * no chip). Height auto-fits the excerpt unless `h` is given. Static — fade it with `opacity`.
 * `illustrative` (default false; set it for made-up sources) puts the MINH HỌA tag top-right.
 * @category figures
 */
export function SourceCard({
  x,
  y,
  w,
  h: hProp,
  title,
  page,
  excerpt,
  highlight,
  highlightTone = 'amber',
  state = 'neutral',
  chipLabel,
  illustrative = false,
  opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const [stroke, fill, chipDefault, chipFill, chipInk, chipIcon] = SOURCE_STATES[state] || SOURCE_STATES.neutral;
  const chip = chipLabel ?? chipDefault;
  const padX = 28;
  const room = w - 2 * padX;
  const text = excerpt ? `“${excerpt}”` : null;
  const lines = text ? wrap(text, room) : [];
  const bodyTop = y + (page ? 104 : 80);
  const nBody = text ? lines.length : 2;
  const chipH = 36;
  const h = hProp ?? bodyTop - y + nBody * LH + (chip ? chipH + 36 : 4);

  // marker band: locate the highlight substring line by line (estimated widths)
  const bands = [];
  if (text && highlight) {
    const hs = text.indexOf(highlight);
    if (hs >= 0) {
      const he = hs + highlight.length;
      let pos = 0;
      lines.forEach((ln, i) => {
        const at = text.indexOf(ln, pos);
        const ls = at;
        const le = at + ln.length;
        pos = le;
        const s = Math.max(hs, ls);
        const e = Math.min(he, le);
        if (e > s) {
          const x0 = x + padX + W600(ln.slice(0, s - ls));
          const bw = W600(ln.slice(s - ls, e - ls));
          bands.push(<rect key={`b${i}`} x={x0 - 4} y={bodyTop + i * LH - 22} width={bw + 8} height={LH} rx={6} fill={highlightTone === 'accent' ? C.dotInactive : ROLE.amberSoft} />);
        }
      });
    }
  }
  const chipW = chip ? Math.round(textWidth(chip, 15, 700) + 0.8 * chip.length + 64) : 0;
  const chipY = y + h - chipH - 18;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={22} fill={fill} stroke={stroke} strokeWidth={3} strokeDasharray={state === 'unverified' ? '12 10' : undefined} />
      <LineIcon name="quote" x={x + 44} y={y + 40} size={30} color={state === 'neutral' ? C.accentStrong : stroke} strokeWidth={1.5} />
      {title ? (
        <SvgText x={x + 70} y={y + 47} size={20} weight={700} anchor="start" color={C.text}>
          {title}
        </SvgText>
      ) : null}
      {page ? (
        <SvgText x={x + 70} y={y + 76} size={17} weight={700} anchor="start" color={C.textMuted} letterSpacing={0.6}>
          {page}
        </SvgText>
      ) : null}
      {bands}
      {text ? (
        lines.map((ln, i) => (
          <SvgText key={i} x={x + padX} y={bodyTop + i * LH} size={BODY} weight={600} anchor="start" color={state === 'unverified' ? C.textMuted : C.text}>
            {ln}
          </SvgText>
        ))
      ) : (
        [0, 1].map((i) => (
          <path key={i} d={`M ${x + padX} ${bodyTop - 6 + i * LH} H ${x + padX + room * (i ? 0.55 : 0.9)}`} stroke={C.red} strokeOpacity={0.45} strokeWidth={3} strokeDasharray="12 10" strokeLinecap="round" />
        ))
      )}
      {chip ? (
        <g>
          <rect x={x + padX - 6} y={chipY} width={chipW} height={chipH} rx={14} fill={chipFill} />
          <LineIcon name={chipIcon} x={x + padX + 14} y={chipY + chipH / 2} size={20} color={chipInk} strokeWidth={2.25} />
          <SvgText x={x + padX + 32} y={chipY + chipH / 2 + 5.5} size={15} weight={700} anchor="start" color={chipInk} letterSpacing={0.8}>
            {chip}
          </SvgText>
        </g>
      ) : null}
      {illustrativeTag(illustrative, { x, y, w, h })}
    </g>
  );
}
