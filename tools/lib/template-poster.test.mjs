/**
 * HỢP ĐỒNG của khung `new-video --style poster`. Bốn thứ dưới đây từng làm hỏng một lượt dựng thật
 * và đều KHÔNG có gate nào canh, vì chúng nằm trong *template*, không nằm trong một video nào:
 *
 *  1. THEME — scaffold phải sinh `vinuni-light` (NỀN TRẮNG). Hiểu "poster = nền đêm" ngày
 *     22/09/2026 tốn ≈0,75M token + 1h50 để re-theme 36 cảnh.
 *  2. SEQUENCES dựng từ `TIMELINE` — bản cũ `SCENES.map` chỉ ra 1 sequence cho 3 cue, cue 2–3
 *     render KHUNG RỖNG và `verify` đỏ ngay lúc vừa `new-video` (retro F7/F8).
 *  3. Cue mẫu phải đủ nhịp ngắn/vừa/dài + connector, nếu không `text-gate` đỏ ngay (F7).
 *  4. Ba câu trắc nghiệm là LUẬT của series — `REQUEST.quiz` phải khớp số cảnh `quiz-*` trong
 *     storyboard, và mỗi cảnh quiz phải có đúng một cue `silent` + `quiz: true` (gate G7).
 *
 * Test đọc THẲNG file template, nên nó đỏ ngay khi ai đó sửa template sai — không phải đợi tới
 * lượt dựng sau mới biết.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const T = (rel) => fs.readFileSync(path.join(REPO, 'templates/video/poster', rel), 'utf8');

test('scaffold khai theme `vinuni-light` — nền trắng là mặc định của series', () => {
  const stage = T('scene/stage.jsx');
  assert.match(stage, /theme:\s*'vinuni-light'/, "stage.jsx phải truyền theme cho createPosterStage");
  assert.ok(!/theme:\s*'night'/.test(stage), 'scaffold KHÔNG được mặc định nền đêm');
  const req = T('project/REQUEST.md');
  assert.match(req, /\*\*theme\*\*:\s*`vinuni-light`/);
  assert.match(req, /\*\*motion\*\*:\s*`poster`/, 'hai trục phải là hai trường tách rời');
});

test('cảnh mẫu lấy màu QUA THEME, không hard-code token nền đêm', () => {
  const ch = T('scene/chapters.jsx');
  assert.match(ch, /usePosterTheme\(\)/, 'phải đọc theme');
  // `POSTER as P` là cách cũ: nó trỏ thẳng vào bảng màu nền đêm.
  assert.ok(!/POSTER as P\b/.test(ch), 'không import bảng màu POSTER vào cảnh mẫu');
  assert.ok(!/#[0-9a-fA-F]{6}/.test(ch.replace(/^\s*\*.*$/gm, '')), 'không rải hex trong cảnh mẫu');
});

test('SEQUENCES dựng từ TIMELINE — thêm cue không phải thêm file', () => {
  const v = T('scene/video.jsx');
  assert.match(v, /TIMELINE\.map\(/, 'một sequence mỗi cue, tự động');
  assert.ok(!/const SCENES = \[S01\]/.test(v), 'bản cũ chỉ dựng 1 sequence cho mọi cue → KHUNG RỖNG');
});

test('cue mẫu đủ nhịp ngắn/vừa/dài + có connector (text-gate xanh ngay)', () => {
  const src = T('scene/cues.js');
  const texts = [...src.matchAll(/^\s*text:\s*'((?:[^'\\]|\\.)*)'/gm)].map((m) => m[1]);
  const spoken = texts.filter((t) => t.trim());
  assert.ok(spoken.length >= 3, `cần ≥3 cue có lời, đang có ${spoken.length}`);
  const buckets = new Set(spoken.map((t) => {
    const n = (t.match(/\S+/g) || []).length;
    return n <= 15 ? 'short' : n <= 22 ? 'medium' : 'long';
  }));
  assert.equal(buckets.size, 3, `phải đủ ba nhịp câu, đang có ${[...buckets].join('/')}`);
  const CONNECTOR = /(?<![\p{L}\p{N}])(nhưng|vì|nên|vậy|thế|đó|giờ|tiếp|còn|thì|cuối cùng|bây giờ)(?![\p{L}\p{N}])/iu;
  assert.ok(spoken.some((t) => CONNECTOR.test(t)), 'cần ít nhất một cue có connector');
});

test('ba câu trắc nghiệm: REQUEST · storyboard · cues.js khớp nhau (G7)', () => {
  const want = Number(T('project/REQUEST.md').match(/^\s*[-*]\s*\*\*quiz\*\*\s*:\s*`?(\d+)`?/m)?.[1]);
  assert.equal(want, 3, 'REQUEST mẫu phải khai `quiz: 3` — luật của series');

  const sb = JSON.parse(T('project/storyboard.json'));
  const quizScenes = sb.scenes.filter((sc) => /^quiz-/.test(sc.id) || sc.chapter === 'quiz');
  assert.equal(quizScenes.length, want, 'số cảnh quiz phải khớp REQUEST');

  const cues = T('scene/cues.js');
  const silentQuiz = [...cues.matchAll(/\bn:\s*(\d+)[\s\S]*?\}/g)]
    .filter((m) => /\bquiz:\s*true\b/.test(m[0]) && /\bsilent:\s*true\b/.test(m[0]))
    .map((m) => Number(m[1]));
  assert.equal(silentQuiz.length, want, '`quiz: true` chỉ đặt ở cue LẶNG, mỗi câu đúng một');
  assert.equal((cues.match(/tag:\s*['"]CÂU HỎI['"]/g) || []).length, want,
    'mỗi bộ quiz cần đúng một tag CÂU HỎI để qa-manifest của platform nhận ra');

  for (const sc of quizScenes) {
    assert.ok(Number.isInteger(sc.quiz?.answer), `${sc.id}: thiếu \`quiz.answer\``);
    const ans = (sc.onScreenText || []).filter((t) => /^Đáp án/.test(typeof t === 'string' ? t : t.text));
    assert.equal(ans.length, 1, `${sc.id}: đúng MỘT dòng "Đáp án"`);
    // Chữ trên hình của quiz cố ý chép lời đọc → phải khai `kind: "quiz"`, nếu không G1 báo lặp.
    for (const t of sc.onScreenText || []) {
      assert.equal(typeof t === 'string' ? null : t.kind, 'quiz', `${sc.id}: chữ trên hình quiz phải khai kind:"quiz"`);
    }
    assert.equal((sc.cues || []).filter((n) => silentQuiz.includes(n)).length, 1,
      `${sc.id}: phải chứa đúng một cue lặng mang quiz:true`);
  }
});

test('ảnh tư liệu đi qua images.js, và khối `_example` là khoá bị gate bỏ qua', () => {
  const sb = JSON.parse(T('project/storyboard.json'));
  assert.match(sb.$images, /images\.js/);
  assert.ok(sb._example, 'giữ khối ví dụ — gate bỏ qua mọi khoá bắt đầu bằng `_`');
  assert.ok(Object.keys(sb).filter((k) => !/^[_$]/.test(k)).every((k) => k !== 'example'));
});
