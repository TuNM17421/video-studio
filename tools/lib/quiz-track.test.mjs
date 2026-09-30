/**
 * Nhạc quiz cho `stage render`. Lỗi ở đây ÂM THẦM: thiếu `--quiz-track` vẫn ra một MP4 hợp lệ,
 * chỉ câm ở đúng ba khoảng chờ quiz — không gate nào đỏ. Vì vậy mỗi check dưới đây đều có PHÉP
 * PHÁ: phá đúng thứ nó canh, thấy đỏ, rồi mới tin.
 *
 * API mới (PR #47 fix): quizTrackArgs(videoId, trackId, repoRoot) — trackId đến từ --quiz-track CLI
 * arg, không đọc REQUEST.md (CLAUDE.md: nhạc quiz chỉ chọn ở bước Render, Studio luôn gửi cờ).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { cuesHaveQuiz, quizTrackArgs } from './quiz-track.mjs';

const VID = 'v-test';

/** Repo giả: `cues` là nội dung cues.js, `music` là mảng id quiz. */
function fakeRepo({ cues = '', music = ['quiz-timer'] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-track-'));
  const write = (rel, text) => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };
  write(`vinuni-lesson-video-ds/ui_kits/lesson-video/videos/${VID}/cues.js`, cues);
  write('music.json', JSON.stringify({ quiz: music.map((id) => ({ id })) }));
  return root;
}

const CUES_QUIZ = 'export const CUES = [\n  { n: 143, silent: 3, quiz: true },\n];\n';
const CUES_PLAIN = 'export const CUES = [\n  { n: 1, text: "xin chào" },\n];\n';

test('video không có cue quiz — lệnh render không đổi một chữ', () => {
  const root = fakeRepo({ cues: CUES_PLAIN });
  const r = quizTrackArgs(VID, null, root);
  assert.deepEqual(r.args, []);
  assert.equal(r.problem, null);
});

test('có cue quiz + truyền đúng track → truyền cờ xuống render', () => {
  const root = fakeRepo({ cues: CUES_QUIZ });
  const r = quizTrackArgs(VID, 'quiz-timer', root);
  assert.deepEqual(r.args, ['--quiz-track', 'quiz-timer']);
  assert.equal(r.problem, null);
});

test('có cue quiz + trackId = "none" → trả cờ none, không lỗi', () => {
  const root = fakeRepo({ cues: CUES_QUIZ });
  const r = quizTrackArgs(VID, 'none', root);
  assert.deepEqual(r.args, ['--quiz-track', 'none']);
  assert.equal(r.problem, null);
});

test('PHÉP PHÁ · có cue quiz nhưng không truyền trackId → ĐỎ, không phải cảnh báo', () => {
  const root = fakeRepo({ cues: CUES_QUIZ });
  const r = quizTrackArgs(VID, null, root);
  assert.deepEqual(r.args, []);
  assert.match(r.problem, /chưa chọn nhạc quiz/);
  assert.match(r.problem, /CÂM/);
});

test('PHÉP PHÁ · khai id không có trong music.json → ĐỎ và in id có thật', () => {
  const root = fakeRepo({ cues: CUES_QUIZ, music: ['quiz-timer', 'quiz-loop-18s'] });
  const r = quizTrackArgs(VID, 'khong-co-that', root);
  assert.match(r.problem, /music\.json không có id đó/);
  assert.match(r.problem, /quiz-timer · quiz-loop-18s/);
});

test('PHÉP PHÁ · bỏ `quiz: true` khỏi cues.js → check không còn đòi track (đúng ca video cũ)', () => {
  assert.equal(cuesHaveQuiz(CUES_QUIZ), true);
  assert.equal(cuesHaveQuiz(CUES_QUIZ.replace('quiz: true', 'quiz: false')), false);
});
