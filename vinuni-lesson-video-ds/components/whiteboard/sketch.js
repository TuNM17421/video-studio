/**
 * Hand-drawn geometry for the whiteboard style — pure functions, no DOM, no clock.
 * Every wobble comes from a PRNG seeded by the mark's id, so frame N always draws the same stroke
 * (a stroke that re-randomised per frame would shimmer). Shapes are single SVG path strings, drawn on
 * with lib/paths drawOn() and followed by the pen with penOnPath().
 */
import { curvePath, getLength, getPointAtLength } from '../../lib/paths.js';
import { rng } from '../../lib/text.js';
import { HAND_DEFAULT, HAND_FONTS } from './handFonts.js';

const fontOf = (font) => HAND_FONTS[font] || HAND_FONTS[HAND_DEFAULT];
const advance = (table, ch) => table[ch] ?? table[ch.normalize('NFD')[0]] ?? 520;

/** Width of `text` at `size` px in handwriting font `font` (a HAND_FONTS key; default HAND_DEFAULT). */
export function handWidth(text, size, font = HAND_DEFAULT) {
  const table = fontOf(font).advance;
  let w = 0;
  for (const ch of String(text)) w += advance(table, ch);
  return (w * size * 1.01) / 1000; // +1 %: kerning the per-glyph table does not see
}

/** CSS family + weight of a handwriting font key. */
export const handFace = (font = HAND_DEFAULT) => ({ family: `'${fontOf(font).family}', 'Comic Sans MS', cursive`, weight: fontOf(font).weight });

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

/*
 * sketchFigure — the presenter. Seven heads tall, shoulders wider than the hips, a bowed spine
 * (the "line of action" that makes a pose read) instead of a straight stick, and hands and feet, which is
 * where body language actually lives. Poses and faces are swapped, never animated: the same head size and
 * line weight across all of them, so it stays one character.
 * Offsets below are in head units H from the shoulder (arms) or the hip (legs); `side` mirrors them.
 */
const ARMS = {
  //                near arm (the side `side` names)        far arm
  stand: [[[0.28, 1.0], [0.42, 2.0]], [[-0.28, 1.0], [-0.42, 2.0]]],
  point: [[[0.95, 0.35], [1.95, -0.15]], [[-0.25, 1.0], [-0.35, 2.0]]],
  think: [[[0.10, 1.50], [-0.05, -0.68]], [[-0.46, 0.88], [-0.16, 1.22]]],
  present: [[[0.85, 0.55], [1.70, 0.80]], [[-0.28, 1.0], [-0.40, 2.0]]],
  type: [[[0.45, 1.0], [0.34, 1.75]], [[-0.45, 1.0], [-0.34, 1.75]]],
  shrug: [[[0.85, 0.75], [1.00, -0.15]], [[-0.85, 0.75], [-1.00, -0.15]]],
  raise: [[[0.45, -0.55], [0.62, -1.70]], [[-0.28, 1.0], [-0.42, 2.0]]],
  celebrate: [[[0.80, -0.40], [1.35, -1.35]], [[-0.80, -0.40], [-1.35, -1.35]]],
};
const LEGS = {
  //       near leg                    far leg
  even: [[[0.18, 1.5], [0.30, 3.0]], [[-0.18, 1.5], [-0.30, 3.0]]],
  step: [[[0.35, 1.5], [0.55, 3.0]], [[-0.50, 1.45], [-0.95, 2.95]]],
  apart: [[[0.45, 1.5], [0.75, 3.0]], [[-0.45, 1.5], [-0.75, 3.0]]],
};
/** Per pose: which legs, how much the spine bows (+ = toward the near side) and the head's tilt. */
const STANCE = {
  stand: ['even', 0.06, 0],
  point: ['step', 0.10, 0],
  think: ['even', -0.08, -6],
  present: ['step', 0.08, 0],
  type: ['even', 0.14, 4],
  shrug: ['even', 0, 0],
  raise: ['even', 0.05, 0],
  celebrate: ['apart', -0.05, 0],
};
/** Pose names for `kind: 'figure'` / WbFigure. */
export const FIGURE_POSES = Object.freeze(Object.keys(ARMS));
/** Face names — two eyes plus one mouth stroke each. */
export const FIGURE_FACES = Object.freeze(['neutral', 'happy', 'worried', 'surprised']);

/** The face inside a head of radius `hr` centred on (cx, cy). */
function sketchFace(cx, cy, hr, face, seed) {
  const r = rng(seed + 11);
  const ey = cy - hr * 0.14;
  const ex = hr * 0.34;
  const eye = (sx) => sketchLine([{ x: cx + sx, y: ey - hr * 0.13 }, { x: cx + sx, y: ey + hr * 0.13 }], seed + (sx < 0 ? 12 : 13));
  const my = cy + hr * 0.42;
  const mw = hr * 0.46;
  let mouth;
  if (face === 'happy') mouth = `M${f1(cx - mw)},${f1(my - hr * 0.1)} Q${f1(cx)},${f1(my + hr * 0.3)} ${f1(cx + mw)},${f1(my - hr * 0.1)}`;
  else if (face === 'worried') mouth = `M${f1(cx - mw)},${f1(my + hr * 0.16)} Q${f1(cx)},${f1(my - hr * 0.22)} ${f1(cx + mw)},${f1(my + hr * 0.16)}`;
  else if (face === 'surprised') mouth = sketchEllipse({ cx, cy: my + hr * 0.04, rx: hr * 0.19, ry: hr * 0.24 }, seed + 14);
  else mouth = sketchLine([{ x: cx - mw * 0.8, y: my }, { x: cx + mw * 0.8, y: my + jit(r, 1.2) }], seed + 15);
  return `${eye(-ex)} ${eye(ex)} ${mouth}`;
}

/**
 * Stick figure `h` px tall (head top to heel), (x, y) = the head's centre.
 * `pose` from FIGURE_POSES, `face` from FIGURE_FACES, `side` which way the near arm works.
 */
export function sketchFigure({ x, y, h = 320, pose = 'stand', face = 'neutral', side = 'right' }, seed) {
  const H = h / 7;
  const hr = H * 0.5;
  const dir = side === 'left' ? -1 : 1;
  const [legSet, bow, tilt] = STANCE[pose] || STANCE.stand;
  const arms = ARMS[pose] || ARMS.stand;
  const legs = LEGS[legSet];
  const neck = { x, y: y + hr * 1.08 };
  const shoulderY = y + H * 1.25;
  const hip = { x: x + H * bow * 1.4, y: y + H * 3.5 };
  const sw = H * 0.46;
  const hw = H * 0.30;

  const head = sketchEllipse({ cx: x, cy: y, rx: hr, ry: hr * 1.04 }, seed, 1.03);
  // spine: neck → hip through a point pushed sideways, so the body reads as a curve, not a post
  const spine = sketchLine([neck, { x: x + H * bow, y: (shoulderY + hip.y) / 2 }, hip], seed + 2);
  const shoulders = sketchLine([{ x: x - sw, y: shoulderY + H * 0.06 }, { x: x + sw, y: shoulderY - H * 0.06 }], seed + 3);

  const limb = (from, [e, hnd], i, hand) => {
    const elbow = { x: from.x + dir * e[0] * H, y: from.y + e[1] * H };
    const end = { x: from.x + dir * hnd[0] * H, y: from.y + hnd[1] * H };
    const stroke = sketchLine([from, elbow, end], seed + 20 + i);
    const cap = hand
      ? sketchEllipse({ cx: end.x, cy: end.y, rx: H * 0.12, ry: H * 0.12 }, seed + 30 + i)
      : sketchLine([end, { x: end.x + dir * (hnd[0] >= 0 ? 1 : -1) * H * 0.36, y: end.y + H * 0.02 }], seed + 30 + i);
    return `${stroke} ${cap}`;
  };
  const armParts = arms.map((a, i) => limb({ x: x + dir * sw * (i ? -1 : 1), y: shoulderY }, a, i, true));
  const legParts = legs.map((l, i) => limb({ x: hip.x + dir * hw * (i ? -1 : 1), y: hip.y }, l, i + 2, false));

  const body = `${head} ${sketchFace(x, y, hr, face, seed)} ${spine} ${shoulders} ${armParts.join(' ')} ${legParts.join(' ')}`;
  // tilt turns the whole figure a little about the hip — enough to read as a lean
  return tilt ? rotatePath(body, hip.x, hip.y, tilt * (side === 'left' ? -1 : 1)) : body;
}

/** Where the near hand lands for a pose — so a part can put a prop (doodle) in it. */
export function figureHand({ x, y, h = 320, pose = 'stand', side = 'right' }) {
  const H = h / 7;
  const dir = side === 'left' ? -1 : 1;
  const [, hnd] = (ARMS[pose] || ARMS.stand)[0];
  return { x: x + dir * (H * 0.46 + hnd[0] * H), y: y + H * 1.25 + hnd[1] * H };
}

/** Turn every coordinate pair in `d` by `deg` about (cx, cy). Only M / Q / L data — what sketch* emits. */
function rotatePath(d, cx, cy, deg) {
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, px, py) => {
    const dx = Number(px) - cx;
    const dy = Number(py) - cy;
    return `${f1(cx + dx * cos - dy * sin)},${f1(cy + dx * sin + dy * cos)}`;
  });
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
