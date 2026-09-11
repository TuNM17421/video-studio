import React from 'react';
import { C } from '../../lib/tokens.js';
import { CLAMP, EASE, interpolate } from '../../lib/motion.js';

/** Arrow outline on a 20-unit grid, tip at (0, 0). */
const ARROW = [
  [0, 0],
  [0, 16],
  [4, 12.4],
  [6.8, 18.6],
  [9.4, 17.4],
  [6.7, 11.4],
  [12, 11.4],
];

const RIPPLE = 18;

/** Frame at which waypoint `p` clicks (`click: true` → its `at`; a number → that frame), or null. */
const clickFrame = (p) => (p.click === true ? p.at ?? 0 : typeof p.click === 'number' ? p.click : null);

/**
 * Where the cursor tip is at `frame` along `path` ([{x, y, at}], `at` increasing).
 * Holds on the first point before the first `at`, eases (EASE.inOut) between consecutive waypoints,
 * holds on the last point afterwards. Without `frame` → the last point (settled).
 */
export function cursorPosition(path, frame) {
  if (!path || path.length === 0) return { x: 0, y: 0 };
  if (frame == null || path.length === 1) return { x: path[path.length - 1].x, y: path[path.length - 1].y };
  if (frame <= (path[0].at ?? 0)) return { x: path[0].x, y: path[0].y };
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const a0 = a.at ?? 0;
    const b0 = b.at ?? a0;
    if (frame <= b0) {
      if (!(b0 > a0)) return { x: b.x, y: b.y };
      const t = EASE.inOut((frame - a0) / (b0 - a0));
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  const last = path[path.length - 1];
  return { x: last.x, y: last.y };
}

/**
 * A generic mouse pointer (SVG): white arrow with a 2.5 px navy (C.text) outline, tip at the point.
 * Motion: `path` of waypoints `{x, y, at, click?}` — the tip eases (EASE.inOut) from waypoint to
 * waypoint, arriving at each `at` frame (hold = two waypoints at the same spot). A waypoint with
 * `click: true` (or `click: <frame>`) plays a click: the arrow dips to 86 % over 3 frames and back
 * by +9, and a ripple ring (r 8 → 38, 3 px, `color`, default C.red) expands and fades over 18 frames
 * around the tip. Static use: `x`, `y` without `path`. Without `frame` → settled on the last waypoint,
 * no ripple. `size` = arrow height in px (default 40). Not a data component — no MINH HỌA tag.
 * @category ui
 */
export function Cursor({ path, frame, x = 0, y = 0, size = 40, color = C.red, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const p = path && path.length ? cursorPosition(path, frame) : { x, y };
  const k = size / 20;
  let scale = 1;
  const ripples = [];
  if (frame != null && path) {
    path.forEach((wp, i) => {
      const cf = clickFrame(wp);
      if (cf == null || frame < cf) return;
      scale = Math.min(scale, interpolate(frame, [cf, cf + 3, cf + 9], [1, 0.86, 1], CLAMP));
      const t = (frame - cf) / RIPPLE;
      if (t > 1) return;
      const e = EASE.out(t);
      ripples.push(
        <g key={i}>
          <circle cx={wp.x} cy={wp.y} r={8 + 30 * e} fill="none" stroke={color} strokeWidth={3} opacity={(1 - t) * 0.9} />
          {t < 0.5 ? <circle cx={wp.x} cy={wp.y} r={7} fill={color} opacity={(0.5 - t) * 0.7} /> : null}
        </g>,
      );
    });
  }
  const s = k * scale;
  const pts = ARROW.map(([ax, ay]) => `${ax},${ay}`).join(' ');
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {ripples}
      <g transform={`translate(${p.x} ${p.y}) scale(${s})`}>
        <polygon points={pts} fill={C.bg} stroke={C.text} strokeWidth={2.5 / s} strokeLinejoin="round" />
      </g>
    </g>
  );
}
