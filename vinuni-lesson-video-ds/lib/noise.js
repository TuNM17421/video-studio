/**
 * Deterministic pseudo-randomness for frame-driven scenes.
 *
 * Why this file exists: tools/render.mjs paints frames in six parallel Chrome tabs. `Math.random()`
 * returns a different number in each tab, so a particle seeded with it jumps between frames — the
 * render does not match the preview and the motion flickers. (Remotion hit the same wall and answers it
 * the same way, with a seeded `random()`.) Everything here is a pure function of its arguments, so
 * frame N looks the same in every tab, on every machine, on every re-render — and verify's ban on
 * `Math.random` / `Date.now` inside components/ stays satisfiable.
 *
 * Integer mixing only (Math.imul, >>>): those are exactly specified in JS, unlike the GLSL
 * `fract(sin(x) * 43758.5453)` trick, which drifts between platforms.
 */

/** Deterministic 0–1 from up to three integers. */
export function hash01(a, b = 0, c = 0) {
  let h = Math.imul((a | 0) ^ 0x9e3779b1, 0x85ebca6b);
  h = Math.imul(h ^ ((b | 0) + 0x165667b1), 0xc2b2ae35);
  h = Math.imul(h ^ ((c | 0) + 0x27d4eb2f), 0x27d4eb2f);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/**
 * Smooth value noise in [−1, 1], continuous in `t` (smoothstep between hashed lattice points).
 * One unit of `t` is one lattice step, so `t = frame / 30` wobbles about once a second.
 */
export function noise1(seed, t) {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  const a = hash01(seed, i) * 2 - 1;
  const b = hash01(seed, i + 1) * 2 - 1;
  return a + (b - a) * u;
}

/**
 * Fractal sum of `octaves` noise1 layers, each twice as fast and half as strong — one slow swing with
 * fine detail on top, which is what makes motion read as alive instead of as a sine wave. In [−1, 1].
 */
export function fbm(seed, t, octaves = 3) {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  for (let k = 0; k < octaves; k++) {
    sum += noise1(seed + k * 101, t * 2 ** k) * amp;
    norm += amp;
    amp *= 0.5;
  }
  return sum / norm;
}

/** A deterministic value spread over `count` items: hash01(seed, i) scaled into [lo, hi]. */
export const spread = (seed, i, lo = 0, hi = 1) => lo + hash01(seed, i) * (hi - lo);
