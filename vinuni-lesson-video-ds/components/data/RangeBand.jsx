import React from 'react';
import { C, alpha } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { SvgText } from '../text/Text.jsx';

/**
 * RangeBand — an estimate with its spread: a point on a scale and the band it could plausibly fall in
 * ("khoảng 72%, dao động ± 9").
 * Anatomy: 8 px dotInactive scale from x to x + w · band 36 px tall, round ends, accent at 22 % between
 * `lo` and `hi`, with 5 px accent end ticks (60 px tall) · the estimate is an accent dot r 16 · readout
 * 24/700 under the dot · optional label 17/700 accentStrong above the left end, muted end labels
 * (`left` / `right`) 17/700 under the scale ends.
 * `lo`, `hi`, `value` are 0–1 on the scale. `spread` (0–1) grows the band out from the dot, so show the
 * point estimate first and widen it when the narration introduces the uncertainty. Narrowing the band
 * (more data, lower temperature) = animate `lo`/`hi` toward `value` continuously.
 */
export function RangeBand({ x, y, w = 620, value = 0.5, lo = 0.3, hi = 0.7, spread = 1, label, readout, left, right, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const px = (t) => x + w * clamp01(t);
  const s = clamp01(spread);
  const bl = px(value + (lo - value) * s);
  const bh = px(value + (hi - value) * s);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {label ? (
        <SvgText x={x} y={y - 60} size={17} weight={700} anchor="start" color={C.accentStrong}>
          {label}
        </SvgText>
      ) : null}
      <path d={`M ${x} ${y} H ${x + w}`} stroke={C.dotInactive} strokeWidth={8} strokeLinecap="round" />
      {s > 0.001 ? (
        <g>
          <rect x={bl} y={y - 18} width={Math.max(0, bh - bl)} height={36} rx={18} fill={alpha('accent', 0.22)} />
          <path d={`M ${bl} ${y - 30} V ${y + 30}`} stroke={C.accent} strokeWidth={5} strokeLinecap="round" opacity={s} />
          <path d={`M ${bh} ${y - 30} V ${y + 30}`} stroke={C.accent} strokeWidth={5} strokeLinecap="round" opacity={s} />
        </g>
      ) : null}
      <circle cx={px(value)} cy={y} r={16} fill={C.accent} />
      {readout ? (
        <SvgText x={px(value)} y={y + 76} size={24} weight={700}>
          {readout}
        </SvgText>
      ) : null}
      {left ? (
        <SvgText x={x} y={y + 76} size={17} weight={700} anchor="start" color={C.textMuted}>
          {left}
        </SvgText>
      ) : null}
      {right ? (
        <SvgText x={x + w} y={y + 76} size={17} weight={700} anchor="end" color={C.textMuted}>
          {right}
        </SvgText>
      ) : null}
    </g>
  );
}
