import React, { useId } from 'react';
import { C, alpha } from '../../lib/tokens.js';
import { EASE, interpolate, CLAMP } from '../../lib/motion.js';

/** Lens center at `frame` along `path` [{x, y, at}] (eased in-out between waypoints, held at the ends). */
export function magnifierAt(path, frame) {
  if (!path || path.length === 0) return { x: 0, y: 0 };
  if (frame == null || path.length === 1) return path[path.length - 1];
  const f = frame;
  if (f <= path[0].at) return path[0];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    if (f <= b.at) {
      const t = interpolate(f, [a.at, b.at], [0, 1], { ...CLAMP, easing: EASE.inOut });
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return path[path.length - 1];
}

/**
 * Magnifier — a magnifying glass (kính lúp) that scans content. Anatomy: lens circle (radius `r`,
 * 5 px stroke, faint accent glass tint, a short white glint arc) · handle (round-capped bar (0.3·r, ≥ 14 px)
 * at 45° down-right, length 1.1·r). Optional `children` = the SAME SVG that is
 * drawn underneath in scene coordinates; it is re-drawn inside the lens, clipped to the circle and
 * scaled ×`zoom` about the lens center (translate(cx,cy) scale(z) translate(−cx,−cy)).
 * Motion: pass `path` [{x, y, at}] + `frame` → the lens glides between waypoints (eased, holds at
 * ends); or fixed `x`, `y`. Default (no frame) = last waypoint. `color` C.red for "found it".
 * @category figures
 */
export function Magnifier({ x, y, path, r = 70, zoom = 1.8, frame, color = C.accent, children, opacity = 1 }) {
  const clipId = `mg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (opacity <= 0.001) return null;
  const p = path ? magnifierAt(path, frame) : { x, y };
  const cx = p.x;
  const cy = p.y;
  const d = r / Math.SQRT2;
  const hx0 = cx + d + 6;
  const hy0 = cy + d + 6;
  const L = r * 1.1;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <circle cx={cx} cy={cy} r={r} fill={C.bg} />
      {children ? (
        <>
          <clipPath id={clipId}>
            <circle cx={cx} cy={cy} r={r - 2} />
          </clipPath>
          <g clipPath={`url(#${clipId})`}>
            <g transform={`translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy})`}>{children}</g>
          </g>
        </>
      ) : null}
      <circle cx={cx} cy={cy} r={r} fill={alpha(color, 0.06)} />
      <path
        d={`M ${cx - r * 0.62} ${cy - r * 0.18} A ${r * 0.66} ${r * 0.66} 0 0 1 ${cx - r * 0.18} ${cy - r * 0.62}`}
        fill="none"
        stroke={C.bg}
        strokeWidth={Math.max(4, r * 0.08)}
        strokeLinecap="round"
        opacity={children ? 0.55 : 0.9}
      />
      <path d={`M ${hx0} ${hy0} L ${hx0 + L / Math.SQRT2} ${hy0 + L / Math.SQRT2}`} stroke={color} strokeWidth={Math.max(14, r * 0.3)} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={5} />
    </g>
  );
}
