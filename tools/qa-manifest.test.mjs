import assert from 'node:assert/strict';
import test from 'node:test';

import { buildQaManifest, detectQuestions } from './lib/qa-manifest.mjs';
import { lintQuiz, parseScript } from './lib/script-lint.mjs';

const FPS = 30;
// Five spoken câu with one quiz set (3 → 4 silent → 5), 3 s each.
const cues = [
  { n: 1, section: 1, text: 'Mở đầu.' },
  { n: 2, section: 2, text: 'Nội dung.' },
  { n: 3, section: 3, text: 'Câu hỏi một là gì?', tag: 'CÂU HỎI' },
  { n: 4, section: 3, text: '', tag: 'CÂU HỎI', silent: 5 },
  { n: 5, section: 3, text: 'Đáp án một.' },
];
const timing = {
  fps: FPS,
  audioDurationSeconds: 15,
  cues: cues.map((c, i) => ({ n: c.n, text: c.text, seconds: i * 3, startFrame: i * 90, endFrame: (i + 1) * 90 })),
};
const meta = { item_id: '1.1', title: 'Thử', captions_burned: true };
const sections = ['Mở', 'Thân', 'Kiểm tra'];

test('builds the manifest from the voice timing, not the script estimate', () => {
  const { manifest, errors } = buildQaManifest({ cues, sections, timing, meta });
  assert.deepEqual(errors, []);
  assert.equal(manifest.duration_sec, 15);
  assert.deepEqual(manifest.cues[2], { n: 3, section: 3, text: 'Câu hỏi một là gì?', start_sec: 6, end_sec: 9, tag: 'CÂU HỎI', silent: 0 });
  assert.deepEqual(manifest.chapters.map((c) => c.start_sec), [0, 3, 6]);
  assert.deepEqual(manifest.render, { keep_frames: false });
});

test('detects a quiz set the way the platform does', () => {
  const { manifest, questions } = buildQaManifest({ cues, sections, timing, meta });
  assert.deepEqual(questions, [{ q: 'Câu hỏi một là gì?', model_answer: 'Đáp án một.', q_cue_n: 3, a_cue_n: 5 }]);
  // a question with no pause after it is not a quiz
  const noPause = manifest.cues.filter((c) => c.n !== 4);
  assert.deepEqual(detectQuestions(noPause), []);
});

test('refuses a stale recording', () => {
  const stale = { ...timing, cues: timing.cues.map((c) => (c.n === 2 ? { ...c, text: 'Nội dung cũ.' } : c)) };
  const { manifest, errors } = buildQaManifest({ cues, sections, timing: stale, meta });
  assert.equal(manifest, null);
  assert.match(errors[0], /câu 2/);
});

test('refuses a cue count mismatch and a missing item id', () => {
  assert.match(buildQaManifest({ cues, sections, timing: { ...timing, cues: timing.cues.slice(1) }, meta }).errors[0], /5/);
  assert.match(buildQaManifest({ cues, sections, timing, meta: { ...meta, item_id: '' } }).errors[0], /item_id/);
});

test('warns about missing quizzes and keep-frames builds', () => {
  const plain = cues.slice(0, 2);
  const { warnings } = buildQaManifest({
    cues: plain,
    sections: ['Mở', 'Thân'],
    timing: { fps: FPS, cues: timing.cues.slice(0, 2) },
    meta: { ...meta, keep_frames: true },
  });
  assert.ok(warnings.some((w) => w.includes('0 bộ quiz')));
  assert.ok(warnings.some((w) => w.includes('keep_frames')));
});

// ── Chỗ dừng trong kịch bản ────────────────────────────────────────────────────────────────────────
// Bộ quiz phải thành hình ngay trên kịch bản, trước khi thu giọng: sau đó sửa là thu lại.

const script = (body) => parseScript(`# Thử\n\n- **Mục tiêu:** thử.\n\n## 1 · Phần một\n${body}`);
const quizIssues = (body) => {
  const issues = [];
  lintQuiz(script(body), (level, cue, line, message) => issues.push({ level, cue, line, message }));
  return issues;
};
const QUESTION = '\n### Câu 1\n- **Lời:** Theo bạn nên viết câu lệnh thế nào?\n';
const PAUSE = '\n### Dừng 1\n- **Dừng:** 30 giây\n';

test('a well-formed quiz set passes', () => {
  assert.deepEqual(quizIssues(`${QUESTION}${PAUSE}\n### Câu 2\n- **Lời:** Câu này thiếu người đọc.\n`).filter((i) => i.level === 'problem'), []);
});

test('a filler câu right after the pause would become the model answer', () => {
  const issues = quizIssues(`${QUESTION}${PAUSE}\n### Câu 2\n- **Lời:** Hết giờ.\n\n### Câu 3\n- **Lời:** Câu này thiếu người đọc.\n`);
  const problem = issues.find((i) => i.level === 'problem');
  assert.match(problem.message, /đáp án mẫu/);
  assert.equal(problem.cue, 2);
});

test('a pause with no question before it, and one with no answer after it', () => {
  assert.match(quizIssues(`${PAUSE}\n### Câu 1\n- **Lời:** Một câu.\n`)[0].message, /không có câu hỏi ngay trước/);
  assert.match(quizIssues(`${QUESTION}${PAUSE}`).find((i) => i.level === 'problem').message, /không có câu chữa bài/);
});

test('a pause must say how many seconds', () => {
  const issues = quizIssues(`${QUESTION}\n### Dừng 1\n- **Trên màn hình:** Đồng hồ\n\n### Câu 2\n- **Lời:** Đáp án.\n`);
  assert.match(issues[0].message, /thiếu dòng \*\*Dừng:\*\*/);
});

test('a script with no pause at all says nothing — a video without quiz is valid', () => {
  assert.deepEqual(quizIssues('\n### Câu 1\n- **Lời:** Một câu.\n'), []);
});

test('fewer than three sets is a warning, not a block', () => {
  const issues = quizIssues(`${QUESTION}${PAUSE}\n### Câu 2\n- **Lời:** Đáp án.\n`);
  assert.deepEqual(issues.filter((i) => i.level === 'problem'), []);
  assert.match(issues.find((i) => i.level === 'warning').message, /1 chỗ dừng/);
});
