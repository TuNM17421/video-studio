/**
 * Deterministic text motion helpers — pure functions of the frame.
 *
 *   graphemes(str)                    → user-perceived characters (Vietnamese diacritics stay whole)
 *   typeText(str, frame, start, cps)  → the prefix visible at `frame` (typewriter, 30 fps)
 *   revealCount(n, frame, start, per) → how many of n items (tokens, rows) are visible
 *   formatNumber(v, digits)           → vi-VN grouping ("1.234,5")
 *   rng(seed)                         → seeded PRNG (mulberry32) — the only allowed "random"
 */
import { clamp01 } from './motion.js';

const segmenter =
  typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('vi', { granularity: 'grapheme' }) : null;

/** Split into graphemes after NFC normalisation, so "ế" is never cut into base + combining marks. */
export function graphemes(str) {
  const s = String(str ?? '').normalize('NFC');
  if (segmenter) return Array.from(segmenter.segment(s), (x) => x.segment);
  return Array.from(s);
}

/** Typewriter: the visible prefix of `str` at `frame`. `cps` = characters per second (30 fps). */
export function typeText(str, frame, start = 0, cps = 30) {
  const g = graphemes(str);
  const n = Math.floor(Math.max(0, frame - start) * (cps / 30));
  return n >= g.length ? g.join('') : g.slice(0, n).join('');
}

/** Number of items visible when one appears every `per` frames from `start` (0…n). */
export function revealCount(n, frame, start = 0, per = 3) {
  if (frame < start) return 0;
  return Math.min(n, Math.floor((frame - start) / per) + 1);
}

/** 0→1 progress of item `i` when items reveal every `per` frames, each over `dur` frames. */
export function staggered(i, frame, start = 0, per = 3, dur = 12) {
  return clamp01((frame - start - i * per) / dur);
}

const nf = new Map();
/** Vietnamese number formatting (dot thousands, comma decimals). Round only for display. */
export function formatNumber(v, digits = 0) {
  if (!nf.has(digits)) {
    nf.set(digits, new Intl.NumberFormat('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  }
  return nf.get(digits).format(v);
}

/** Seeded PRNG (mulberry32): rng(7)() → same sequence every render. Never use Math.random in scenes. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
