/**
 * Whiteboard parts — ready-made hand-drawn blocks, each a function that draws a whole group of marks on a
 * board in the order a presenter would draw them:
 *
 *   const b = createBoard({ timeline: TIMELINE, spokenAt });
 *   WbMindMap(b, 'map', b.say(3, 'ba câu hỏi'), { cx: 960, cy: 560, center: 'Ngày 2', branches: [
 *     { text: 'Cần cải thiện gì?', at: b.say(3, 'xác định việc') }, …] });
 *
 * Every part takes (board, id, at, options): `id` prefixes every mark id (use one id per use of a part),
 * `at` is the frame the first stroke starts (or null = right after the previous stroke). Items that carry
 * their own `at` start on that beat — sync them with `b.say(n, 'cụm từ')`. A part returns its last mark,
 * so `b.endOf(part)` is when it is finished. Coordinates are board units.
 * Numbers and labels come from the script — the parts never invent a value.
 */
import { C } from '../../lib/tokens.js';

const lineHeight = (size) => Math.round(size * 1.25);

/** Centred lines of text around (cx, cy): baseline of each row. */
function centredText(b, id, at, { cx, cy, lines, size, color, outline, weight }) {
  const lh = lineHeight(size);
  const y0 = cy - ((lines.length - 1) * lh) / 2 + size * 0.35;
  return b.draw(at, { id, kind: 'text', x: cx, y: y0, lines, size, lineHeight: lh, anchor: 'middle', color, outline, weight });
}

/** Big title in a puffy cloud — the topic of a section. `outline` hollow letters by default. */
export function WbTitleCloud(b, id, at, { x, y, w, h, text, lines, size = 110, color, fill, outline = true }) {
  b.draw(at, { id: `${id}-cloud`, kind: 'cloud', x, y, w, h, fill, color });
  return centredText(b, `${id}-t`, null, { cx: x + w / 2, cy: y + h / 2, lines: lines || [text], size, color, outline });
}

/** Sticky note: a sheet with a folded corner, an optional title and a few short lines. */
export function WbStickyNote(b, id, at, { x, y, w = 420, h = 300, title, lines = [], size = 40, color, fill = C.bgAlt }) {
  b.draw(at, { id: `${id}-sheet`, kind: 'box', x, y, w, h, fill });
  const fold = Math.min(56, w * 0.14);
  b.draw(null, { id: `${id}-fold`, kind: 'line', points: [{ x: x + w - fold, y: y + h }, { x: x + w - fold, y: y + h - fold }, { x: x + w, y: y + h - fold }], dur: 8 });
  let last = null;
  let top = y + 24;
  if (title) {
    last = b.draw(null, { id: `${id}-title`, kind: 'text', x: x + 30, y: top + size * 1.05, text: title, size: size * 1.1, weight: 700, color });
    top += size * 1.5;
  }
  lines.forEach((line, i) => {
    const item = typeof line === 'string' ? { text: line } : line;
    last = b.draw(item.at ?? null, { id: `${id}-l${i}`, kind: 'text', x: x + 30, y: top + size * 1.05 + i * lineHeight(size), text: item.text, size, color: item.color ?? color });
  });
  return last;
}

/** A stick figure saying (or thinking) something: person, then the bubble, then the words. */
export function WbSpeech(b, id, at, { x, y, s = 36, text, lines, side = 'right', thought = false, size = 40, color }) {
  const words = lines || [text];
  const tw = Math.max(...words.map((l) => b.textWidth(l, size)));
  // a thought cloud's puffs eat into its box, so it gets more room than a speech box
  const bw = thought ? tw * 1.3 + 90 : tw + 70;
  const bh = thought ? words.length * lineHeight(size) * 1.5 + 70 : words.length * lineHeight(size) + 44;
  const dir = side === 'left' ? -1 : 1;
  const bx = dir > 0 ? x + s * 1.8 : x - s * 1.8 - bw;
  const by = y - s * 1.6 - bh;
  b.draw(at, { id: `${id}-person`, kind: 'person', x, y, s });
  if (thought) {
    b.draw(null, { id: `${id}-cloud`, kind: 'cloud', x: bx, y: by, w: bw, h: bh });
    b.draw(null, { id: `${id}-dot1`, kind: 'loop', cx: x + dir * s * 1.4, cy: y - s * 1.3, rx: s * 0.18, ry: s * 0.18, dur: 6 });
    b.draw(null, { id: `${id}-dot2`, kind: 'loop', cx: x + dir * s * 1.9, cy: y - s * 1.9, rx: s * 0.28, ry: s * 0.28, dur: 6 });
  } else {
    b.draw(null, { id: `${id}-bubble`, kind: 'box', x: bx, y: by, w: bw, h: bh });
    const tailX = dir > 0 ? bx + 40 : bx + bw - 40;
    b.draw(null, { id: `${id}-tail`, kind: 'line', points: [{ x: tailX, y: by + bh }, { x: x + dir * s * 0.9, y: y - s * 1.1 }, { x: tailX + dir * 40, y: by + bh }], dur: 8 });
  }
  return centredText(b, `${id}-t`, null, { cx: bx + bw / 2, cy: by + bh / 2, lines: words, size, color });
}

/** Steps in boxes joined by arrows, in a row or a column. Items: { text, at?, color? }. */
export function WbFlow(b, id, at, { x, y, items, w = 280, h = 110, gap = 100, direction = 'row', size = 42, color = C.accent }) {
  let last = null;
  items.forEach((item, i) => {
    const bx = direction === 'row' ? x + i * (w + gap) : x;
    const by = direction === 'row' ? y : y + i * (h + gap);
    const start = i === 0 ? item.at ?? at : item.at ?? null;
    if (i > 0) {
      const pts = direction === 'row'
        ? [{ x: bx - gap + 12, y: by + h / 2 }, { x: bx - 12, y: by + h / 2 }]
        : [{ x: bx + w / 2, y: by - gap + 12 }, { x: bx + w / 2, y: by - 12 }];
      b.draw(start, { id: `${id}-a${i}`, kind: 'arrow', points: pts, color, dur: 10 });
    }
    last = b.boxText(`${id}-s${i}`, i > 0 ? null : start, { x: bx, y: by, w, h }, item.text, { size, color: item.color });
  });
  return last;
}

/** Steps around a loop with curved arrows between them — a cycle that repeats. Items: { text, at? }. */
export function WbCycle(b, id, at, { cx, cy, r = 250, items, size = 40, color = C.accent }) {
  const n = items.length;
  const angle = (i) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  const pos = (i, rr = r) => ({ x: cx + Math.cos(angle(i)) * rr, y: cy + Math.sin(angle(i)) * rr * 0.72 });
  let last = null;
  items.forEach((item, i) => {
    const p = pos(i);
    last = b.draw(i === 0 ? item.at ?? at : item.at ?? null, { id: `${id}-t${i}`, kind: 'text', x: p.x, y: p.y + size * 0.35, text: item.text, size, anchor: 'middle', color: item.color });
    // arc to the next item, leaving room around both labels
    const span = (Math.PI * 2) / n;
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const a = angle(i) + span * (0.28 + (0.44 * k) / 6);
      pts.push({ x: cx + Math.cos(a) * r * 1.08, y: cy + Math.sin(a) * r * 1.08 * 0.72 });
    }
    last = b.draw(null, { id: `${id}-a${i}`, kind: 'arrow', points: pts, color, dur: 12, head: 18 });
  });
  return last;
}

/** A central idea in a cloud with branches around it. Branches: { text, doodle?, at?, color? }. */
export function WbMindMap(b, id, at, { cx, cy, center, branches, rx = 620, ry = 300, size = 40, centerSize = 64, color = C.accent }) {
  const cw = b.textWidth(center, centerSize) + 120;
  const ch = centerSize * 2.4;
  WbTitleCloud(b, `${id}-c`, at, { x: cx - cw / 2, y: cy - ch / 2, w: cw, h: ch, text: center, size: centerSize, outline: false });
  let last = null;
  branches.forEach((br, i) => {
    const a = -Math.PI / 2 + ((i + 0.5) / branches.length) * Math.PI * 2;
    const tx = cx + Math.cos(a) * rx;
    const ty = cy + Math.sin(a) * ry;
    const from = { x: cx + Math.cos(a) * (cw / 2 + 10), y: cy + Math.sin(a) * (ch / 2 + 10) };
    const to = { x: tx - Math.cos(a) * 60, y: ty - Math.sin(a) * 50 };
    b.draw(br.at ?? null, { id: `${id}-l${i}`, kind: 'line', points: [from, { x: (from.x + to.x) / 2 + 12, y: (from.y + to.y) / 2 - 12 }, to], color, dur: 10 });
    if (br.doodle) b.draw(null, { id: `${id}-d${i}`, kind: 'doodle', name: br.doodle, x: tx, y: ty - size * 1.5, size: size * 2, color: br.color });
    last = b.draw(null, { id: `${id}-t${i}`, kind: 'text', x: tx, y: ty + size * 0.35, text: br.text, size, anchor: 'middle', color: br.color });
  });
  return last;
}

/** Checklist: a box per item, the text, then a tick (ok: true) or a cross (ok: false) if given. */
export function WbChecklist(b, id, at, { x, y, items, size = 44, gap }) {
  const step = gap ?? Math.round(size * 1.9);
  let last = null;
  items.forEach((item, i) => {
    const by = y + i * step;
    const s = size * 0.95;
    b.draw(i === 0 ? item.at ?? at : item.at ?? null, { id: `${id}-b${i}`, kind: 'box', x, y: by, w: s, h: s, dur: 8 });
    last = b.draw(null, { id: `${id}-t${i}`, kind: 'text', x: x + s + 26, y: by + s * 0.82, text: item.text, size, color: item.color });
    if (item.ok === true) last = b.draw(null, { id: `${id}-k${i}`, kind: 'check', x: x + s * 0.42, y: by + s * 0.78, s: s * 1.05, color: C.red });
    if (item.ok === false) last = b.draw(null, { id: `${id}-k${i}`, kind: 'cross', x: x + s / 2, y: by + s / 2, s: s * 0.8, color: C.red });
  });
  return last;
}

/** Two options side by side: titles, a few lines each, a dashed divider and the word between them. */
export function WbCompare(b, id, at, { x, y, w = 1400, h = 520, left, right, vs = 'hay', size = 42, color = C.text }) {
  const half = w / 2;
  // the right column steps in past the circled word between the columns
  const indent = (key) => (key === 'r' && vs ? b.textWidth(vs, size) / 2 + 80 : 40);
  const side = (key, s, ox, start) => {
    const tw = b.textWidth(s.title, size * 1.2);
    b.draw(start, { id: `${id}-${key}-title`, kind: 'text', x: ox + half / 2, y: y + size * 1.2, text: s.title, size: size * 1.2, anchor: 'middle', color: s.color ?? color, weight: 700 });
    b.draw(null, { id: `${id}-${key}-u`, kind: 'underline', x1: ox + half / 2 - tw / 2, x2: ox + half / 2 + tw / 2, y: y + size * 1.55, color: s.color ?? C.accent });
    let last = null;
    (s.lines || []).forEach((line, i) => {
      const item = typeof line === 'string' ? { text: line } : line;
      last = b.draw(item.at ?? null, { id: `${id}-${key}-l${i}`, kind: 'text', x: ox + indent(key), y: y + size * 3 + i * lineHeight(size) * 1.2, text: `• ${item.text}`, size });
    });
    return last;
  };
  side('l', left, x, left.at ?? at);
  b.draw(null, { id: `${id}-div`, kind: 'line', points: [{ x: x + half, y: y + 10 }, { x: x + half, y: y + h }], color: C.dotInactive, width: 4, dash: '14 14', pen: false, dur: 16 });
  if (vs) {
    // level with the middle of the bullet lines, not the middle of the frame
    const n = Math.max((left.lines || []).length, (right.lines || []).length, 1);
    const vy = y + size * 3 + ((n - 1) * lineHeight(size) * 1.2) / 2 - size * 0.35;
    b.draw(right.at ?? null, { id: `${id}-vs`, kind: 'text', x: x + half, y: vy + size * 0.35, text: vs, size, anchor: 'middle', color: C.red });
    b.draw(null, { id: `${id}-vs-loop`, kind: 'loop', cx: x + half, cy: vy, rx: b.textWidth(vs, size) / 2 + 30, ry: size * 0.9, color: C.red, dur: 10 });
  }
  return side('r', right, x + half, vs ? null : right.at ?? null);
}

/** Timeline: an arrow across, a tick per item, labels alternating above and below. Items: { label, sub?, at? }. */
export function WbTimeline(b, id, at, { x, y, w = 1500, items, size = 38, color = C.accent }) {
  b.draw(at, { id: `${id}-axis`, kind: 'arrow', points: [{ x, y }, { x: x + w / 2, y: y - 4 }, { x: x + w, y }], color, width: 6, head: 26, dur: 16 });
  let last = null;
  items.forEach((item, i) => {
    const tx = x + ((i + 0.5) / items.length) * (w - 40);
    const up = i % 2 === 0;
    b.draw(item.at ?? null, { id: `${id}-tick${i}`, kind: 'loop', cx: tx, cy: y, rx: 12, ry: 12, color: C.red, dur: 6 });
    last = b.draw(null, { id: `${id}-t${i}`, kind: 'text', x: tx, y: up ? y - 34 : y + 34 + size, text: item.label, size, anchor: 'middle', weight: 700 });
    if (item.sub) last = b.draw(null, { id: `${id}-s${i}`, kind: 'text', x: tx, y: up ? y - 34 - lineHeight(size) : y + 34 + size + lineHeight(size * 0.85), text: item.sub, size: size * 0.85, anchor: 'middle', color: C.textMuted });
  });
  return last;
}

/**
 * Bar chart with hachure bars. Bars: { label, value, shown?, at?, highlight? } — `value` sets the height,
 * `shown` the text written over the bar (only numbers the script gives; leave it out otherwise).
 */
export function WbBarChart(b, id, at, { x, y, w = 900, h = 520, bars, max, size = 36 }) {
  const top = max ?? Math.max(...bars.map((bar) => bar.value));
  b.draw(at, { id: `${id}-axes`, kind: 'line', points: [{ x, y }, { x, y: y + h }, { x: x + w, y: y + h }], dur: 12 });
  const slot = w / bars.length;
  let last = null;
  bars.forEach((bar, i) => {
    const bh = (bar.value / top) * (h - 40);
    const bx = x + i * slot + slot * 0.2;
    const color = bar.highlight ? C.red : C.accent;
    b.draw(bar.at ?? null, { id: `${id}-bar${i}`, kind: 'box', x: bx, y: y + h - bh, w: slot * 0.6, h: bh, color, fill: 'hachure', dur: 10 });
    last = b.draw(null, { id: `${id}-l${i}`, kind: 'text', x: bx + slot * 0.3, y: y + h + size * 1.3, text: bar.label, size, anchor: 'middle' });
    if (bar.shown != null) last = b.draw(null, { id: `${id}-v${i}`, kind: 'text', x: bx + slot * 0.3, y: y + h - bh - 14, text: String(bar.shown), size, anchor: 'middle', color });
  });
  return last;
}

/** One doodle with a caption under it — an icon card, hand-drawn. */
export function WbIconLabel(b, id, at, { x, y, doodle, size = 150, label, labelSize = 40, color, labelColor }) {
  let last = b.draw(at, { id: `${id}-d`, kind: 'doodle', name: doodle, x, y, size, color });
  if (label) last = b.draw(null, { id: `${id}-t`, kind: 'text', x, y: y + size / 2 + labelSize * 1.2, text: label, size: labelSize, anchor: 'middle', color: labelColor });
  return last;
}

/** Light bulb with rays — "an idea". Optional label under it. */
export function WbIdea(b, id, at, { x, y, size = 180, label, labelSize = 44, color }) {
  b.draw(at, { id: `${id}-bulb`, kind: 'doodle', name: 'lightbulb', x, y, size, color });
  const cy = y - size * 0.18;
  [-70, -35, 0, 35, 70].forEach((deg, i) => {
    const a = ((deg - 90) * Math.PI) / 180;
    const r0 = size * 0.5;
    const r1 = size * 0.68;
    b.draw(null, { id: `${id}-ray${i}`, kind: 'line', points: [{ x: x + Math.cos(a) * r0, y: cy + Math.sin(a) * r0 }, { x: x + Math.cos(a) * r1, y: cy + Math.sin(a) * r1 }], color: C.red, width: 4, dur: 4 });
  });
  if (!label) return b.marks[b.marks.length - 1];
  return b.draw(null, { id: `${id}-t`, kind: 'text', x, y: y + size / 2 + labelSize * 1.2, text: label, size: labelSize, anchor: 'middle', color });
}

/**
 * Ảnh tư liệu trong khung polaroid vẽ tay: khung ngoài, ô ảnh, chú thích ở dải trắng dưới.
 * Ô ảnh để trống thì tô gạch chéo; `doodle` vẽ một hình vào giữa ô thay cho ảnh thật.
 */
export function WbPhotoFrame(b, id, at, { x, y, w = 360, h = 420, caption, doodle, size = 34, color, fill = 'hachure' }) {
  const pad = Math.round(w * 0.07);
  const strip = Math.round(h * 0.2); // dải trắng dưới ảnh, chỗ viết chú thích
  const ih = h - pad * 2 - strip;
  b.draw(at, { id: `${id}-frame`, kind: 'box', x, y, w, h, color });
  b.draw(null, { id: `${id}-photo`, kind: 'box', x: x + pad, y: y + pad, w: w - pad * 2, h: ih, fill: doodle ? undefined : fill, color });
  let last = b.marks[b.marks.length - 1];
  if (doodle) last = b.draw(null, { id: `${id}-d`, kind: 'doodle', name: doodle, x: x + w / 2, y: y + pad + ih / 2, size: Math.min(w - pad * 4, ih - pad * 2), color });
  if (!caption) return last;
  return centredText(b, `${id}-cap`, null, { cx: x + w / 2, cy: y + h - pad - strip / 2, lines: [caption], size, color });
}

/** Hand-drawn table: frame, rules, then the cells row by row. rows[0] is the header when `header`. */
export function WbTable(b, id, at, { x, y, colW, rowH = 84, rows: cells, header = true, size = 36 }) {
  const w = colW.reduce((s, c) => s + c, 0);
  const h = rowH * cells.length;
  b.draw(at, { id: `${id}-frame`, kind: 'box', x, y, w, h, dur: 14 });
  for (let r = 1; r < cells.length; r++) b.draw(null, { id: `${id}-r${r}`, kind: 'line', points: [{ x, y: y + r * rowH }, { x: x + w, y: y + r * rowH }], width: r === 1 && header ? 5 : 3, dur: 6 });
  let cx = x;
  colW.slice(0, -1).forEach((c, i) => {
    cx += c;
    b.draw(null, { id: `${id}-c${i}`, kind: 'line', points: [{ x: cx, y }, { x: cx, y: y + h }], width: 3, dur: 6 });
  });
  let last = null;
  cells.forEach((row, r) => {
    let ox = x;
    row.forEach((cell, c) => {
      const item = typeof cell === 'string' ? { text: cell } : cell;
      if (item.text) {
        last = b.draw(item.at ?? null, { id: `${id}-${r}-${c}`, kind: 'text', x: ox + 24, y: y + r * rowH + rowH / 2 + size * 0.35, text: item.text, size, weight: r === 0 && header ? 700 : undefined, color: r === 0 && header ? C.accent : item.color });
      }
      ox += colW[c];
    });
  });
  return last;
}

/** A paper plane flying from `from` to `to` along a dashed curve. */
export function WbFlight(b, id, at, { from, to, bend = 140, size = 80, color }) {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - bend };
  b.draw(at, { id: `${id}-trail`, kind: 'trail', points: [from, mid, to], dash: '14 14', width: 4, color });
  const a = (Math.atan2(to.y - mid.y, to.x - mid.x) * 180) / Math.PI;
  // Lucide's paper plane points up-right (−45°): turn it to the flight direction
  return b.draw(null, { id: `${id}-plane`, kind: 'doodle', name: 'paper-plane', x: to.x + Math.cos((a * Math.PI) / 180) * size * 0.4, y: to.y + Math.sin((a * Math.PI) / 180) * size * 0.4, size, rotate: a + 45, color });
}

/** Staircase of steps rising left to right, a label on each step and a flag on top. Items: { text, at? }. */
export function WbSteps(b, id, at, { x, y, items, stepW = 300, stepH = 110, size = 38, color }) {
  const pts = [{ x, y }];
  items.forEach((_, i) => {
    pts.push({ x: x + i * stepW, y: y - i * stepH }, { x: x + (i + 1) * stepW, y: y - i * stepH });
    if (i < items.length - 1) pts.push({ x: x + (i + 1) * stepW, y: y - (i + 1) * stepH });
  });
  b.draw(at, { id: `${id}-stairs`, kind: 'line', points: pts.slice(1), color, dur: 18 });
  let last = null;
  items.forEach((item, i) => {
    last = b.draw(item.at ?? null, { id: `${id}-t${i}`, kind: 'text', x: x + i * stepW + stepW / 2, y: y - i * stepH - 22, text: item.text, size, anchor: 'middle', color: item.color });
  });
  const n = items.length;
  return b.draw(null, { id: `${id}-flag`, kind: 'doodle', name: 'flag', x: x + n * stepW - 30, y: y - (n - 1) * stepH - 110, size: 90, color: C.red });
}

/** Catalog for docs, previews and the Studio library: name → one-line purpose. */
export const WB_PARTS = Object.freeze({
  WbTitleCloud: 'Tiêu đề lớn trong đám mây (chữ viền rỗng)',
  WbStickyNote: 'Tờ ghi chú gập góc: tiêu đề + vài dòng',
  WbSpeech: 'Người que nói hoặc nghĩ một câu',
  WbFlow: 'Các bước trong ô nối bằng mũi tên (hàng / cột)',
  WbCycle: 'Vòng lặp các bước với mũi tên cong',
  WbMindMap: 'Sơ đồ tư duy: ý chính trong mây, nhánh xung quanh',
  WbChecklist: 'Danh sách ô vuông với tick / gạch',
  WbCompare: 'Hai lựa chọn cạnh nhau, chữ "hay" ở giữa',
  WbTimeline: 'Trục thời gian, mốc xen kẽ trên / dưới',
  WbBarChart: 'Biểu đồ cột tô gạch chéo (chỉ số liệu kịch bản có)',
  WbIconLabel: 'Một hình vẽ tay + chú thích',
  WbIdea: 'Bóng đèn tỏa sáng — một ý tưởng',
  WbTable: 'Bảng kẻ tay, hàng tiêu đề',
  WbPhotoFrame: 'Ảnh tư liệu trong khung polaroid vẽ tay',
  WbFlight: 'Máy bay giấy bay theo đường nét đứt',
  WbSteps: 'Bậc thang đi lên, cờ ở đỉnh',
});
