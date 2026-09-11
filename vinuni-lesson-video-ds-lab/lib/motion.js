/**
 * Motion math — a faithful port of the Remotion helpers the source repo uses
 * (interpolate, spring, Easing) plus the named beats from its rebuild-v1 shared.tsx files.
 *
 * Everything is a pure function of a frame number at 30 fps. Never use wall-clock time,
 * CSS transitions or Math.random for scene motion: the same frame must always render the
 * same picture (this is what makes a scene scrubbable, capturable and portable to Remotion).
 */

export const CLAMP = Object.freeze({ extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** Remotion-compatible interpolate(). Input ranges must be strictly increasing. */
export function interpolate(input, inputRange, outputRange, options = {}) {
  const { easing = (t) => t, extrapolateLeft = 'extend', extrapolateRight = 'extend' } = options;
  if (inputRange.length !== outputRange.length || inputRange.length < 2) {
    throw new Error('interpolate(): inputRange and outputRange need the same length (>= 2).');
  }
  for (let i = 1; i < inputRange.length; i++) {
    if (!(inputRange[i] > inputRange[i - 1])) {
      throw new Error(`interpolate(): inputRange must be strictly increasing, got [${inputRange.join(', ')}].`);
    }
  }
  let seg = 1;
  for (; seg < inputRange.length - 1; seg++) if (inputRange[seg] >= input) break;
  const inMin = inputRange[seg - 1];
  const inMax = inputRange[seg];
  const outMin = outputRange[seg - 1];
  const outMax = outputRange[seg];
  let x = input;
  if (x < inMin) {
    if (extrapolateLeft === 'clamp') x = inMin;
    else if (extrapolateLeft === 'identity') return x;
  }
  if (x > inMax) {
    if (extrapolateRight === 'clamp') x = inMax;
    else if (extrapolateRight === 'identity') return x;
  }
  if (outMin === outMax) return outMin;
  const t = easing((x - inMin) / (inMax - inMin));
  return outMin + t * (outMax - outMin);
}

/** cubic-bezier(x1, y1, x2, y2) easing (same solver as the `bezier-easing` package Remotion uses). */
function bezier(x1, y1, x2, y2) {
  if (x1 === y1 && x2 === y2) return (t) => t;
  const A = (a1, a2) => 1 - 3 * a2 + 3 * a1;
  const B = (a1, a2) => 3 * a2 - 6 * a1;
  const Cc = (a1) => 3 * a1;
  const calc = (t, a1, a2) => ((A(a1, a2) * t + B(a1, a2)) * t + Cc(a1)) * t;
  const slope = (t, a1, a2) => 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + Cc(a1);
  const SIZE = 11;
  const STEP = 1 / (SIZE - 1);
  const samples = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) samples[i] = calc(i * STEP, x1, x2);
  const tForX = (x) => {
    let start = 0;
    let i = 1;
    for (; i !== SIZE - 1 && samples[i] <= x; i++) start += STEP;
    i--;
    const dist = (x - samples[i]) / (samples[i + 1] - samples[i]);
    let guess = start + dist * STEP;
    const initialSlope = slope(guess, x1, x2);
    if (initialSlope >= 0.001) {
      for (let n = 0; n < 4; n++) {
        const s = slope(guess, x1, x2);
        if (s === 0) return guess;
        guess -= (calc(guess, x1, x2) - x) / s;
      }
      return guess;
    }
    if (initialSlope === 0) return guess;
    let a = start;
    let b = start + STEP;
    let cur = 0;
    let n = 0;
    do {
      guess = a + (b - a) / 2;
      cur = calc(guess, x1, x2) - x;
      if (cur > 0) b = guess;
      else a = guess;
    } while (Math.abs(cur) > 1e-7 && ++n < 10);
    return guess;
  };
  return (x) => (x === 0 || x === 1 ? x : calc(tForX(x), y1, y2));
}

/** Remotion-compatible Easing namespace. */
export const Easing = Object.freeze({
  linear: (t) => t,
  quad: (t) => t * t,
  cubic: (t) => t * t * t,
  sin: (t) => 1 - Math.cos((t * Math.PI) / 2),
  exp: (t) => Math.pow(2, 10 * (t - 1)),
  in: (fn) => fn,
  out: (fn) => (t) => 1 - fn(1 - t),
  inOut: (fn) => (t) => (t < 0.5 ? fn(t * 2) / 2 : 1 - fn((1 - t) * 2) / 2),
  bezier,
});

function springStep(state, now, cfg) {
  const { toValue, lastTimestamp, current, velocity } = state;
  const dt = Math.min(now - lastTimestamp, 64);
  const c = cfg.damping;
  const m = cfg.mass;
  const k = cfg.stiffness;
  const v0 = -velocity;
  const x0 = toValue - current;
  const zeta = c / (2 * Math.sqrt(k * m));
  const w0 = Math.sqrt(k / m);
  const w1 = w0 * Math.sqrt(1 - zeta * zeta);
  const t = dt / 1000;
  if (zeta < 1) {
    const env = Math.exp(-zeta * w0 * t);
    const sin1 = Math.sin(w1 * t);
    const cos1 = Math.cos(w1 * t);
    const frag = env * (sin1 * ((v0 + zeta * w0 * x0) / w1) + x0 * cos1);
    return {
      toValue,
      lastTimestamp: now,
      current: toValue - frag,
      velocity: zeta * w0 * frag - env * (cos1 * (v0 + zeta * w0 * x0) - w1 * x0 * sin1),
    };
  }
  const env = Math.exp(-w0 * t);
  return {
    toValue,
    lastTimestamp: now,
    current: toValue - env * (x0 + (v0 + w0 * x0) * t),
    velocity: env * (v0 * (t * w0 - 1) + t * x0 * w0 * w0),
  };
}

/**
 * Remotion-compatible spring(): physics-based 0→1 (mapped to from→to) evaluated at `frame`.
 * Defaults match Remotion (damping 10, mass 1, stiffness 100). Negative frames return `from`.
 */
export function spring({ frame, fps = 30, config = {}, from = 0, to = 1 }) {
  const cfg = { damping: 10, mass: 1, stiffness: 100, overshootClamping: false, ...config };
  let state = { toValue: 1, lastTimestamp: 0, current: 0, velocity: 0 };
  const f = Math.max(0, frame);
  const whole = Math.floor(f);
  const rest = f - whole;
  for (let i = 0; i <= whole; i++) {
    const at = i === whole ? i + rest : i;
    state = springStep(state, (at / fps) * 1000, cfg);
  }
  let v = state.current;
  if (cfg.overshootClamping && v > 1) v = 1;
  return from + (to - from) * v;
}

/* ------------------------------------------------------------------ named easings */
export const EASE = Object.freeze({
  out: Easing.bezier(0.16, 1, 0.3, 1), //   appear / reveal
  inOut: Easing.inOut(Easing.cubic), //    smooth move (Day28)
  exit: Easing.bezier(0.4, 0, 1, 1), //    hook exit
  draw: Easing.bezier(0.65, 0, 0.35, 1), // underline draw
  outCubic: Easing.out(Easing.cubic),
});

/* ------------------------------------------------------------------ named beats
   Identical to the helpers in src/videos/Day05/rebuild-v1/.../shared.tsx. */

/** 0→1 with the reveal ease between two frames. */
export const progress = (frame, start, end) =>
  interpolate(frame, [start, end], [0, 1], { ...CLAMP, easing: EASE.out });

/** 0→1 linear — particle travel, parameter sweeps, count-ups. */
export const linearProgress = (frame, start, end) => interpolate(frame, [start, end], [0, 1], CLAMP);

/** Standard reveal: 24 frames with the out ease. */
export const appear = (frame, start, duration = 24) => progress(frame, start, start + duration);

/** Linear fade-in (the Day02–Day04 `fade`). */
export const fade = (frame, start, duration = 24) => linearProgress(frame, start, start + duration);

/** One receiving-card pulse: 0→1→0 over 54 frames, peak at 32 %. */
export const pulse = (frame, at, duration = 54) =>
  interpolate(frame, [at, at + duration * 0.32, at + duration], [0, 1, 0], CLAMP);

/** Fade in over `span`, hold, fade out over `span` before `end` (a beat that leaves). */
export function fadeWindow(frame, start, end, span = 24) {
  if (!(end > start)) return 0;
  const s = Math.min(span, (end - start) / 2.001);
  return interpolate(frame, [start, start + s, end - s, end], [0, 1, 1, 0], CLAMP);
}

/** Eased in-out value between two frames (Day28 `smooth`). */
export const smooth = (frame, start, end, from = 0, to = 1) =>
  interpolate(frame, [start, end], [from, to], { ...CLAMP, easing: EASE.inOut });

/** Scene/title entrance scale: spring damping 200, 0.94 → 1 (no overshoot). */
export const enterScale = (frame, start = 0, fps = 30) =>
  spring({ frame: frame - start, fps, config: { damping: 200 }, from: 0.94, to: 1 });

/** Icon / card pop: spring damping 13, stiffness 140 (small overshoot). */
export const popScale = (frame, start = 0, fps = 30) =>
  spring({ frame: frame - start, fps, config: { damping: 13, stiffness: 140 } });

/** Continuous count-up value (round only when displaying). */
export const countUp = (frame, start, end, from, to) => interpolate(frame, [start, end], [from, to], CLAMP);

export const secondsToFrames = (seconds, fps = 30) => Math.round(seconds * fps);
export const framesToSeconds = (frames, fps = 30) => Math.round((frames / fps) * 1000) / 1000;

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
