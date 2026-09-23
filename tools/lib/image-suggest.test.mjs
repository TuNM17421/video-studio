import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { DEFAULT_POLICY } from './image-license.mjs';
import {
  checkDecisions, checkImages, checkSuggest, checkTriage, cuesHash, DS_ROOT, dsSrc, imagePaths, imagesModule, loadCues, maxSlotsFor, REPO,
} from './image-suggest.mjs';

const CUES = [
  { n: 1, text: 'Năm 1950, Alan Turing đặt câu hỏi: máy có thể suy nghĩ không?', section: 1, silent: false, quiz: false },
  { n: 2, text: 'Ông đề xuất một phép thử bằng hội thoại.', section: 1, silent: false, quiz: false },
  { n: 3, text: 'Mùa hè 1956, hội thảo Dartmouth đặt tên cho ngành trí tuệ nhân tạo.', section: 2, silent: false, quiz: false },
  { n: 4, text: '', section: 2, silent: true, quiz: true },
];
const SECTIONS = ['Mở đầu', 'Lịch sử'];

const slot = (over = {}) => ({
  slot: 's1', cues: [1, 2], kind: 'use', subject: 'Alan Turing', era: '1950s',
  why: 'Câu 1 nêu tên Alan Turing và năm 1950 — ảnh chân dung giúp người xem gắn tên với người thật.',
  queries: ['Alan Turing portrait'], ...over,
});
const triage = (slots) => ({ version: 1, cuesHash: cuesHash(CUES), slots });

test('maxSlotsFor: ít nhất 2, mỗi phần một chỗ, không quá trần', () => {
  assert.equal(maxSlotsFor([], DEFAULT_POLICY), 2);
  assert.equal(maxSlotsFor(['a', 'b', 'c'], DEFAULT_POLICY), 3);
  assert.equal(maxSlotsFor(new Array(20).fill('x'), DEFAULT_POLICY), 8);
});

test('checkTriage: triage đúng thì không có problem', () => {
  const r = checkTriage({ triage: triage([slot(), slot({ slot: 's3', cues: [3], subject: 'Dartmouth workshop 1956', queries: ['Dartmouth 1956 artificial intelligence'] })]), cues: CUES, sections: SECTIONS });
  assert.deepEqual(r, { problems: [], warnings: [] });
  assert.deepEqual(checkTriage({ triage: triage([]), cues: CUES, sections: SECTIONS }).problems, []);
});

test('checkTriage: bắt câu không có thật, khoảng lặng, trùng câu, mã slot sai, thiếu lý do, quá trần', () => {
  const bad = checkTriage({
    triage: triage([
      slot({ cues: [1, 9] }),
      slot({ slot: 's2', cues: [1, 2] }),
      slot({ slot: 's4', cues: [4], why: 'ngắn', subject: '', queries: [] }),
      slot({ slot: 'x3', cues: [3] }),
    ]),
    cues: CUES,
    sections: SECTIONS,
  }).problems.join('\n');
  assert.match(bad, /4 chỗ đề xuất — tối đa 2/);
  assert.match(bad, /câu 9 không có trong cues\.js/);
  assert.match(bad, /câu 1 đã thuộc s1/);
  assert.match(bad, /câu 4 là khoảng lặng/);
  assert.match(bad, /câu 4 là khoảng chờ quiz/);
  assert.match(bad, /"why" quá ngắn/);
  assert.match(bad, /thiếu "subject"/);
  assert.match(bad, /cần 1–3 từ khoá/);
  assert.match(bad, /slot x3: "slot" phải có dạng/);
  assert.match(checkTriage({ triage: triage([slot({ slot: 's2' })]), cues: CUES, sections: SECTIONS }).problems.join(), /mã slot phải là s1/);
  assert.match(checkTriage({ triage: { slots: [] , cuesHash: 'cu' }, cues: CUES, sections: SECTIONS }).warnings.join(), /lời đọc .* đã đổi/);
  assert.match(checkTriage({ triage: {}, cues: CUES, sections: SECTIONS }).problems.join(), /thiếu mảng "slots"/);
});

const CANDS = {
  s1: {
    candidates: [
      { id: 'commons:File:A.jpg', license: 'pd', width: 675, height: 919, lowRes: true },
      { id: 'openverse:b', license: 'cc-by', width: 1024, height: 768 },
      { id: 'openverse:c', license: 'cc-by-sa', width: 2000, height: 1500 },
    ],
  },
};

test('checkSuggest: ảnh phải có trong danh sách code đã tìm; báo ảnh độ phân giải thấp', () => {
  const t = triage([slot()]);
  const good = {
    slots: [{
      slot: 's1',
      candidates: [{ id: 'commons:File:A.jpg', fit: 'good', why: 'Chân dung đúng người, thời điểm gần câu nói.' }],
      rejected: [{ id: 'openverse:b', reason: 'tượng, không phải chân dung' }],
    }],
  };
  const r = checkSuggest({ suggest: good, triage: t, candidatesBySlot: CANDS });
  assert.deepEqual(r.problems, []);
  assert.match(r.warnings.join(), /độ phân giải thấp/);

  const bad = checkSuggest({
    suggest: { slots: [
      { slot: 's1', candidates: [{ id: 'made:up', fit: 'good', why: 'x'.repeat(30) }, { id: 'openverse:b', fit: 'great', why: 'ngắn' }], rejected: [{ id: 'openverse:b' }] },
      { slot: 's9', candidates: [] },
    ] },
    triage: t,
    candidatesBySlot: CANDS,
  }).problems.join('\n');
  assert.match(bad, /made:up không có trong candidates\/s1\.json/);
  assert.match(bad, /"fit" phải là good \| ok/);
  assert.match(bad, /"why" quá ngắn/);
  assert.match(bad, /vừa được chọn vừa bị loại/);
  assert.match(bad, /thiếu "reason"/);
  assert.match(bad, /slot s9: không có trong triage\.json/);
  const none = checkSuggest({ suggest: { slots: [{ slot: 's1', candidates: [] }] }, triage: t, candidatesBySlot: CANDS }).problems.join();
  assert.match(none, /ghi lý do vào "none"/);
});

test('checkDecisions: người dựng chọn được cả ảnh ngoài đề xuất (chỉ cảnh báo), không chọn được ảnh sai giấy phép', () => {
  const t = triage([slot()]);
  const suggest = { slots: [{ slot: 's1', candidates: [{ id: 'commons:File:A.jpg', fit: 'good', why: 'x'.repeat(30) }] }] };
  assert.deepEqual(checkDecisions({ decisions: { slots: { s1: { action: 'skip' } } }, triage: t, candidatesBySlot: CANDS, suggest }), { problems: [], warnings: [] });
  const own = checkDecisions({ decisions: { slots: { s1: { action: 'use', candidate: 'openverse:c', caption: 'Alan Turing' } } }, triage: t, candidatesBySlot: CANDS, suggest });
  assert.deepEqual(own.problems, []);
  assert.match(own.warnings.join(), /người dựng tự chọn/);
  const cands = { s1: { candidates: [...CANDS.s1.candidates, { id: 'openverse:nc', license: 'cc-by-nc' }] } };
  const bad = checkDecisions({
    decisions: { slots: { s1: { action: 'use', candidate: 'openverse:nc', caption: 'x'.repeat(70) }, s7: { action: 'use' } } },
    triage: t, candidatesBySlot: cands, suggest,
  }).problems.join('\n');
  assert.match(bad, /giấy phép không được dùng \(cc-by-nc\)/);
  assert.match(bad, /chú thích dài quá 60/);
  assert.match(bad, /slot s7: không có trong triage/);
  assert.match(checkDecisions({ decisions: { slots: { s1: { action: 'maybe' } } }, triage: t, candidatesBySlot: CANDS }).problems.join(), /"action" phải là/);
});

test('src trong images.js tính từ gốc design system; checkImages kiểm file theo gốc đó', () => {
  const file = path.join(DS_ROOT, 'ui_kits/lesson-video/videos/demo/img/s1.jpg');
  assert.equal(dsSrc(file), 'ui_kits/lesson-video/videos/demo/img/s1.jpg');
  assert.equal(DS_ROOT, path.join(REPO, 'vinuni-lesson-video-ds'));

  const ds = fs.mkdtempSync(path.join(os.tmpdir(), 'img-ds-'));
  fs.mkdirSync(path.join(ds, 'ui_kits/lesson-video/videos/demo/img'), { recursive: true });
  fs.writeFileSync(path.join(ds, 'ui_kits/lesson-video/videos/demo/img/s1.jpg'), 'x');
  const ok = { s1: { src: 'ui_kits/lesson-video/videos/demo/img/s1.jpg', kind: 'use', credit: 'Ảnh: A · Public domain · Wikimedia Commons' } };
  assert.deepEqual(checkImages({ images: ok, dsRoot: ds }).problems, []);
  const bad = checkImages({
    images: {
      a: { src: 'img/s1.jpg', kind: 'use', credit: 'x' },
      b: { src: 'https://upload.wikimedia.org/x.jpg', kind: 'reference' },
      c: { src: 'ui_kits/lesson-video/videos/demo/img/s1.jpg', kind: 'use' },
    },
    dsRoot: ds,
  }).problems.join('\n');
  assert.match(bad, /a: không có file img\/s1\.jpg/);
  assert.match(bad, /b: "src" phải là đường dẫn từ gốc design system/);
  assert.match(bad, /c: ảnh "use" thiếu "credit"/);
});

test('imagesModule sinh module import được; imagePaths đặt dữ liệu trung gian trong projects/<id>/images', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-mod-'));
  const file = path.join(dir, 'images.js');
  const entries = { s1: { src: 'ui_kits/lesson-video/videos/demo/img/s1.jpg', kind: 'use', cues: [1, 2], caption: 'Alan Turing', credit: 'Ảnh: A' } };
  fs.writeFileSync(file, imagesModule(entries));
  const { IMAGES } = await import(pathToFileURL(file).href);
  assert.deepEqual(IMAGES, entries);

  const P = imagePaths('vinuni-lesson-video-ds/ui_kits/lesson-video/videos/demo');
  assert.equal(P.id, 'demo');
  assert.equal(P.triage, path.join(REPO, 'projects/demo/images/triage.json'));
  assert.equal(P.thumbBase('s1', 3), path.join(REPO, 'projects/demo/images/candidates/s1/c03'));
  assert.equal(P.imgBase('s1'), path.resolve('vinuni-lesson-video-ds/ui_kits/lesson-video/videos/demo/img/s1'));
  assert.equal(imagePaths('x/demo', { work: dir }).suggest, path.join(dir, 'suggest.json'));
});

test('loadCues đọc cues.js bằng import như tools/cues-json.mjs', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-cues-'));
  fs.writeFileSync(path.join(dir, 'cues.js'), `export const SECTIONS = ['A'];\nexport const CUES = [{ n: 1, text: 'Xin chào', screen: 'Chào', section: 1 }, { n: 2, text: '', silent: true, quiz: true }];\n`);
  const { cues, sections } = await loadCues(dir);
  assert.deepEqual(sections, ['A']);
  assert.deepEqual(cues[0], { n: 1, text: 'Xin chào', title: 'Chào', section: 1, silent: false, quiz: false });
  assert.equal(cues[1].quiz, true);
  await assert.rejects(loadCues(path.join(dir, 'khong-co')), /không có cues\.js/);
});
