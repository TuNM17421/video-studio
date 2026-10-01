import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { SvgText } from '../text/Text.jsx';

/** The series as points: either given, or `sample(x)` evaluated `n` times across the x range. */
function pointsOf(s, [x0, x1], n) {
  if (s.points) return s.points;
  if (typeof s.sample !== 'function') return [];
  const out = [];
  for (let i = 0; i <= n; i++) {
    const xv = x0 + ((x1 - x0) * i) / n;
    out.push({ x: xv, y: s.sample(xv) });
  }
  return out;
}

/** y of a series at xv (data units); null outside its range. */
function yAt(points, xv) {
  if (!points.length) return null;
  if (xv <= points[0].x) return points[0].y;
  for (let i = 1; i < points.length; i++) {
    if (xv <= points[i].x) {
      const a = points[i - 1];
      const b = points[i];
      return b.x === a.x ? b.y : a.y + ((b.y - a.y) * (xv - a.x)) / (b.x - a.x);
    }
  }
  return points[points.length - 1].y;
}

/**
 * LineChart — one or two series over an axis: "FPS theo 20 phút", "chi phí theo số lần gọi".
 * The only chart in data/ that shows a quantity CHANGING; everything else there is one value.
 *
 * Anatomy: horizontal gridline per yTick (dotInactive 2 px) · y labels 17 px muted, anchored end,
 * 22 px left of the plot · x labels 17 px muted, centered, 34 px below the baseline · series polyline
 * 4 px round-joined · 8 px dot at the head · legend above the plot (44 px swatch + 18 px muted label).
 * `progress` 0→1 draws the lines left to right and the head dot rides the end of the drawn part.
 *
 * A series is either fixed `points` or a `sample(x)` function evaluated `samples` times. `sample` is
 * what makes a trace live: close it over the frame and over `fbm` from lib/noise.js and the whole line
 * keeps moving while the scene holds, the way a real reading does. A flat line is a claim that nothing
 * changed, and a measurement that never wobbles reads as a drawing, not as a measurement.
 * `rules` draws the thresholds that explain the shape — the throttle ceiling a temperature curve bounces
 * off — and `readout` prints the live value at the head.
 *
 * Rules: at most two series — a third makes the reader hunt the legend instead of the shape · the
 * series the narration lands on is `C.red`, the one it compares against `C.accent` · the numbers are
 * the script's, never invented · hold ≥ 45 f at `progress` 1 before the scene cuts.
 */
export function LineChart({
  x,
  y,
  w,
  h,
  series = [],
  xRange = [0, 1],
  yRange = [0, 1],
  xTicks = [],
  yTicks = [],
  xTickLabel,
  samples = 120,
  rules = [],
  progress = 1,
  legend = true,
  opacity = 1,
}) {
  if (opacity <= 0.001 || !series.length) return null;
  const p = clamp01(progress);
  const [x0, x1] = xRange;
  const [y0, y1] = yRange;
  const px = (v) => x + ((v - x0) / (x1 - x0 || 1)) * w;
  const py = (v) => y + h - ((v - y0) / (y1 - y0 || 1)) * h;
  const headX = x0 + (x1 - x0) * p;
  const drawn = series.map((s) => ({ ...s, pts: pointsOf(s, [x0, x1], samples) }));
  // Deterministic id from the plot box, which is unique within a scene: verify bans a random or
  // clock-derived one in components, and two charts in one scene must not share a clip.
  const clipId = `vk-lc-${Math.round(x)}-${Math.round(y)}-${Math.round(w)}`;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <defs>
        <clipPath id={clipId}>
          <rect x={x - 6} y={y - 20} width={Math.max(0, w * p) + 12} height={h + 40} />
        </clipPath>
      </defs>
      {yTicks.map((v) => (
        <g key={`y${v}`}>
          <line x1={x} y1={py(v)} x2={x + w} y2={py(v)} stroke={C.dotInactive} strokeWidth={2} />
          <SvgText x={x - 22} y={py(v) + 7} size={17} anchor="end" color={C.textMuted}>
            {String(v)}
          </SvgText>
        </g>
      ))}
      {rules.map((rl, i) => (
        <g key={`r${i}`}>
          <line x1={x} y1={py(rl.y)} x2={x + w} y2={py(rl.y)} stroke={rl.accent || C.red} strokeWidth={2.5} strokeDasharray="12 9" />
          {rl.label ? (
            <SvgText x={x + 6} y={py(rl.y) - 12} size={16} weight={700} anchor="start" color={rl.accent || C.red}>
              {rl.label}
            </SvgText>
          ) : null}
        </g>
      ))}
      <g clipPath={`url(#${clipId})`}>
        {drawn.map((s, i) => (
          <polyline
            key={`s${i}`}
            points={s.pts.map((q) => `${px(q.x)},${py(q.y)}`).join(' ')}
            fill="none"
            stroke={s.accent || C.accent}
            strokeWidth={4}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={s.dashed ? '14 10' : undefined}
          />
        ))}
      </g>
      {p > 0.001
        ? drawn.map((s, i) => {
            const v = yAt(s.pts, headX);
            if (v == null) return null;
            const near = px(headX) > x + w * 0.82;
            return (
              <g key={`d${i}`}>
                <circle cx={px(headX)} cy={py(v)} r={8} fill={s.accent || C.accent} />
                {typeof s.readout === 'function' ? (
                  <SvgText
                    x={px(headX) + (near ? -4 : 4)}
                    y={py(v) - 18}
                    size={20}
                    weight={700}
                    anchor={near ? 'end' : 'start'}
                    color={s.accent || C.accent}
                  >
                    {s.readout(v)}
                  </SvgText>
                ) : null}
              </g>
            );
          })
        : null}
      {xTicks.map((v, i) => (
        <SvgText key={`x${v}`} x={px(v)} y={y + h + 34} size={17} color={C.textMuted}>
          {i === xTicks.length - 1 && xTickLabel ? `${v} ${xTickLabel}` : String(v)}
        </SvgText>
      ))}
      {legend && series.length > 1
        ? (() => {
            let lx = x;
            return drawn.map((s, i) => {
              const at = lx;
              lx += 44 + 14 + textWidth(s.label, 18, 600) + 48;
              return (
                <g key={`l${i}`}>
                  <line x1={at} y1={y - 44} x2={at + 44} y2={y - 44} stroke={s.accent || C.accent} strokeWidth={5} />
                  <SvgText x={at + 58} y={y - 37} size={18} anchor="start" color={C.textMuted}>
                    {s.label}
                  </SvgText>
                </g>
              );
            });
          })()
        : null}
    </g>
  );
}
