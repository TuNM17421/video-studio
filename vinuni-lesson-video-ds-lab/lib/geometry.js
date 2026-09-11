/**
 * Geometry helpers. Connectors are polylines; the drawn stroke and any moving point are
 * derived from the SAME points and the SAME traveled distance (the connector invariant).
 */

export const polylineLength = (points) => {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return length;
};

export const pointAtDistance = (points, distance) => {
  let remaining = Math.max(0, distance);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= seg) {
      const t = seg === 0 ? 1 : remaining / seg;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= seg;
  }
  return points[points.length - 1];
};

const r = (v) => Math.round(v * 100) / 100;

export const pathD = (points) => points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${r(p.x)} ${r(p.y)}`).join(' ');

/** Quadratic bezier sampled into a polyline (so Flow can travel it exactly). */
export function sampleQuadratic(a, c, b, steps = 32) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const m = 1 - t;
    out.push({ x: m * m * a.x + 2 * m * t * c.x + t * t * b.x, y: m * m * a.y + 2 * m * t * c.y + t * t * b.y });
  }
  return out;
}

/** Cubic bezier sampled into a polyline. */
export function sampleCubic(a, c1, c2, b, steps = 48) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const m = 1 - t;
    out.push({
      x: m * m * m * a.x + 3 * m * m * t * c1.x + 3 * m * t * t * c2.x + t * t * t * b.x,
      y: m * m * m * a.y + 3 * m * m * t * c1.y + 3 * m * t * t * c2.y + t * t * t * b.y,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ bounds & anchors */
export const expand = (b, pad) => ({ x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad });
export const contains = (b, p, pad = 0) =>
  p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + pad;
export const center = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** Named anchor on a card rectangle: connectors start/end here, never at eyeballed coordinates. */
export function anchor(b, side, t = 0.5) {
  switch (side) {
    case 'left':
      return { x: b.x, y: b.y + b.h * t };
    case 'right':
      return { x: b.x + b.w, y: b.y + b.h * t };
    case 'top':
      return { x: b.x + b.w * t, y: b.y };
    case 'bottom':
      return { x: b.x + b.w * t, y: b.y + b.h };
    default:
      return center(b);
  }
}

/* ------------------------------------------------------------------ text estimates
   Deterministic width estimate for Montserrat (no DOM measurement, like primitives/layout.ts). */
export function textWidth(str, size, weight = 700) {
  let em = 0;
  for (const ch of String(str)) {
    if (ch === ' ') em += 0.28;
    else if (/[0-9]/.test(ch)) em += 0.64;
    else if (/[.,:;'’!|·\-–]/.test(ch)) em += 0.32;
    else if (/[MW]/.test(ch)) em += 0.92;
    else if (/[mw]/.test(ch)) em += 0.84;
    else if (/[iIlj]/.test(ch)) em += 0.3;
    else if (ch !== ch.toLowerCase()) em += 0.72;
    else em += 0.58;
  }
  return em * size * (weight >= 700 ? 1 : 0.97);
}

/** Width of a Pill / tag holding `label` (text + 22 px padding each side). */
export const pillWidth = (label, size = 18) => Math.round(textWidth(label, size, 700) + 44);

/** Center a row of chips by estimated width (port of primitives/layout.ts layoutRow). */
export function layoutRow(labels, { gap = 20, size = 18, pad = 44, centerAt = 960 } = {}) {
  const widths = labels.map((l) => Math.round(textWidth(l, size, 700) + pad));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (labels.length - 1);
  let x = centerAt - total / 2;
  return labels.map((label, i) => {
    const w = widths[i];
    const item = { label, x, w, centerX: x + w / 2 };
    x += w + gap;
    return item;
  });
}
