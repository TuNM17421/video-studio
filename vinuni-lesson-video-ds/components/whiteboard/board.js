/**
 * createBoard — the authoring side of a whiteboard video (board.js in the video folder).
 *
 *   const b = createBoard({ timeline: TIMELINE, spokenAt });
 *   b.look(0, { x: 960, y: 550, w: 1920 });                     // first camera key
 *   b.draw(b.say(1, 'bắt đầu'), { id: 'q', kind: 'text', x: 960, y: 300, text: 'Bắt đầu từ đâu?' });
 *   b.boxText('tool', null, { x: 100, y: 400, w: 420, h: 120 }, 'Chọn công cụ');
 *   export const { marks: MARKS, camera: CAMERA, lag: LAG } = b;
 *
 * One marker: draw(at, mark) starts a mark at its beat or as soon as the previous stroke is done,
 * whichever is later (`at` null = right after it). Beats that run more than `lateAfter` frames late are
 * listed in `lag` — the check in tools/verify.mjs reports them. Ids must be unique (they seed the wobble).
 */
import { defaultDur, markBounds, toScreen } from './Whiteboard.jsx';
import { handWidth } from './sketch.js';

export function createBoard({ timeline, spokenAt, lateAfter = 12, gap = 2 }) {
  const marks = [];
  const camera = [];
  const lag = [];
  const ids = new Set();
  let penFree = 0;

  /** Video frame câu n starts. */
  const start = (n) => {
    const t = timeline[n - 1];
    if (!t) throw new Error(`board: no câu ${n} in the timeline`);
    return t.start;
  };
  /** Video frame a few frames before `phrase` is said in câu n (spokenAt is câu-local). */
  const say = (n, phrase, off = -6) => start(n) + Math.max(0, spokenAt(n, phrase) + off);
  const endOf = (m) => m.at + (m.dur ?? defaultDur(m));

  function draw(at, mark) {
    if (!mark.id) throw new Error('board: every mark needs an id');
    if (ids.has(mark.id)) throw new Error(`board: mark id "${mark.id}" is used twice (the id seeds the stroke)`);
    ids.add(mark.id);
    const want = at == null ? penFree : Math.round(at);
    const a = mark.pen === false ? want : Math.max(want, penFree);
    const m = { ...mark, at: a };
    if (m.pen !== false) penFree = a + (m.dur ?? defaultDur(m)) + gap;
    if (at != null && a - want > lateAfter) lag.push({ id: m.id, late: a - want });
    marks.push(m);
    return m;
  }

  /** Camera move starting at `frame`: board point (x, y) to the content centre, `w` board units across. */
  function look(frame, target, dur = 40) {
    camera.push({ at: Math.round(frame), dur, ...target });
  }

  /** Box, then its centred text straight after. Returns the text mark. */
  function boxText(id, at, b, text, { size = 46, color, fill, boxColor, dur } = {}) {
    const box = draw(at, { id: `${id}-box`, kind: 'box', x: b.x, y: b.y, w: b.w, h: b.h, color: boxColor, fill, dur });
    return draw(endOf(box), { id: `${id}-t`, kind: 'text', x: b.x + b.w / 2, y: b.y + b.h / 2 + size * 0.35, text, size, anchor: 'middle', color });
  }

  /** Clock doodle: face, then the hands (hour hand at `hour` o'clock). */
  function clock(id, at, cx, cy, r, hour) {
    draw(at, { id: `${id}-face`, kind: 'loop', cx, cy, rx: r, ry: r, dur: 14 });
    const a = ((hour / 12) * 360 - 90) * (Math.PI / 180);
    return draw(null, { id: `${id}-hands`, kind: 'line', points: [{ x: cx, y: cy - r * 0.72 }, { x: cx, y: cy }, { x: cx + Math.cos(a) * r * 0.5, y: cy + Math.sin(a) * r * 0.5 }], dur: 8 });
  }

  return { marks, camera, lag, start, say, draw, endOf, look, boxText, clock, textWidth: handWidth };
}

/** Screen area a drawn mark must stay in: below the eyebrow, above the caption bar. */
export const BOARD_SAFE = { x0: 0, y0: 110, x1: 1920, y1: 984 };

/**
 * Static checks of a finished board (tools/verify.mjs runs it on every video whose meta has `board`):
 *   problems — a mark drawn (at the end of its stroke) outside the visible screen area
 *   warnings — beats more than `lateWarn` frames late; board text under `minText` px on screen when written;
 *              marks drawn after the video ends
 */
export function checkBoard({ marks, camera, lag = [] }, { duration, lateWarn = 45, minText = 26, tolerance = 12 } = {}) {
  const problems = [];
  const warnings = [];
  for (const m of marks) {
    if (m.kind === 'erase') continue;
    const end = m.at + (m.dur ?? defaultDur(m));
    if (duration != null && end > duration) warnings.push(`${m.id} is still being drawn when the video ends (frame ${end} > ${duration})`);
    const b = markBounds(m);
    const a = toScreen(camera, end, { x: b.x0, y: b.y0 });
    const z = toScreen(camera, end, { x: b.x1, y: b.y1 });
    const off = a.x < BOARD_SAFE.x0 - tolerance || z.x > BOARD_SAFE.x1 + tolerance || a.y < BOARD_SAFE.y0 - tolerance || z.y > BOARD_SAFE.y1 + tolerance;
    if (off) problems.push(`${m.id} is drawn off screen at frame ${end} (screen box ${Math.round(a.x)},${Math.round(a.y)} – ${Math.round(z.x)},${Math.round(z.y)})`);
    if (m.kind === 'text') {
      const px = (m.size ?? 44) * a.scale;
      if (px < minText) warnings.push(`${m.id} is written at ${Math.round(px)} px on screen (< ${minText})`);
    }
  }
  for (const l of lag) if (l.late > lateWarn) warnings.push(`${l.id} starts ${l.late} frames after its beat`);
  return { problems, warnings };
}
