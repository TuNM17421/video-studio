import React from 'react';
import { C, ROLE } from '../../lib/tokens.js';
import { EASE, clamp01, interpolate, CLAMP } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { formatNumber } from '../../lib/text.js';
import { SvgText } from '../text/Text.jsx';
import { illustrativeTag } from '../labels/IllustrativeStamp.jsx';

/** segment tone → [stroke / label hue, soft fill]. */
export const BUDGET_TONES = Object.freeze({
  accent: [C.accent, C.dotInactive],
  system: [C.accentStrong, C.dotInactive],
  purple: [ROLE.purple, ROLE.purpleSoft],
  green: [ROLE.green, ROLE.greenSoft],
  orange: [ROLE.orange, ROLE.orangeSoft],
  amber: [ROLE.amber, ROLE.amberSoft],
  red: [C.red, C.redSoft],
  muted: [C.textMuted, C.bgAlt],
});

/** 45° hatch lines clipped (analytically — no <pattern> ids) to a rectangle. */
function hatch(x, y, w, h, step = 14) {
  const segs = [];
  for (let c = step / 2; c < w + h; c += step) {
    // line x' + y' = c inside [0,w]×[0,h]
    const x1 = Math.min(c, w);
    const y1 = c - x1;
    const y2 = Math.min(c, h);
    const x2 = c - y2;
    segs.push(`M ${x + x1} ${y + y1} L ${x + x2} ${y + y2}`);
  }
  return segs.join(' ');
}

/**
 * ContextBudget — stacked horizontal budget bar for the context window. `w` is the width of the
 * LIMIT: the track (dotInactive, radius 12) spans x…x+w and the limit marker (3 px ink line, label
 * "GIỚI HẠN · 8.000") stands at x+w. Segments (soft fill + 2 px hue stroke, 17/700 hue label and
 * 20/600 ink number inside, or below when narrow) fill in order; whatever goes past the limit sticks
 * out beyond the marker as the OVERFLOW: red-soft, red 45° hatch, dashed red outline, red strike
 * line and a red callout to its right ("PHẦN DƯ 500 — bị cắt"). Reserve ≈ overflow + 280 px right of x+w.
 * `showNumbers=false` hides every number (proportions only — "không gắn số đo giả").
 * `showSum` writes the subtraction under the bar (tổng − giới hạn = dư).
 * Timing: with `frame`, segment i fills over [start + i·per, start + (i+1)·per] (out ease), so the
 * overflow grows last. Without `frame`: settled. Title + MINH HỌA tag sit in a row 56–90 px above y.
 * `illustrative` defaults to TRUE (token counts are illustrative).
 * @category context
 */
export function ContextBudget({
  x,
  y,
  w,
  h = 76,
  segments = [],
  limit,
  frame,
  start = 0,
  per = 18,
  showNumbers = true,
  showSum = false,
  title,
  limitLabel = 'GIỚI HẠN',
  overflowLabel = 'PHẦN DƯ',
  overflowNote = 'bị cắt',
  illustrative = true,
  opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const total = segments.reduce((a, s) => a + s.tokens, 0);
  const lim = limit ?? total;
  const px = w / lim;
  const fillOf = (i) =>
    frame == null ? 1 : interpolate(frame, [start + i * per, start + (i + 1) * per], [0, 1], { ...CLAMP, easing: EASE.out });
  const fmt = (v) => formatNumber(v);

  let acc = 0;
  let over = 0;
  const bars = [];
  const labels = [];
  segments.forEach((s, i) => {
    const f = clamp01(fillOf(i));
    const a = acc;
    const b = acc + s.tokens * f;
    acc += s.tokens;
    const [hue, soft] = BUDGET_TONES[s.tone] || BUDGET_TONES.accent;
    const inA = Math.min(a, lim);
    const inB = Math.min(b, lim);
    if (b > lim) over = Math.max(over, b - lim);
    if (inB - inA > 0.5 / px) {
      const sx = x + inA * px;
      const sw = (inB - inA) * px;
      bars.push(<rect key={`s${i}`} x={sx + 1} y={y + 1} width={Math.max(0, sw - 2)} height={h - 2} rx={10} fill={soft} stroke={hue} strokeWidth={2} />);
      if (f > 0.6) {
        const o = clamp01((f - 0.6) / 0.4);
        const full = (Math.min(acc, lim) - inA) * px;
        const cxs = sx + full / 2;
        const num = showNumbers ? fmt(s.tokens) : null;
        const room = full - 20;
        const fits = textWidth(s.label, 17, 700) + s.label.length * 0.6 <= room && (!num || textWidth(num, 20, 600) <= room);
        if (fits) {
          labels.push(
            <g key={`l${i}`} opacity={o < 1 ? o : undefined}>
              <SvgText x={cxs} y={num ? y + h / 2 - 5 : y + h / 2 + 6} size={17} weight={700} color={hue} letterSpacing={0.6}>
                {s.label}
              </SvgText>
              {num ? (
                <SvgText x={cxs} y={y + h / 2 + 22} size={20} weight={600}>
                  {num}
                </SvgText>
              ) : null}
            </g>,
          );
        } else {
          labels.push(
            <g key={`l${i}`} opacity={o < 1 ? o : undefined}>
              <path d={`M ${cxs} ${y + h + 4} V ${y + h + 14}`} stroke={hue} strokeWidth={2} />
              <SvgText x={cxs} y={y + h + 34} size={15} weight={700} color={hue} letterSpacing={0.6}>
                {s.label}
              </SvgText>
              {num ? (
                <SvgText x={cxs} y={y + h + 56} size={17} weight={600}>
                  {num}
                </SvgText>
              ) : null}
            </g>,
          );
        }
      }
    }
  });
  const overW = over * px;
  const overAll = Math.max(0, total - lim);
  const overTxt = `${overflowLabel}${showNumbers ? ` ${fmt(overAll)}` : ''} — ${overflowNote}`;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {title ? (
        <SvgText x={x} y={y - 60} size={17} weight={700} anchor="start" color={C.accentStrong} letterSpacing={1.2}>
          {title}
        </SvgText>
      ) : null}
      {illustrativeTag(illustrative, { x, y: y - 96, w, h })}
      <rect x={x} y={y} width={w} height={h} rx={12} fill={C.dotInactive} fillOpacity={0.5} />
      {bars}
      {overW > 0.5 ? (
        <g>
          <rect x={x + w} y={y + 1} width={overW} height={h - 2} fill={C.redSoft} />
          <path d={hatch(x + w, y + 1, overW, h - 2)} stroke={C.red} strokeWidth={2} opacity={0.55} />
          <path d={`M ${x + w} ${y + 1} H ${x + w + overW - 10} Q ${x + w + overW} ${y + 1} ${x + w + overW} ${y + 11} V ${y + h - 11} Q ${x + w + overW} ${y + h - 1} ${x + w + overW - 10} ${y + h - 1} H ${x + w}`} fill="none" stroke={C.red} strokeWidth={2.5} strokeDasharray="12 10" />
          <path d={`M ${x + w + 4} ${y + h - 8} L ${x + w + overW - 4} ${y + 8}`} stroke={C.red} strokeWidth={4} strokeLinecap="round" />
          <SvgText x={x + w + overW + 14} y={y + h / 2 + 7} size={20} weight={700} anchor="start" color={C.red} opacity={clamp01(over / Math.max(1, overAll))}>
            {overTxt}
          </SvgText>
        </g>
      ) : null}
      {labels}
      <path d={`M ${x + w} ${y - 10} V ${y + h + 12}`} stroke={C.text} strokeWidth={3} strokeLinecap="round" />
      <SvgText x={x + w} y={y - 20} size={17} weight={700} color={C.text} letterSpacing={0.8}>
        {showNumbers && limit != null ? `${limitLabel} · ${fmt(lim)}` : limitLabel}
      </SvgText>
      {showSum && showNumbers ? (
        <SvgText x={x} y={y + h + 92} size={22} weight={600} anchor="start" color={C.text}>
          {`${fmt(total)} − ${fmt(lim)} = `}
          <tspan fill={C.red} fontWeight={700}>{fmt(overAll)}</tspan>
        </SvgText>
      ) : null}
    </g>
  );
}
