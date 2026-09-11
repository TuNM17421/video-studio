import React from 'react';
import { C } from '../../lib/tokens.js';
import { CLAMP, EASE, appear, clamp01, interpolate, linearProgress } from '../../lib/motion.js';
import { contains, pathD, pointAtDistance, polylineLength } from '../../lib/geometry.js';
import { SvgText } from '../text/Text.jsx';

/**
 * Animated connector — the core "data flows" primitive.
 *  · base track: dotInactive, same width, always visible once the flow fades in
 *  · progress stroke: accent (or red for the chosen / transformed path), revealed by dashoffset
 *  · particle: 9 px dot with a 13 px white halo riding the SAME polyline at the SAME distance
 *  · arrowhead: fades in at the end point once the particle has hidden there (never under the
 *    dot's halo); without a particle it fades in over the last 14 frames
 * The particle hides within `clearance` px (default 18 = dot 9 + halo 4 + stroke 3 + 2) of either end and inside any `hideIn` card bounds
 * (a point never floats across a card face). Travel is linear = constant speed.
 * Drive with frame/start/end (like the source) or pass an explicit `progress` 0–1.
 * Port of Flow in Day05 shared.tsx + the connector contract of the production-QA skill.
 * @category flow
 */
export function Flow({
  points,
  frame = 0,
  start = 0,
  end = 1,
  progress,
  opacity = 1,
  color = C.accent,
  strokeWidth = 5,
  dashed = false,
  showParticle = true,
  drawBase = true,
  arrow = true,
  hideIn = [],
  clearance = 18,
  fadeIn = true,
}) {
  if (!points || points.length < 2) return null;
  const explicit = progress != null;
  const traveled = explicit ? clamp01(progress) : linearProgress(frame, start, end);
  const inWindow = explicit ? traveled > 0 && traveled < 1 : frame >= start && frame < end;
  const o = opacity * (explicit || !fadeIn ? 1 : appear(frame, start, 18));
  if (o <= 0.001) return null;
  const length = polylineLength(points);
  const distance = traveled * length;
  const pt = pointAtDistance(points, distance);
  const hidden = hideIn.some((b) => contains(b, pt, clearance));
  const showPoint = showParticle && inWindow && distance > clearance && distance < length - clearance && !hidden;
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const angle = (Math.atan2(last.y - prev.y, last.x - prev.x) * 180) / Math.PI;
  // The dot hides `clearance` px before the end; only then may the arrowhead appear under it.
  const hideAt = start + (end - start) * clamp01(1 - clearance / Math.max(length, 1));
  let arrowOpacity = 0;
  if (arrow && explicit) arrowOpacity = clamp01((traveled - 0.92) / 0.08);
  else if (arrow && showParticle) arrowOpacity = interpolate(frame, [hideAt, Math.max(hideAt + 8, end + 6)], [0, 1], { ...CLAMP, easing: EASE.out });
  else if (arrow) arrowOpacity = appear(frame, end - 14, 14);
  const d = pathD(points);
  return (
    <g opacity={o < 1 ? o : undefined}>
      {drawBase ? (
        <path d={d} fill="none" opacity={0.9} stroke={C.dotInactive} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
      ) : null}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeDasharray={dashed ? '13 11' : length}
        strokeDashoffset={dashed ? (1 - traveled) * 48 : length - distance}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      {showPoint ? (
        <>
          <circle cx={pt.x} cy={pt.y} r={13} fill={C.bg} />
          <circle cx={pt.x} cy={pt.y} r={9} fill={color} />
        </>
      ) : null}
      {arrowOpacity > 0.001 ? (
        <g opacity={arrowOpacity < 1 ? arrowOpacity : undefined} transform={`translate(${last.x} ${last.y}) rotate(${angle})`}>
          <path d="M -16 -11 L 0 0 L -16 11 Z" fill={color} />
        </g>
      ) : null}
    </g>
  );
}

/**
 * A data particle on its own (e.g. a token travelling along a path you compute with
 * pointAtDistance). Optional label pill to the right, like Day28 DataParticle.
 */
export function Particle({ x, y, color = C.accent, r = 9, halo = true, label, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const lw = label ? Math.round(label.length * 10.6 + 26) : 0;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {halo ? <circle cx={x} cy={y} r={r + 4} fill={C.bg} /> : null}
      <circle cx={x} cy={y} r={r} fill={color} />
      {label ? (
        <g>
          <rect x={x + r + 14} y={y - 17} width={lw} height={34} rx={17} fill={C.bg} stroke={color} strokeWidth={2} />
          <SvgText x={x + r + 14 + lw / 2} y={y + 6} size={17} weight={700} color={color}>
            {label}
          </SvgText>
        </g>
      ) : null}
    </g>
  );
}

/** A static (already drawn) connector: base-coloured or accent, optionally dashed. */
export function StaticPath({ points, color = C.accent, strokeWidth = 5, dashed = false, opacity = 1 }) {
  if (!points || points.length < 2 || opacity <= 0.001) return null;
  return (
    <path
      d={pathD(points)}
      fill="none"
      opacity={opacity < 1 ? opacity : undefined}
      stroke={color}
      strokeDasharray={dashed ? '12 10' : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    />
  );
}
