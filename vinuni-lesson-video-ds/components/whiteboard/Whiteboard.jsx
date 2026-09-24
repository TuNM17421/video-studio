import React from 'react';
import { C, alpha } from '../../lib/tokens.js';
import { drawOn } from '../../lib/paths.js';
import { clamp01 } from '../../lib/motion.js';
import {
  handFace,
  handWidth,
  penOnPath,
  seedOf,
  sketchArrow,
  sketchCheck,
  sketchCloud,
  sketchCross,
  sketchEllipse,
  sketchFigure,
  sketchHachure,
  sketchTrail,
  sketchLine,
  sketchPerson,
  sketchRect,
  sketchUnderline,
} from './sketch.js';
import { sketchDoodle } from './doodles.js';
import { HAND_DEFAULT } from './handFonts.js';

/*
 * Whiteboard — one persistent board for a whole video (whiteboard style, lab).
 * Nothing is cut: every mark is drawn by the marker at its own frame and stays until an `erase` mark
 * wipes over it. A camera moves over the board (pan / zoom) so the board can be larger than the screen.
 *
 *   <Whiteboard frame={f} marks={MARKS} camera={CAMERA} />   inside a SceneFrame's SVG
 *
 * Marks (board coordinates, `at` / `dur` in video frames):
 *   { id, kind: 'text', at, dur?, x, y, text | lines, size?, color?, anchor?, lineHeight? }
 *   { id, kind: 'line' | 'arrow', at, dur?, points, color?, width?, dash? }
 *   { id, kind: 'box', at, dur?, x, y, w, h, color?, fill? }
 *   { id, kind: 'loop', at, dur?, cx, cy, rx, ry, color? }       circle something that matters
 *   { id, kind: 'underline', at, dur?, x1, x2, y, color? }
 *   { id, kind: 'person', at, dur?, x, y, s?, color? }            stick figure, (x, y) = head
 *   { id, kind: 'figure', at, dur?, x, y, h?, pose?, face?, side? } the presenter (7 heads, posed)
 *   { id, kind: 'check' | 'cross', at, dur?, x, y, s?, color? }
 *   { id, kind: 'highlight', at, dur?, x, y, w, h, color? }       marker swipe under text (drawn below)
 *   { id, kind: 'erase', at, dur?, x, y, w, h }                   wipes everything drawn before it
 * Common: `pen: false` draws without the marker (frames, guides); `opacity`.
 * Camera keys: [{ at, dur?, x, y, w }] — board point (x, y) moves to the screen's content centre
 * (960, 550) and `w` board units fill the 1920-px width. Zoom eases in log space.
 */

const INK = 5.5;
const SCREEN_CENTER = { x: 960, y: 550 };
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const markEnd = (m) => m.at + (m.dur ?? defaultDur(m));

/** Default drawing time in frames: writing ≈ 32 characters / s (sped-up marker), shapes by kind. */
export function defaultDur(m) {
  switch (m.kind) {
    case 'text': {
      const chars = (m.lines || [m.text]).join('').length;
      return Math.max(8, Math.round(chars * 0.95));
    }
    case 'person':
      return 22;
    case 'figure':
      return 34;
    case 'doodle':
      return Math.round(Math.min(40, Math.max(16, (m.size ?? 120) / 5)));
    case 'cloud':
      return 26;
    case 'trail':
      return 22;
    case 'box':
      return 14;
    case 'loop':
      return 14;
    case 'erase':
      return 36;
    case 'check':
    case 'cross':
      return 10;
    default:
      return 12;
  }
}

/** Linear progress of a mark at frame (0 before `at`, 1 once drawn). Markers move at an even pace. */
const progressOf = (m, frame) => clamp01((frame - m.at) / (m.dur ?? defaultDur(m)));

/** SVG path of a stroke mark (memoised per mark object). */
const pathCache = new WeakMap();
export function markPath(m) {
  let d = pathCache.get(m);
  if (d) return d;
  const seed = seedOf(m.id);
  switch (m.kind) {
    case 'line':
      d = sketchLine(m.points, seed);
      break;
    case 'arrow':
      d = sketchArrow(m.points, seed, m.head ?? 22);
      break;
    case 'box':
      d = sketchRect(m, seed);
      break;
    case 'loop':
      d = sketchEllipse(m, seed);
      break;
    case 'underline':
      d = sketchUnderline(m.x1, m.x2, m.y, seed);
      break;
    case 'person':
      d = sketchPerson(m, seed);
      break;
    case 'figure':
      d = sketchFigure(m, seed);
      break;
    case 'check':
      d = sketchCheck(m.x, m.y, m.s ?? 40, seed);
      break;
    case 'cross':
      d = sketchCross(m.x, m.y, m.s ?? 36, seed);
      break;
    case 'doodle':
      d = sketchDoodle(m, seed);
      break;
    case 'cloud':
      d = sketchCloud(m, seed);
      break;
    case 'trail':
      d = sketchTrail(m.points, seed);
      break;
    default:
      d = null;
  }
  pathCache.set(m, d);
  return d;
}

/** Lines of a text mark with their left edge and width (`font`: the board's default handwriting). */
function textLayout(m, font) {
  const size = m.size ?? 44;
  const lh = m.lineHeight ?? Math.round(size * 1.25);
  const lines = m.lines || [m.text];
  return lines.map((text, i) => {
    const w = handWidth(text, size, m.font ?? font);
    const anchor = m.anchor ?? 'start';
    const x0 = anchor === 'middle' ? m.x - w / 2 : anchor === 'end' ? m.x - w : m.x;
    return { text, w, x0, y: m.y + i * lh, size };
  });
}

/** Board-space box { x0, y0, x1, y1 } a mark covers — what checkBoard tests against the camera. */
export function markBounds(m, font) {
  const pad = (b, d) => ({ x0: b.x0 - d, y0: b.y0 - d, x1: b.x1 + d, y1: b.y1 + d });
  switch (m.kind) {
    case 'text': {
      const rows = textLayout(m, font);
      return {
        x0: Math.min(...rows.map((r) => r.x0)),
        x1: Math.max(...rows.map((r) => r.x0 + r.w)),
        y0: rows[0].y - rows[0].size * 0.95,
        y1: rows[rows.length - 1].y + rows[0].size * 0.3,
      };
    }
    case 'line':
    case 'arrow':
      return pad({
        x0: Math.min(...m.points.map((p) => p.x)),
        x1: Math.max(...m.points.map((p) => p.x)),
        y0: Math.min(...m.points.map((p) => p.y)),
        y1: Math.max(...m.points.map((p) => p.y)),
      }, m.kind === 'arrow' ? (m.head ?? 22) : 4);
    case 'loop':
      return { x0: m.cx - m.rx * 1.1, x1: m.cx + m.rx * 1.1, y0: m.cy - m.ry * 1.1, y1: m.cy + m.ry * 1.1 };
    case 'underline':
      return { x0: m.x1, x1: m.x2, y0: m.y - 6, y1: m.y + 6 };
    case 'person': {
      const s = m.s ?? 30;
      return { x0: m.x - s * 1.6, x1: m.x + s * 1.6, y0: m.y - s * 1.1, y1: m.y + s * 5.2 };
    }
    case 'figure': {
      const H = (m.h ?? 320) / 7;
      return { x0: m.x - H * 2.7, x1: m.x + H * 2.7, y0: m.y - H * 0.6, y1: m.y + H * 6.9 };
    }
    case 'check':
    case 'cross': {
      const s = m.s ?? 40;
      return { x0: m.x - s, x1: m.x + s, y0: m.y - s, y1: m.y + s * 0.6 };
    }
    case 'doodle': {
      const h = (m.size ?? 120) / 2 + 4;
      return { x0: m.x - h, x1: m.x + h, y0: m.y - h, y1: m.y + h };
    }
    case 'cloud':
      return { x0: m.x - m.w * 0.16, x1: m.x + m.w * 1.16, y0: m.y - m.h * 0.2, y1: m.y + m.h * 1.2 };
    case 'trail':
      return {
        x0: Math.min(...m.points.map((p) => p.x)) - 8,
        x1: Math.max(...m.points.map((p) => p.x)) + 8,
        y0: Math.min(...m.points.map((p) => p.y)) - 8,
        y1: Math.max(...m.points.map((p) => p.y)) + 8,
      };
    default:
      return { x0: m.x, y0: m.y, x1: m.x + (m.w ?? 0), y1: m.y + (m.h ?? 0) };
  }
}

/** Pen tip position while `m` is at progress t. */
function penAt(m, t, font) {
  if (m.kind === 'text') {
    const rows = textLayout(m, font);
    const total = rows.reduce((s, r) => s + r.w, 0) || 1;
    let left = t * total;
    for (const r of rows) {
      if (left <= r.w || r === rows[rows.length - 1]) {
        const k = Math.min(1, left / (r.w || 1));
        return { x: r.x0 + k * r.w, y: r.y - r.size * 0.3 + Math.sin(k * r.w * 0.09) * r.size * 0.14 };
      }
      left -= r.w;
    }
  }
  if (m.kind === 'highlight') return { x: m.x + t * m.w, y: m.y + m.h / 2 };
  const d = markPath(m);
  return d ? penOnPath(d, t) : null;
}

function TextMark({ m, t, font }) {
  const rows = textLayout(m, font);
  const face = handFace(m.font ?? font);
  const total = rows.reduce((s, r) => s + r.w, 0) || 1;
  let shown = t >= 1 ? Infinity : t * total;
  const color = m.color ?? C.text;
  // outline: hollow "bubble" lettering — the letter shapes stroked in ink, the board showing through
  const paint = m.outline
    ? { fill: C.bg, stroke: color, strokeWidth: Math.max(2.5, (m.size ?? 44) * 0.045), strokeLinejoin: 'round', paintOrder: 'stroke' }
    : { fill: color };
  return (
    <g {...paint} fontFamily={face.family} fontWeight={m.weight ?? face.weight} opacity={m.opacity}>
      {rows.map((r, i) => {
        const visible = Math.max(0, Math.min(r.w, shown));
        shown -= r.w;
        if (visible <= 0) return null;
        const clip = visible < r.w ? `wb-clip-${m.id}-${i}` : null;
        return (
          <g key={i}>
            {clip ? (
              <clipPath id={clip}>
                <rect x={r.x0 - r.size * 0.2} y={r.y - r.size * 1.3} width={visible + r.size * 0.2} height={r.size * 1.9} />
              </clipPath>
            ) : null}
            <text x={r.x0} y={r.y} fontSize={r.size} clipPath={clip ? `url(#${clip})` : undefined}>
              {r.text}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Clip shape for a filled mark: the box, the loop's ellipse, the cloud's own outline. */
function fillShape(m, d) {
  if (m.kind === 'box') return <rect x={m.x} y={m.y} width={m.w} height={m.h} />;
  if (m.kind === 'loop') return <ellipse cx={m.cx} cy={m.cy} rx={m.rx} ry={m.ry} />;
  return <path d={d} />;
}
const fillBox = (m) => (m.kind === 'loop' ? { x: m.cx - m.rx, y: m.cy - m.ry, w: m.rx * 2, h: m.ry * 2 } : m.kind === 'cloud' ? { x: m.x - m.w * 0.2, y: m.y - m.h * 0.2, w: m.w * 1.4, h: m.h * 1.4 } : m);

function StrokeMark({ m, t }) {
  const d = markPath(m);
  const color = m.color ?? C.text;
  // small doodles get a finer line, like a marker drawing small
  const width = m.width ?? (m.kind === 'doodle' ? Math.max(3, Math.min(INK, (m.size ?? 120) / 26)) : INK);
  const stroke = { d, fill: 'none', stroke: color, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const fillIn = clamp01((t - 0.6) / 0.4);
  let fill = null;
  if (m.fill && fillIn > 0) {
    const id = `wb-fill-${m.id}`;
    fill =
      m.fill === 'hachure' ? (
        <g opacity={fillIn}>
          <clipPath id={id}>{fillShape(m, d)}</clipPath>
          <path d={sketchHachure(fillBox(m), seedOf(m.id) + 3, { gap: m.hachureGap ?? 16 })} clipPath={`url(#${id})`} fill="none" stroke={m.hachureColor ?? color} strokeWidth={2.5} strokeLinecap="round" opacity={0.55} />
        </g>
      ) : m.kind === 'box' ? (
        <rect x={m.x} y={m.y} width={m.w} height={m.h} fill={m.fill} opacity={fillIn} />
      ) : (
        <g opacity={fillIn} fill={m.fill}>{fillShape(m, d)}</g>
      );
  }
  if (m.dash) {
    // A dashed stroke cannot also use the dash trick to draw on: a solid copy drawn on masks it instead.
    const id = `wb-dash-${m.id}`;
    return (
      <g opacity={m.opacity}>
        {fill}
        {t < 1 ? (
          <mask id={id} maskUnits="userSpaceOnUse">
            <path d={d} fill="none" stroke="#ffffff" strokeWidth={width + 8} strokeLinecap="round" {...drawOn(d, t)} />
          </mask>
        ) : null}
        <path {...stroke} strokeDasharray={m.dash} mask={t < 1 ? `url(#${id})` : undefined} />
      </g>
    );
  }
  return (
    <g opacity={m.opacity}>
      {fill}
      <path {...stroke} {...(t < 1 ? drawOn(d, t) : null)} />
    </g>
  );
}

function Highlight({ m, t }) {
  return <rect x={m.x} y={m.y} width={m.w * t} height={m.h} rx={m.h * 0.3} fill={m.color ?? C.redSoft} opacity={m.opacity ?? 0.95} />;
}

/** Board-coloured wipe with the eraser scrubbing along its leading edge. */
function Erase({ m, t, scale }) {
  const edge = m.x + m.w * t;
  const scrub = Math.sin(t * Math.PI * 7);
  const eh = Math.min(m.h * 0.4, 150 / scale);
  const ew = eh * 0.55;
  const ey = m.y + (m.h - eh) * (0.5 + 0.45 * scrub);
  return (
    <g>
      <rect x={m.x - 4} y={m.y - 4} width={m.w * t + 8} height={m.h + 8} fill={C.bg} />
      {t > 0 && t < 1 ? (
        <g transform={`translate(${edge - ew * 0.3} ${ey}) rotate(${6 * scrub})`}>
          <rect x={0} y={eh * 0.72} width={ew} height={eh * 0.28} rx={ew * 0.12} fill={C.dotInactive} />
          <rect x={0} y={0} width={ew} height={eh * 0.76} rx={ew * 0.18} fill={C.text} />
          <rect x={ew * 0.2} y={eh * 0.12} width={ew * 0.6} height={eh * 0.1} rx={ew * 0.05} fill={C.accent} />
        </g>
      ) : null}
    </g>
  );
}

/** The marker: tip at (0, 0), body up and to the right; cap band in the ink colour. */
function Marker({ x, y, color, scale, opacity }) {
  if (opacity <= 0.001) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${1 / scale}) rotate(-38)`} opacity={opacity < 1 ? opacity : undefined}>
      <ellipse cx={34} cy={16} rx={70} ry={10} fill={alpha('text', 0.08)} transform="rotate(38)" />
      <path d="M0,0 L10,-9 L10,9 Z" fill={color} />
      <path d="M10,-11 L30,-15 L30,15 L10,11 Z" fill={C.textMuted} />
      <rect x={30} y={-17} width={150} height={34} rx={8} fill={C.bg} stroke={C.text} strokeWidth={2.5} />
      <rect x={128} y={-17} width={52} height={34} rx={8} fill={color} />
      <rect x={52} y={-6} width={56} height={12} rx={4} fill={alpha('text', 0.12)} />
    </g>
  );
}

/** Where the camera looks at `frame`: { x, y, w } (board point at the screen's content centre, board units across). */
export function cameraAt(camera, frame) {
  if (!camera || !camera.length) return { x: SCREEN_CENTER.x, y: SCREEN_CENTER.y, w: 1920 };
  let prev = camera[0];
  let cur = camera[0];
  for (const k of camera) {
    if (k.at <= frame) {
      prev = cur;
      cur = k;
    }
  }
  if (cur === camera[0] || cur === prev) return { x: cur.x, y: cur.y, w: cur.w };
  const t = easeInOut(clamp01((frame - cur.at) / (cur.dur ?? 40)));
  return {
    x: prev.x + (cur.x - prev.x) * t,
    y: prev.y + (cur.y - prev.y) * t,
    w: Math.exp(Math.log(prev.w) + (Math.log(cur.w) - Math.log(prev.w)) * t),
  };
}

/** Where the marker is at `frame`: on the mark being drawn, travelling to the next one, or resting. */
function penState(marks, frame, font) {
  const drawn = marks.filter((m) => m.pen !== false && m.kind !== 'erase');
  let last = null;
  let next = null;
  for (const m of drawn) {
    if (frame >= m.at && frame < markEnd(m)) return { ...penAt(m, progressOf(m, frame), font), color: m.color ?? C.text, opacity: 1 };
    if (markEnd(m) <= frame && (!last || markEnd(m) > markEnd(last))) last = m;
    if (m.at > frame && (!next || m.at < next.at)) next = m;
  }
  const from = last ? penAt(last, 1, font) : null;
  const to = next ? penAt(next, 0, font) : null;
  const gap = last && next ? next.at - markEnd(last) : Infinity;
  if (from && to && gap <= 45) {
    const t = easeInOut(clamp01((frame - markEnd(last)) / gap));
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 30, color: next.color ?? C.text, opacity: 1 };
  }
  // Long pause: the marker lifts away after its last stroke and comes back just before the next one.
  if (next && next.at - frame <= 12) return { ...to, color: next.color ?? C.text, opacity: clamp01(1 - (next.at - frame) / 12) };
  if (from) return { ...from, color: last.color ?? C.text, opacity: clamp01(1 - (frame - markEnd(last)) / 12) };
  return null;
}

/** Screen point (1920 × 1080) of board point p at `frame`. */
export function toScreen(camera, frame, p) {
  const cam = cameraAt(camera, frame);
  const scale = 1920 / cam.w;
  return { x: SCREEN_CENTER.x + (p.x - cam.x) * scale, y: SCREEN_CENTER.y + (p.y - cam.y) * scale, scale };
}

export function Whiteboard({ frame, marks, camera, pen = true, font = HAND_DEFAULT }) {
  const cam = cameraAt(camera, frame);
  const scale = 1920 / cam.w;
  const tx = SCREEN_CENTER.x - cam.x * scale;
  const ty = SCREEN_CENTER.y - cam.y * scale;
  const visible = marks.filter((m) => frame >= m.at);
  // Highlights sit under the ink; everything else keeps its drawing order (an erase covers what came before).
  const under = visible.filter((m) => m.kind === 'highlight');
  const over = visible.filter((m) => m.kind !== 'highlight');
  const p = pen ? penState(marks, frame, font) : null;
  return (
    <g transform={`translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(5)})`}>
      {under.map((m) => (
        <Highlight key={m.id} m={m} t={progressOf(m, frame)} />
      ))}
      {over.map((m) => {
        const t = progressOf(m, frame);
        if (m.kind === 'text') return <TextMark key={m.id} m={m} t={t} font={font} />;
        if (m.kind === 'erase') return <Erase key={m.id} m={m} t={t} scale={scale} />;
        return <StrokeMark key={m.id} m={m} t={t} />;
      })}
      {p && p.x !== undefined ? <Marker x={p.x} y={p.y} color={p.color} scale={scale} opacity={p.opacity} /> : null}
    </g>
  );
}
