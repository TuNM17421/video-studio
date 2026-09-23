/**
 * Nhạc quiz cho `stage render`. Lỗi ở đây ÂM THẦM: thiếu `--quiz-track` vẫn ra một MP4 hợp lệ,
 * chỉ câm ở đúng ba khoảng chờ quiz — không gate nào đỏ. Vì vậy mỗi check dưới đây đều có PHÉP
 * PHÁ: phá đúng thứ nó canh, thấy đỏ, rồi mới tin.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { cuesHaveQuiz, quizTrackArgs, readTrackDecl } from './quiz-track.mjs';

const VID = 'v-test';

/** Repo giả: `cues` là nội dung cues.js, `request` là REQUEST.md, `music` là mảng id. */
function fakeRepo({ cues = '', request = null, music = ['quiz-timer'] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-track-'));
  const write = (rel, text) => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };
  write(`vinuni-lesson-video-ds/ui_kits/lesson-video/videos/${VID}/cues.js`, cues);
  if (request !== null) write(`projects/${VID}/REQUEST.md`, request);
  write('music.json', JSON.stringify({ quiz: music.map((id) => ({ id })) }));
  return root;
}

const CUES_QUIZ = 'export const CUES = [\n  { n: 143, silent: 3, quiz: true },\n];\n';
const CUES_PLAIN = 'export const CUES = [\n  { n: 1, text: "xin chào" },\n];\n';
const REQ_OK = '# v-test\n\n- **Ngày**: 05\n- **quiz-track**: `quiz-timer`\n';

test('video không có cue quiz — lệnh render không đổi một chữ', () => {
  const root = fakeRepo({ cues: CUES_PLAIN, request: REQ_OK });
  const r = quizTrackArgs(VID, root);
  assert.deepEqual(r.args, []);
  assert.equal(r.problem, null);
});

test('có cue quiz + khai đúng track → truyền cờ xuống render', () => {
  const root = fakeRepo({ cues: CUES_QUIZ, request: REQ_OK });
  const r = quizTrackArgs(VID, root);
  assert.deepEqual(r.args, ['--quiz-track', 'quiz-timer']);
  assert.equal(r.problem, null);
});

test('PHÉP PHÁ · bỏ dòng quiz-track khỏi REQUEST.md → ĐỎ, không phải cảnh báo', () => {
  const root = fakeRepo({ cues: CUES_QUIZ, request: '# v-test\n\n- **Ngày**: 05\n' });
  const r = quizTrackArgs(VID, root);
  assert.deepEqual(r.args, []);
  assert.match(r.problem, /không khai `quiz-track`/);
  assert.match(r.problem, /CÂM/);
});

test('PHÉP PHÁ · khai id không có trong music.json → ĐỎ và in id có thật', () => {
  const root = fakeRepo({ cues: CUES_QUIZ, request: '- **quiz-track**: `khong-co-that`\n', music: ['quiz-timer', 'quiz-loop-18s'] });
  const r = quizTrackArgs(VID, root);
  assert.match(r.problem, /music\.json không có id đó/);
  assert.match(r.problem, /quiz-timer · quiz-loop-18s/);
});

test('PHÉP PHÁ · bỏ `quiz: true` khỏi cues.js → check không còn đòi track (đúng ca video cũ)', () => {
  assert.equal(cuesHaveQuiz(CUES_QUIZ), true);
  assert.equal(cuesHaveQuiz(CUES_QUIZ.replace('quiz: true', 'quiz: false')), false);
});

test('đọc được cả `music-track` khi không khai `quiz-track`', () => {
  assert.equal(readTrackDecl('- **quiz-track**: `a`\n'), 'a');
  assert.equal(readTrackDecl('- **music-track**: `b`\n', 'music-track'), 'b');
  assert.equal(readTrackDecl('- **quiz-track**: không phải id\n'), null);
});
