/**
 * Cổng khoá wording — phần logic thuần. Ba thứ phải đúng, vì sai ở đây là sửa nhầm lời rồi sinh
 * giọng cho bản sai (retro d05-v06 F2 · 2 lượt Kaggle + hai lane sửa tay).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDelta, compareLock, hashText, makeLock, parseDelta } from './script-lock.mjs';

const CUES = [
  { n: 1, text: 'Câu một nói về cái vạch.' },
  { n: 2, text: 'Câu hai nói tiếp về phần khó nhất.' },
  { n: 3, text: 'Câu ba chốt lại.' },
];
const SRC = `const RAW = [
  {
    n: 1, frames: 90, scene: 'intro',
    text: 'Câu một nói về cái vạch.',
    visual: 'x',
  },
  {
    n: 2, frames: 90, scene: 'intro',
    text: 'Câu hai nói tiếp về phần khó nhất.',
    visual: 'y',
  },
  {
    n: 3, frames: 90, scene: 'intro',
    text: 'Câu ba chốt lại.',
    visual: 'z',
  },
];`;

test('parseDelta đọc được cả `## cue N` lẫn `## anchor:`, và bỏ mục không có dòng `>`', () => {
  const d = parseDelta(`## cue 2\n> lời mới\nlý do: cụt\n\n## anchor: phần khó nhất\n> lời khác\n\n## cue 9\nchưa viết gì\n`);
  assert.equal(d.length, 2, 'mục không có dòng `>` bị bỏ qua — owner hay để ghi chú dở');
  assert.deepEqual(d[0].where, { cue: 2 });
  assert.equal(d[0].why, 'cụt');
  assert.deepEqual(d[1].where, { anchor: 'phần khó nhất' });
});

test('applyDelta thay ĐÚNG cue và GIỮ NGUYÊN phần còn lại của file', () => {
  const r = applyDelta(SRC, CUES, parseDelta('## cue 2\n> Lời hai đã sửa.\n'));
  assert.equal(r.problems.length, 0);
  assert.equal(r.applied.length, 1);
  assert.match(r.src, /text: 'Lời hai đã sửa\.'/);
  // phá: nếu phép thay không có neo theo `n:`, cue 1 hoặc 3 sẽ bị đụng.
  assert.match(r.src, /text: 'Câu một nói về cái vạch\.'/, 'cue 1 phải nguyên vẹn');
  assert.match(r.src, /text: 'Câu ba chốt lại\.'/, 'cue 3 phải nguyên vẹn');
  assert.match(r.src, /visual: 'y'/, 'comment/trường khác không được mất');
});

test('anchor phải DUY NHẤT — mơ hồ hoặc không có thì TỪ CHỐI, không đoán', () => {
  const dup = applyDelta(SRC, CUES, parseDelta('## anchor: Câu\n> x\n'));
  assert.equal(dup.applied.length, 0);
  assert.match(dup.problems.join('\n'), /khớp 3 cue/);

  const missing = applyDelta(SRC, CUES, parseDelta('## anchor: không có cụm này\n> x\n'));
  assert.match(missing.problems.join('\n'), /không cue nào chứa/);

  const badCue = applyDelta(SRC, CUES, parseDelta('## cue 99\n> x\n'));
  assert.match(badCue.problems.join('\n'), /cue 99: không có trong cues\.js/);

  // đối chứng: anchor duy nhất thì áp được — nếu không, ba assert trên chỉ chứng minh "luôn từ chối"
  const ok = applyDelta(SRC, CUES, parseDelta('## anchor: phần khó nhất\n> Lời hai đã sửa.\n'));
  assert.equal(ok.applied.length, 1);
  assert.equal(ok.applied[0].n, 2);
});

test('lời có dấu nháy được escape, không làm vỡ cues.js', () => {
  const r = applyDelta(SRC, CUES, parseDelta("## cue 1\n> Câu 'có nháy' bên trong.\n"));
  assert.equal(r.problems.length, 0);
  assert.match(r.src, /text: 'Câu \\'có nháy\\' bên trong\.'/);
});

test('compareLock bắt được đổi chữ · thêm cue · mất cue', () => {
  const lock = makeLock(CUES, { video: 'v', at: '2026-09-22 03:00:00+0700' });
  assert.equal(lock.cues, 3);
  assert.equal(compareLock(lock, CUES).changed.length, 0, 'lời y nguyên thì không trôi');

  const edited = CUES.map((c) => (c.n === 2 ? { ...c, text: 'đổi rồi' } : c));
  assert.deepEqual(compareLock(lock, edited).changed, [2]);

  const split = [...CUES, { n: 4, text: 'cue tách ra' }];
  assert.deepEqual(compareLock(lock, split).added, [4], 'tách cue phải lộ ra — đây đúng là ca F2');

  assert.deepEqual(compareLock(lock, CUES.slice(0, 2)).removed, [3]);

  // chưa có lock → không kết luận gì, và KHÔNG được báo là đã trôi
  assert.equal(compareLock(null, CUES).locked, false);
  assert.equal(compareLock(null, CUES).changed.length, 0);
});

test('hash chỉ phụ thuộc CHỮ, không phụ thuộc trường khác của cue', () => {
  assert.equal(hashText('a'), hashText('a'));
  assert.notEqual(hashText('a'), hashText('b'));
  const lock = makeLock(CUES, {});
  const sameTextOtherFields = CUES.map((c) => ({ ...c, frames: 999, scene: 'khác' }));
  assert.equal(compareLock(lock, sameTextOtherFields).changed.length, 0,
    'đổi `frames`/`scene` KHÔNG phải đổi lời — nếu không, mọi lần chỉnh nhịp đều báo trôi giả');
});
