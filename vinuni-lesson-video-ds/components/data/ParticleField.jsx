import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { fbm, hash01 } from '../../lib/noise.js';

const cyc = (v) => ((v % 1) + 1) % 1;
const smoothstep = (u) => {
  const c = clamp01(u);
  return c * c * (3 - 2 * c);
};

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
 * Anatomy: dot r `r` (×0.78–1.28 by speed) · vapor = `hot` at 55–100 % alpha · liquid = `cool`, and
 * wandering at 35 % — condensate creeps through a wick, it does not fly · the change of phase ramps
 * over `phaseFade` of the loop at each end of `coolAt`, never as a step · `wanderY` scales the vertical
 * swing, so a wide shallow box can be filled without dots spilling out of it · `lane` gives each
 * particle its own offset from the path, so a shared leg reads as a cloud rather than a column.
 *
 * Sizing contract: a leg of the path needs `wander × wanderY × heat.boost + lane.y` of clearance from
 * whatever the particles must not enter — the wick, the wall. Vapor drawn inside the wick is the usual
 * symptom of ignoring it.
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
  lane = 0,
  r = 5,
  path,
  heat,
  coolAt,
  phaseFade = 0.1,
  hot = C.red,
  cool = C.accent,
  opacity = 1,
}) {
  if (opacity <= 0.001 || count <= 0) return null;
  const dots = [];
  for (let i = 0; i < count; i++) {
    // Every particle gets its own lane, phase and pace, so the field never pulses in unison.
    const lane0 = hash01(seed, i, 1);
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
      bx = x + (0.08 + lane0 * 0.84) * w;
      by = y + (0.12 + hash01(seed, i, 4) * 0.76) * h;
    }

    /**
     * How condensed this particle is, 0–1, ramped smoothly over `phaseFade` of the loop at each end of
     * `coolAt`. A hard switch teleports the particle at the very moment it changes phase — and that
     * moment is at the hot spot, where the swing is widest, so it reads as a jet blown out of the
     * evaporator. A ramp turns the same event into what it should be: the drop warms as it nears the
     * chip, loosens, and lifts off.
     */
    let liq = 0;
    if (coolAt) {
      const width = cyc(coolAt[1] - coolAt[0]) || 1;
      const u = cyc(along - coolAt[0]);
      liq = smoothstep(u / phaseFade) * smoothstep((width - u) / phaseFade);
    }
    // Condensed particles are held in the wick: they creep instead of flying, and they hug their lane.
    const grip = 1 - 0.65 * liq;

    // Each particle rides its own lane, so a shared leg of the path reads as a cloud, not a column.
    const laneX = typeof lane === 'number' ? lane : lane.x || 0;
    const laneY = typeof lane === 'number' ? lane : lane.y || 0;
    bx += (hash01(seed, i, 5) * 2 - 1) * laneX * grip;
    by += (hash01(seed, i, 6) * 2 - 1) * laneY * grip;

    // How hot it is where the particle actually is — after its lane offset, or the whole cloud would
    // read as one temperature.
    let warm = 1;
    if (heat) {
      const boost = heat.boost ?? 1.8;
      const d = Math.hypot(bx - heat.x, (by - (heat.y ?? y + h / 2)) * 0.6);
      warm = 1 + (boost - 1) * clamp01(1 - d / (heat.r || 1));
    }
    const amp = wander * warm * grip;
    const nx = fbm(seed * 31 + i, t * speed * warm * 0.9 + phase * 7, 3);
    const ny = fbm(seed * 31 + i + 7919, t * speed * warm * 0.9 + phase * 11, 3);
    // A particle never leaves its box: a hot zone widens the swing, and without this the fastest ones
    // fly out through the wall they are supposed to be bouncing off.
    const px = Math.min(x + w - r, Math.max(x + r, bx + nx * amp));
    const py = Math.min(y + h - r, Math.max(y + r, by + ny * amp * wanderY));
    const energy = clamp01((warm - 1) / 1.4) * (1 - liq);
    const rr = r * (0.78 + energy * 0.5) * (1 - 0.1 * liq);
    dots.push(
      <circle
        key={i}
        cx={px}
        cy={py}
        r={rr}
        fill={liq > 0.5 ? cool : hot}
        opacity={0.55 + energy * 0.45 * (1 - liq) + 0.35 * liq}
      />,
    );
  }
  return <g opacity={opacity < 1 ? opacity : undefined}>{dots}</g>;
}
