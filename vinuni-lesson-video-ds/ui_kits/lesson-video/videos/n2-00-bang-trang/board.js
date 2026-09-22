import { C, alpha } from '../../../../lib/tokens.js';
import { createBoard } from '../../../../components/whiteboard/board.js';
import { spokenAt } from './cues.js';
import { TIMELINE } from './timeline.js';

/*
 * The board of N2-00 (whiteboard): every mark the marker draws, and where the camera looks.
 *
 * Board layout (board units; 1920 = the screen width at zoom 1):
 *   header row  y 0–700     câu 01–02 hook in the middle, erased in câu 03 for the day map:
 *                           three questions (label y 170, question y 400) — câu 16 adds the closing
 *                           question under each (y 640)
 *   part panels 1760 × 760  columns x 0 / 1960 / 3920 (one per question), rows y 800 / 1760;
 *                           part 1–2 in column 1, 3–4 in column 2, 5–6 in column 3.
 *                           Left half = the first câu of the part, right half = the second.
 * createBoard (components/whiteboard/board.js) runs the single marker: a mark starts at its beat or when
 * the previous stroke is done, whichever is later; LAG lists beats that ran late.
 */

const board = createBoard({ timeline: TIMELINE, spokenAt });
const { start, say, draw, endOf, look, boxText, clock, textWidth: handWidth } = board;
export const { marks: MARKS, camera: CAMERA, lag: LAG } = board;

// ── geometry ──────────────────────────────────────────────────────────────────────────────────────
const PX = [0, 1960, 3920];
const PY = [800, 1760];
const PW = 1760;
const PH = 760;
const CX = PX.map((x) => x + PW / 2);
const HX = CX[1];
const panelOf = (p) => ({ x: PX[Math.floor((p - 1) / 2)], y: PY[(p - 1) % 2] });
const panelCenter = (p) => ({ x: panelOf(p).x + PW / 2, y: panelOf(p).y + PH / 2 });
/** Board point from panel-local coordinates. */
const at = (p, x, y) => ({ x: panelOf(p).x + x, y: panelOf(p).y + y });
const rect = (p, x, y, w, h) => ({ ...at(p, x, y), w, h });

const ZONES = [
  { label: 'XÁC ĐỊNH VIỆC', question: 'Cần cải thiện gì?', closing: 'Cần AI?' },
  { label: 'CHỌN CÁCH', question: 'Làm thế nào?', closing: 'Làm thay hay hỗ trợ?' },
  { label: 'KIỂM TRA ĐIỀU KIỆN', question: 'Đã sẵn sàng chưa?', closing: 'Tiếp, thêm hay dừng?' },
];
const Q_SIZE = 170;
const Q_Y = 400;

const FULL = { x: HX, y: 1170, w: 6600 };
look(0, { x: HX, y: 380, w: 1920 });

/** Part header: red loop + number, then the title. */
function partTitle(p, frame, title) {
  const n = draw(frame, { id: `p${p}-num`, kind: 'text', ...at(p, 62, 84), text: String(p), size: 60, color: C.red, anchor: 'middle' });
  draw(endOf(n), { id: `p${p}-loop`, kind: 'loop', cx: at(p, 62, 0).x, cy: at(p, 0, 64).y, rx: 42, ry: 42, color: C.red, dur: 12 });
  const t = draw(null, { id: `p${p}-title`, kind: 'text', ...at(p, 130, 86), text: title, size: 56, dur: Math.round(title.length * 0.6) });
  draw(t.at, { id: `p${p}-divider`, kind: 'line', points: [at(p, 880, 170), at(p, 880, 720)], color: C.dotInactive, width: 4, pen: false, dash: '14 14', dur: 20 });
}

/** Column entry for parts 3 and 5: pull back to show the column's question, underline it, push in. */
function enterColumn(k, p, n) {
  look(start(n), { x: CX[k], y: 900, w: 3600 }, 20);
  const w = handWidth(ZONES[k].question, Q_SIZE);
  draw(start(n) + 14, { id: `h${k}-under`, kind: 'underline', x1: CX[k] - w / 2, x2: CX[k] + w / 2, y: Q_Y + 50, color: C.red, width: 10, dur: 12 });
  look(start(n) + 30, { ...panelCenter(p), w: 1920 }, 28);
}

// ── câu 01 · hook: a vague request, two equal options ─────────────────────────────────────────────
draw(4, { id: 'hook-q', kind: 'text', x: HX, y: 70, text: 'Bắt đầu từ đâu?', size: 96, color: C.red, anchor: 'middle' });
draw(say(1, 'Nếu được nhờ', 20), { id: 'hook-person', kind: 'person', x: HX - 760, y: 420, s: 42 });
draw(say(1, 'làm một trợ lý', -4), { id: 'hook-tail', kind: 'line', points: [{ x: HX - 600, y: 352 }, { x: HX - 680, y: 400 }], dur: 6 });
boxText('hook-req', null, { x: HX - 660, y: 230, w: 520, h: 124 }, '“Làm một trợ lý AI”', { size: 46 });
draw(say(1, 'chọn công cụ', -16), { id: 'hook-a1', kind: 'arrow', points: [{ x: HX - 120, y: 280 }, { x: HX + 40, y: 262 }, { x: HX + 196, y: 266 }], color: C.accent });
boxText('hook-tool', null, { x: HX + 220, y: 200, w: 480, h: 130 }, 'Chọn công cụ', { size: 54 });
draw(say(1, 'hay', -2), { id: 'hook-or', kind: 'text', x: HX + 460, y: 416, text: 'hay', size: 46, color: C.red, anchor: 'middle' });
draw(say(1, 'tìm hiểu', -10), { id: 'hook-a2', kind: 'arrow', points: [{ x: HX - 120, y: 310 }, { x: HX + 40, y: 470 }, { x: HX + 196, y: 530 }], color: C.accent });
boxText('hook-need', null, { x: HX + 220, y: 470, w: 480, h: 130 }, 'Hiểu khó khăn', { size: 54 });

// ── câu 02 · clarify the problem first, technology after ──────────────────────────────────────────
draw(say(2, 'Chào bạn', 0), { id: 'day-title', kind: 'text', x: HX - 900, y: 740, text: 'Ngày 2: làm rõ vấn đề trước', size: 60 });
draw(say(2, 'làm rõ vấn đề', 0), { id: 'need-loop', kind: 'loop', cx: HX + 460, cy: 540, rx: 290, ry: 84, color: C.red });
draw(null, { id: 'need-first', kind: 'text', x: HX + 780, y: 552, text: 'trước', size: 52, color: C.red });
draw(say(2, 'dùng công nghệ', 0), { id: 'tool-later', kind: 'text', x: HX + 780, y: 282, text: 'sau', size: 52, color: C.textMuted });

// ── câu 03 · wipe, then the day map: three questions across the board ─────────────────────────────
draw(start(3) + 2, { id: 'wipe-hook', kind: 'erase', x: HX - 960, y: -90, w: 1920, h: 900, dur: 32 });
look(start(3) + 12, FULL, 40);
for (let p = 1; p <= 6; p++) {
  const r = rect(p, 0, 0, PW, PH);
  draw(start(3) + 40 + p * 4, { id: `frame-${p}`, kind: 'box', ...r, color: alpha('accent', 0.35), width: 6, dash: '18 16', pen: false, dur: 20 });
}
const QUESTION_PHRASE = ['xác định việc', 'chọn cách giải quyết', 'kiểm tra xem'];
ZONES.forEach((z, k) => {
  if (k > 0) {
    const w0 = handWidth(ZONES[k - 1].question, Q_SIZE) / 2;
    const w1 = handWidth(z.question, Q_SIZE) / 2;
    draw(say(3, QUESTION_PHRASE[k], -24), { id: `h${k}-arrow`, kind: 'arrow', points: [{ x: CX[k - 1] + w0 + 40, y: Q_Y - 50 }, { x: CX[k] - w1 - 40, y: Q_Y - 50 }], color: C.accent, width: 10, head: 50 });
  }
  draw(say(3, QUESTION_PHRASE[k], -8), { id: `h${k}-label`, kind: 'text', x: CX[k], y: 170, text: z.label, size: 100, color: C.accent, anchor: 'middle' });
  draw(null, { id: `h${k}-q`, kind: 'text', x: CX[k], y: Q_Y, text: z.question, size: Q_SIZE, anchor: 'middle' });
});

// ── câu 04–05 · part 1: the difficulty behind the request ─────────────────────────────────────────
{
  const w = handWidth(ZONES[0].question, Q_SIZE);
  draw(start(4) + 2, { id: 'h0-under', kind: 'underline', x1: CX[0] - w / 2, x2: CX[0] + w / 2, y: Q_Y + 50, color: C.red, width: 10, dur: 14 });
  look(start(4) + 18, { ...panelCenter(1), w: 1920 }, 36);
}
partTitle(1, start(4) + 44, 'Tìm khó khăn đằng sau lời đề nghị');
draw(say(4, 'khó khăn thật sự'), { id: 'p1-real', kind: 'text', ...at(1, 440, 640), text: 'Khó khăn thật sự?', size: 56, color: C.red, anchor: 'middle' });
boxText('p1-req', say(4, 'một đề nghị'), rect(1, 90, 220, 700, 120), '“Làm trợ lý hỗ trợ học viên”', { size: 46 });
draw(say(4, 'học viên', 4), { id: 'p1-behind', kind: 'arrow', points: [at(1, 440, 350), at(1, 452, 440), at(1, 440, 560)], color: C.accent });
draw(null, { id: 'p1-behind-t', kind: 'text', ...at(1, 480, 474), text: 'đằng sau', size: 40, color: C.accent });

draw(say(5, 'một học viên'), { id: 'p1-learner', kind: 'person', ...at(1, 990, 300), s: 32, dur: 24 });
draw(null, { id: 'p1-learner-t', kind: 'text', ...at(1, 990, 520), text: 'Học viên', size: 38, anchor: 'middle' });
[0, 1, 2].forEach((i) => {
  boxText(`p1-page${i + 1}`, say(5, 'tìm hướng dẫn', -4), rect(1, 1100 + i * 150, 250, 110, 140), String(i + 1), { size: 44, dur: 10 });
});
draw(say(5, 'quan sát'), { id: 'p1-observer', kind: 'person', ...at(1, 1650, 300), s: 32, dur: 24 });
draw(say(5, 'tìm ở đâu', -2), { id: 'p1-where', kind: 'loop', cx: at(1, 1305, 0).x, cy: at(1, 0, 320).y, rx: 260, ry: 115, color: C.red });
boxText('p1-ask', say(5, 'hỏi bước nào'), rect(1, 1000, 590, 680, 104), '“Bước nào mất thời gian?”', { size: 44, color: C.red });

// ── câu 06–07 · part 2: who, which step, what it costs · measure ──────────────────────────────────
look(start(6), { ...panelCenter(2), w: 1920 }, 32);
partTitle(2, start(6) + 8, 'Viết rõ người, việc và ảnh hưởng');
draw(say(6, 'viết rõ', -2), { id: 'p2-sheet', kind: 'box', ...rect(2, 70, 180, 740, 540), fill: C.bgAlt, dur: 16 });
[
  ['ai đang gặp khó', 'Ai gặp khó?'],
  ['vướng ở bước nào', 'Vướng ở bước nào?'],
  ['chậm trễ hoặc sai sót', 'Chậm trễ hay sai sót gì?'],
].forEach(([phrase, text], i) => {
  const y = 290 + i * 160;
  draw(say(6, phrase), { id: `p2-row${i}`, kind: 'text', ...at(2, 120, y), text, size: 48 });
  draw(null, { id: `p2-blank${i}`, kind: 'line', points: [at(2, 120, y + 58), at(2, 760, y + 58)], color: C.accent, width: 4, dash: '10 12', dur: 10 });
});

const clocks = [
  ['hiện nay', 'Hiện nay', 4],
  ['chọn thời gian', 'Mục tiêu', 2],
  ['đo lại', 'Đo lại', 3],
];
clocks.forEach(([phrase, label, hour], i) => {
  const cx = 1040 + i * 290;
  if (i > 0) draw(say(7, phrase, -14), { id: `p2-step${i}`, kind: 'arrow', points: [at(2, cx - 205, 380), at(2, cx - 95, 380)], color: C.accent });
  clock(`p2-clock${i}`, say(7, phrase), at(2, cx, 0).x, at(2, 0, 380).y, 78, hour);
  draw(null, { id: `p2-clock${i}-t`, kind: 'text', ...at(2, cx, 540), text: label, size: 46, anchor: 'middle', color: i === 1 ? C.red : C.text });
});

// ── câu 08–09 · part 3: does AI help? which role ──────────────────────────────────────────────────
enterColumn(1, 3, 8);
partTitle(3, start(8) + 30, 'AI có thực sự giúp ích?');
boxText('p3-ai', say(8, 'trí tuệ nhân tạo'), rect(3, 330, 190, 260, 110), 'AI', { size: 64, color: C.accent, boxColor: C.accent });
draw(say(8, 'giúp ích'), { id: 'p3-help', kind: 'arrow', points: [at(3, 460, 320), at(3, 470, 395), at(3, 460, 470)], color: C.accent });
boxText('p3-job', say(8, 'công việc ấy'), rect(3, 280, 490, 360, 120), 'Công việc', { size: 52 });
draw(null, { id: 'p3-user', kind: 'person', ...at(3, 150, 470), s: 30, dur: 22 });
draw(say(8, 'hay không', -4), { id: 'p3-q', kind: 'text', ...at(3, 540, 430), text: '?', size: 110, color: C.red });

boxText('p3-task', say(9, 'những việc'), rect(3, 930, 385, 240, 96), 'Từng việc', { size: 46 });
draw(say(9, 'giao AI làm thay', -8), { id: 'p3-fork1', kind: 'arrow', points: [at(3, 1180, 410), at(3, 1240, 320), at(3, 1310, 280)], color: C.accent });
boxText('p3-replace', null, rect(3, 1320, 220, 380, 110), 'AI làm thay', { size: 50 });
draw(say(9, 'AI nên hỗ trợ', -8), { id: 'p3-fork2', kind: 'arrow', points: [at(3, 1180, 460), at(3, 1240, 540), at(3, 1310, 575)], color: C.accent });
boxText('p3-assist', null, rect(3, 1320, 520, 380, 110), 'AI hỗ trợ', { size: 50 });
draw(say(9, 'con người quyết định'), { id: 'p3-human', kind: 'text', ...at(3, 1320, 700), text: '→ con người quyết định', size: 42, color: C.red });

// ── câu 10–11 · part 4: fixed steps or AI picks the next · enough and fitting ─────────────────────
look(start(10), { ...panelCenter(4), w: 1920 }, 32);
partTitle(4, start(10) + 8, 'Con người đặt bước hay AI chọn bước?');
draw(say(10, 'con người đặt sẵn'), { id: 'p4-fixed', kind: 'text', ...at(4, 60, 240), text: 'Con người đặt sẵn:', size: 44 });
boxText('p4-steps', say(10, 'các bước xử lý', -10), rect(4, 60, 270, 740, 96), 'Bước 1 → Bước 2 → Bước 3', { size: 46 });
draw(say(10, 'hoặc', -4), { id: 'p4-or', kind: 'text', ...at(4, 430, 450), text: 'hoặc', size: 46, color: C.red, anchor: 'middle' });
draw(say(10, 'để AI chọn'), { id: 'p4-ailabel', kind: 'text', ...at(4, 60, 530), text: 'AI chọn bước tiếp:', size: 44 });
boxText('p4-chain', say(10, 'dựa trên kết quả', -10), rect(4, 60, 560, 740, 96), 'Kết quả → AI → Bước tiếp', { size: 46, color: C.accent, boxColor: C.accent });
draw(say(10, 'vừa nhận được', -4), { id: 'p4-again', kind: 'arrow', points: [at(4, 640, 664), at(4, 520, 726), at(4, 280, 730), at(4, 170, 666)], color: C.red, head: 18 });

boxText('p4-enough', say(11, 'chọn cách đủ'), rect(4, 1130, 250, 400, 116), 'Cách đủ dùng', { size: 54 });
[
  ['chi phí', 'Chi phí', 1020],
  ['thời gian chờ', 'Thời gian chờ', 1330],
  ['rủi ro', 'Rủi ro', 1640],
].forEach(([phrase, text, x], i) => {
  draw(say(11, phrase), { id: `p4-c${i}`, kind: 'text', ...at(4, x, 600), text, size: 46, anchor: 'middle', color: i === 2 ? C.red : C.text });
  draw(null, { id: `p4-ca${i}`, kind: 'arrow', points: [at(4, x, 548), at(4, 1330 + (x - 1330) * 0.35, 380)], color: C.accent, dur: 10 });
});

// ── câu 12–13 · part 5: judging AI output · the two common mistakes ───────────────────────────────
enterColumn(2, 5, 12);
partTitle(5, start(12) + 30, 'Đánh giá kết quả AI và xử lý sai');
boxText('p5-out', say(12, 'xác định', -2), rect(5, 60, 380, 280, 110), 'Kết quả AI', { size: 46, color: C.accent, boxColor: C.accent });
draw(say(12, 'đạt yêu cầu', -10), { id: 'p5-a1', kind: 'arrow', points: [at(5, 350, 410), at(5, 420, 300), at(5, 470, 280)], color: C.accent });
boxText('p5-ok', null, rect(5, 480, 220, 330, 100), 'Đạt yêu cầu', { size: 46 });
draw(null, { id: 'p5-check', kind: 'check', ...at(5, 860, 312), s: 44, color: C.red });
draw(say(12, 'kết quả sai', -16), { id: 'p5-a2', kind: 'arrow', points: [at(5, 350, 470), at(5, 420, 570), at(5, 470, 590)], color: C.red });
boxText('p5-bad', null, rect(5, 480, 540, 330, 100), 'Sai → cần xử lý', { size: 44, color: C.red, boxColor: C.red });

draw(say(13, 'báo nhầm', -8), { id: 'p5-false', kind: 'text', ...at(5, 930, 318), text: 'AI báo nhầm', size: 46, color: C.red });
draw(null, { id: 'p5-fa', kind: 'arrow', points: [at(5, 1210, 304), at(5, 1420, 304)], color: C.red });
draw(say(13, 'một người cần giúp'), { id: 'p5-p1', kind: 'person', ...at(5, 1520, 220), s: 28, dur: 22 });
draw(say(13, 'không gặp khó', -4), { id: 'p5-p1-t', kind: 'text', ...at(5, 1520, 420), text: 'không cần giúp', size: 40, anchor: 'middle' });
draw(say(13, 'bỏ sót', -8), { id: 'p5-miss', kind: 'text', ...at(5, 930, 608), text: 'AI bỏ sót', size: 46, color: C.red });
draw(null, { id: 'p5-ma', kind: 'arrow', points: [at(5, 1210, 594), at(5, 1420, 594)], color: C.textMuted, dash: '12 12', dur: 10 });
draw(null, { id: 'p5-mx', kind: 'cross', ...at(5, 1315, 594), s: 34, color: C.red });
draw(say(13, 'người thật sự'), { id: 'p5-p2', kind: 'person', ...at(5, 1520, 510), s: 28, dur: 22 });
draw(null, { id: 'p5-p2-t', kind: 'text', ...at(5, 1520, 710), text: 'đang cần giúp', size: 40, anchor: 'middle', color: C.red });

// ── câu 14–15 · part 6: the description · go on, prepare, or stop ─────────────────────────────────
look(start(14), { ...panelCenter(6), w: 1920 }, 32);
partTitle(6, start(14) + 8, 'Hoàn chỉnh mô tả để quyết định');
draw(say(14, 'bản mô tả', -8), { id: 'p6-doc', kind: 'box', ...rect(6, 110, 190, 620, 520), fill: C.bgAlt, dur: 16 });
draw(null, { id: 'p6-doc-t', kind: 'text', ...at(6, 420, 270), text: 'Bản mô tả', size: 52, anchor: 'middle' });
[
  ['vấn đề', 'Vấn đề'],
  ['cách giải quyết dự kiến', 'Cách giải quyết dự kiến'],
  ['những điều phải kiểm tra', 'Điều phải kiểm tra'],
].forEach(([phrase, text], i) => {
  const y = 380 + i * 110;
  draw(say(14, phrase, i === 0 ? 0 : -6), { id: `p6-line${i}`, kind: 'text', ...at(6, 170, y), text: `– ${text}`, size: 44 });
});

draw(say(15, 'cân nhắc', -4), { id: 'p6-go', kind: 'arrow', points: [at(6, 740, 450), at(6, 900, 450)], color: C.accent });
[
  ['đi tiếp', 'Đi tiếp'],
  ['chuẩn bị thêm', 'Chuẩn bị thêm'],
  ['dừng đề xuất', 'Dừng đề xuất'],
].forEach(([phrase, text], i) => {
  boxText(`p6-opt${i}`, say(15, phrase), rect(6, 920, 230 + i * 160, 380, 104), text, { size: 46, dur: 12, color: i === 2 ? C.red : C.text });
});
draw(say(15, 'dựa vào', -4), { id: 'p6-basis', kind: 'text', ...at(6, 1360, 330), text: 'dựa vào:', size: 42, color: C.accent });
draw(say(15, 'lợi ích dự kiến', -2), { id: 'p6-b1', kind: 'text', ...at(6, 1360, 430), text: '• lợi ích dự kiến', size: 44 });
draw(say(15, 'kiểm soát rủi ro', -2), { id: 'p6-b2', kind: 'text', ...at(6, 1360, 530), text: '• kiểm soát rủi ro', size: 44 });

// ── câu 16 · zoom out: the whole day on one board, the three questions it answers ─────────────────
look(start(16), FULL, 50);
draw(start(16) + 50, { id: 'after', kind: 'text', x: HX, y: -50, text: 'Sau hôm nay', size: 130, color: C.red, anchor: 'middle' });
[
  ['cần AI', 0],
  ['làm thay hay hỗ trợ', 1],
  ['khi nào nên làm tiếp', 2],
].forEach(([phrase, k]) => {
  const text = ZONES[k].closing;
  const w = handWidth(text, 110);
  const t = draw(say(16, phrase, -10), { id: `close-${k}`, kind: 'text', x: CX[k], y: 640, text, size: 110, color: C.red, anchor: 'middle' });
  draw(endOf(t), { id: `close-${k}-loop`, kind: 'loop', cx: CX[k], cy: 604, rx: w / 2 + 70, ry: 90, color: C.red, width: 9, dur: 14 });
});

export const BOARD = { panels: [1, 2, 3, 4, 5, 6].map((p) => rect(p, 0, 0, PW, PH)), full: FULL };
