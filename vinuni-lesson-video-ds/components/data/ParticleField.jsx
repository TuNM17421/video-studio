import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { fbm, hash01 } from '../../lib/noise.js';

/** Point at distance `s` (0–1) around a closed polyline. */
function onPath(path, s) {
  const n = path.length;
  const t = ((s % 1) + 1) % 1;
  let total = 0;
  const seg = [];
  for (let i = 0; i < n; i++) {
    const a = path[i];
    const b = path[(i + 1) % n];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    seg.push(d);
    total += d;
  }
  let want = t * total;
  for (let i = 0; i < n; i++) {
    if (want <= seg[i] || i === n - 1) {
      const a = path[i];
      const b = path[(i + 1) % n];
      const k = seg[i] ? want / seg[i] : 0;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    want -= seg[i];
  }
  return path[0];
}

/**
 * ParticleField — many particles in disordered motion, every position a pure function of (index,
 * frame): gas molecules, droplets, sparks, data in transit.
 *
 * Disorder here is **seeded**, never drawn from the platform's random generator: six capture tabs
 * would otherwise each invent their own motion and the render would flicker (lib/noise.js says why). Each particle wanders on two
 * independent `fbm` channels, which looks organic where a sum of sines looks mechanical.
 *
 * `heat` is a zone where particles speed up and swing wider — kinetic theory, where mean molecular
 * speed goes as √T, so the hot spot should be visibly busier than the cold edges. Energy is shown with
 * opacity and radius, and phase with the two palette colors (`hot` vapor / `cool` liquid); the palette
 * is never interpolated into new hues.
 *
 * `path` (a closed polyline) adds net transport on top of the jiggle — a convection cell, a vapor
 * chamber's evaporate → spread → condense → wick-return loop, a water cycle. Without it the particles
 * only mill about inside the box.
 *
 * Anatomy: dot r `r` (×0.7–1.3 by speed) · vapor = `hot` at 55–100 % alpha · liquid = `cool`, smaller,
 * and wandering at 35 % — condensate creeps through a wick, it does not fly · a particle counts as
 * liquid while it is on the `coolAt` stretch of the path (0–1 positions) · `wanderY` scales the vertical
 * swing, so a wide shallow box can still be filled without the dots spilling out of it.
 */
export function ParticleField({
  x,
  y,
  w,
  h,
  frame = 0,
  count = 60,
  seed = 1,
  speed = 0.9,
  wander = 20,
  wanderY = 0.62,
  r = 5,
  path,
  heat,
  coolAt,
  hot = C.red,
  cool = C.accent,
  opacity = 1,
}) {
  if (opacity <= 0.001 || count <= 0) return null;
  const dots = [];
  for (let i = 0; i < count; i++) {
    // Every particle gets its own lane, phase and pace, so the field never pulses in unison.
    const lane = hash01(seed, i, 1);
    const pace = 0.6 + hash01(seed, i, 2) * 0.8;
    const phase = hash01(seed, i, 3);
    const t = frame / 30;

    let bx;
    let by;
    let along = 0;
    if (path && path.length > 1) {
      along = phase + t * speed * 0.06 * pace;
      const p = onPath(path, along);
      bx = p.x;
      by = p.y;
    } else {
      bx = x + (0.08 + lane * 0.84) * w;
      by = y + (0.12 + hash01(seed, i, 4) * 0.76) * h;
    }

    // How hot it is here: 1 far away, up to heat.boost inside the zone.
    let warm = 1;
    if (heat) {
      const boost = heat.boost ?? 1.8;
      const d = Math.hypot(bx - heat.x, (by - (heat.y ?? y + h / 2)) * 0.6);
      warm = 1 + (boost - 1) * clamp01(1 - d / (heat.r || 1));
    }
    // Condensed particles are held in the wick: they creep instead of flying, which is both the physics
    // and what keeps them from spilling out of a shallow box.
    const liquid = coolAt ? ((along % 1) + 1) % 1 >= coolAt[0] && ((along % 1) + 1) % 1 <= coolAt[1] : false;
    const amp = wander * warm * (liquid ? 0.35 : 1);
    const nx = fbm(seed * 31 + i, t * speed * warm * 0.9 + phase * 7, 3);
    const ny = fbm(seed * 31 + i + 7919, t * speed * warm * 0.9 + phase * 11, 3);
    // A particle never leaves its box: a hot zone widens the swing, and without this the fastest ones
    // fly out through the wall they are supposed to be bouncing off.
    const px = Math.min(x + w - r, Math.max(x + r, bx + nx * amp));
    const py = Math.min(y + h - r, Math.max(y + r, by + ny * amp * wanderY));
    const energy = clamp01((warm - 1) / 1.4);
    const rr = liquid ? r * 0.72 : r * (0.78 + energy * 0.5);
    dots.push(
      <circle
        key={i}
        cx={px}
        cy={py}
        r={rr}
        fill={liquid ? cool : hot}
        opacity={liquid ? 0.9 : 0.55 + energy * 0.45}
      />,
    );
  }
  return <g opacity={opacity < 1 ? opacity : undefined}>{dots}</g>;
}
