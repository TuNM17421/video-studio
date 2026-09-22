/**
 * Hand-drawn geometry for the whiteboard style — pure functions, no DOM, no clock.
 * Every wobble comes from a PRNG seeded by the mark's id, so frame N always draws the same stroke
 * (a stroke that re-randomised per frame would shimmer). Shapes are single SVG path strings, drawn on
 * with lib/paths drawOn() and followed by the pen with penOnPath().
 */
import { curvePath, getLength, getPointAtLength } from '../../lib/paths.js';
import { rng } from '../../lib/text.js';

/** Pangolin advance widths, per 1000 units of font size (measured in Chromium, 2026-09-22). */
const ADVANCE = { "0": 683, "1": 391, "2": 559, "3": 558, "4": 580, "5": 542, "6": 582, "7": 529, "8": 504, "9": 515, " ": 217, "!": 288, "\"": 406, "#": 624, "$": 542, "%": 736, "&": 626, "'": 198, "(": 334, ")": 336, "*": 463, "+": 567, ",": 254, "-": 426, ".": 219, "/": 359, ":": 267, ";": 278, "<": 566, "=": 596, ">": 546, "?": 442, "@": 797, "A": 649, "B": 566, "C": 617, "D": 627, "E": 520, "F": 602, "G": 663, "H": 633, "I": 282, "J": 479, "K": 603, "L": 564, "M": 720, "N": 676, "O": 635, "P": 552, "Q": 611, "R": 579, "S": 583, "T": 555, "U": 662, "V": 599, "W": 854, "X": 567, "Y": 581, "Z": 682, "[": 319, "\\": 391, "]": 300, "^": 424, "_": 617, "`": 236, "a": 465, "b": 491, "c": 508, "d": 490, "e": 493, "f": 406, "g": 503, "h": 469, "i": 178, "j": 230, "k": 417, "l": 238, "m": 888, "n": 566, "o": 537, "p": 472, "q": 468, "r": 357, "s": 447, "t": 403, "u": 503, "v": 450, "w": 675, "x": 500, "y": 427, "z": 521, "{": 332, "|": 312, "}": 386, "~": 654, "đ": 602, "Đ": 671, "…": 746, "–": 589, "—": 923, "“": 412, "”": 424, "‘": 266, "’": 237, "·": 323, "→": 1000 };

const advance = (ch) => ADVANCE[ch] ?? ADVANCE[ch.normalize('NFD')[0]] ?? 520;

/** Width of `text` in Pangolin at `size` px — accented Vietnamese letters take their base letter's width. */
export function handWidth(text, size) {
  let w = 0;
  for (const ch of String(text)) w += advance(ch);
  return (w * size * 1.02) / 1000; // +2 %: ư/ơ horns and spacing the table does not see
}

/** FNV-1a hash of a string → PRNG seed. */
export function seedOf(id) {
  let h = 2166136261;
  for (const ch of String(id)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

const f1 = (v) => Math.round(v * 10) / 10;
const jit = (r, s) => (r() * 2 - 1) * s;
const pt = (p) => `${f1(p.x)},${f1(p.y)}`;

/** One slightly bowed stroke a → b as a quadratic segment ("Q …"); `move` prefixes the M. */
function seg(r, a, b, move) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const bow = jit(r, Math.min(9, len * 0.018));
  const c = { x: (a.x + b.x) / 2 + (-dy / len) * bow, y: (a.y + b.y) / 2 + (dx / len) * bow };
  const end = { x: b.x + jit(r, 1.4), y: b.y + jit(r, 1.4) };
  const start = { x: a.x + jit(r, 1.4), y: a.y + jit(r, 1.4) };
  return `${move ? `M${pt(start)} ` : ''}Q${pt(c)} ${pt(end)}`;
}

/** Hand-drawn polyline through points (each leg gently bowed). */
export function sketchLine(points, seed) {
  const r = rng(seed);
  return points.slice(1).map((p, i) => seg(r, points[i], p, i === 0)).join(' ');
}

/** Rectangle drawn in one stroke from near the top-left corner, overshooting where it closes. */
export function sketchRect({ x, y, w, h }, seed) {
  const r = rng(seed);
  const o = Math.min(18, w * 0.05);
  const p = [
    { x: x + o * 0.4, y: y + jit(r, 2) },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
    { x, y },
    { x: x + o * 1.6, y: y + jit(r, 3) },
  ];
  return p.slice(1).map((q, i) => seg(r, p[i], q, i === 0)).join(' ');
}

/** Loose loop around (cx, cy): starts upper-left, runs a little past a full turn, radius breathes. */
export function sketchEllipse({ cx, cy, rx, ry }, seed, turns = 1.08) {
  const r = rng(seed);
  const n = 30;
  const a0 = -2.3 + jit(r, 0.3);
  const phase = r() * Math.PI * 2;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const a = a0 + k * Math.PI * 2 * turns;
    const breathe = 1 + 0.035 * Math.sin(a * 2 + phase) + 0.05 * k;
    pts.push({ x: cx + Math.cos(a) * rx * breathe, y: cy + Math.sin(a) * ry * breathe });
  }
  return curvePath(pts, 'catmullRom');
}

/** Shaft through points, then the head in one stroke (barb → tip → barb). */
export function sketchArrow(points, seed, head = 22) {
  const r = rng(seed + 1);
  const tip = points[points.length - 1];
  const from = points[points.length - 2];
  const a = Math.atan2(tip.y - from.y, tip.x - from.x);
  const spread = 0.5 + jit(r, 0.06);
  const b1 = { x: tip.x - Math.cos(a - spread) * head, y: tip.y - Math.sin(a - spread) * head };
  const b2 = { x: tip.x - Math.cos(a + spread) * head, y: tip.y - Math.sin(a + spread) * head };
  return `${sketchLine(points, seed)} M${pt(b1)} L${pt(tip)} L${pt(b2)}`;
}

/** Wavy underline from x1 to x2 at y. */
export function sketchUnderline(x1, x2, y, seed) {
  const r = rng(seed);
  const n = 4;
  const pts = Array.from({ length: n + 1 }, (_, i) => ({ x: x1 + ((x2 - x1) * i) / n + jit(r, 3), y: y + jit(r, 2.5) + (i === n ? -3 : 0) }));
  return curvePath(pts, 'catmullRom');
}

/** Stick figure: (x, y) is the head's center, `s` its radius. Head → body → arms → legs. */
export function sketchPerson({ x, y, s = 30 }, seed) {
  const r = rng(seed + 7);
  const head = sketchEllipse({ cx: x, cy: y, rx: s, ry: s * 1.05 }, seed, 1.02);
  const neck = { x, y: y + s * 1.08 };
  const hip = { x: x + jit(r, 2), y: y + s * 3.3 };
  const shoulder = { x, y: y + s * 1.7 };
  const body = sketchLine([neck, hip], seed + 2);
  const arms = sketchLine([{ x: x - s * 1.5, y: y + s * 2.7 }, shoulder, { x: x + s * 1.5, y: y + s * 2.7 }], seed + 3);
  const legs = sketchLine([{ x: x - s * 1.1, y: y + s * 5.1 }, hip, { x: x + s * 1.1, y: y + s * 5.1 }], seed + 4);
  return `${head} ${body} ${arms} ${legs}`;
}

/** Tick: (x, y) is the bottom of the V, `s` its height. */
export function sketchCheck(x, y, s, seed) {
  return sketchLine([{ x: x - s * 0.45, y: y - s * 0.45 }, { x, y }, { x: x + s * 0.8, y: y - s }], seed);
}

/** Cross centred on (x, y), `s` wide. */
export function sketchCross(x, y, s, seed) {
  const h = s / 2;
  return `${sketchLine([{ x: x - h, y: y - h }, { x: x + h, y: y + h }], seed)} ${sketchLine([{ x: x + h, y: y - h }, { x: x - h, y: y + h }], seed + 1)}`;
}

const lengths = new Map();
/** Path length, memoised — completed marks are asked every frame. */
export function pathLength(d) {
  let l = lengths.get(d);
  if (l === undefined) {
    l = getLength(d);
    lengths.set(d, l);
    if (lengths.size > 4000) lengths.delete(lengths.keys().next().value);
  }
  return l;
}

/** Where the pen tip is when `d` has been drawn to t (0–1). */
export function penOnPath(d, t) {
  const p = getPointAtLength(d, pathLength(d) * Math.max(0, Math.min(1, t)));
  return { x: p.x, y: p.y };
}

/**
 * Puffy cloud around the box { x, y, w, h }: bumps of varying size along an ellipse, drawn in one
 * clockwise stroke that closes with a small overlap. Good as a thought bubble or a title badge.
 */
export function sketchCloud({ x, y, w, h }, seed) {
  const r = rng(seed);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const perimeter = Math.PI * (rx + ry);
  // bump width follows the cloud's height, so a flat cloud gets a few broad puffs, not a row of spikes
  const bumps = Math.max(5, Math.round(perimeter / Math.max(Math.min(rx, ry) * 1.25, 56)));
  const a0 = Math.PI * (0.9 + r() * 0.2);
  const pts = [];
  for (let b = 0; b < bumps; b++) {
    const size = 0.16 + r() * 0.12;
    const from = a0 + (b / bumps) * Math.PI * 2;
    const to = a0 + ((b + 1) / bumps) * Math.PI * 2;
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      const a = from + (to - from) * t;
      const bulge = 1 + Math.sin(Math.PI * t) * size;
      pts.push({ x: cx + Math.cos(a) * rx * bulge, y: cy + Math.sin(a) * ry * bulge });
    }
  }
  pts.push(pts[0], pts[1]);
  return curvePath(pts, 'catmullRom');
}

/** Smooth wandering path through points (catmull-rom), for dashed trails and loose connectors. */
export function sketchTrail(points, seed) {
  const r = rng(seed);
  return curvePath(points.map((p, i) => (i === 0 || i === points.length - 1 ? p : { x: p.x + jit(r, 4), y: p.y + jit(r, 4) })), 'catmullRom');
}

/**
 * Hachure: parallel strokes at `angle`° every `gap` px across the box { x, y, w, h }, each slightly
 * wobbly — the marker's way of shading. Clip it to the shape it fills.
 */
export function sketchHachure({ x, y, w, h }, seed, { gap = 16, angle = -40 } = {}) {
  const r = rng(seed);
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const reach = Math.hypot(w, h) / 2 + gap;
  const lines = [];
  for (let o = -reach; o <= reach; o += gap) {
    const px = cx - dy * o;
    const py = cy + dx * o;
    const a1 = { x: px - dx * reach + jit(r, 3), y: py - dy * reach + jit(r, 3) };
    const b1 = { x: px + dx * reach + jit(r, 3), y: py + dy * reach + jit(r, 3) };
    lines.push(`M${pt(a1)} L${pt(b1)}`);
  }
  return lines.join(' ');
}
