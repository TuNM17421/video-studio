/**
 * Ba luật cấu trúc §3i (mở NỐI · kết GỢI · ba câu trắc nghiệm) và phép tách phần TRẦN THUẬT.
 *
 * Mỗi test đi kèm phép phá TẠI CHỖ: đổi đúng một thứ trong input rồi khẳng định kết quả đổi theo.
 * Nếu không có phần đó thì test chỉ đang chứng minh "hàm không ném", không chứng minh nó CANH gì.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { narrativeCues, structureProblems, structureSpec } from './text-gates.mjs';

const cue = (n, extra = {}) => ({ n, text: `Câu ${n} có lời.`, scene: 'c1', ...extra });
const REQ = (body) => body;

test('structureSpec đọc prev/next/quiz, và coi placeholder `<…>` là CHƯA khai', () => {
  const filled = structureSpec(REQ('- **prev**: `n5-05` — gọi lại "giả bằng tay"\n- **next**: Lab SPEC\n- **quiz**: `3`\n'));
  assert.equal(filled.quiz, 3);
  assert.ok('prev' in filled && 'next' in filled);

  // Khung do `new-video` sinh ra: chưa ai điền → check phải TỰ TẮT, không bắt lane chạy theo khung rỗng.
  const blank = structureSpec(REQ('- **prev**: `<id video liền trước>`\n- **next**: `<tên nguyên văn mục kế tiếp>`\n'));
  assert.ok(!('prev' in blank), 'placeholder không được tính là đã khai');
  assert.ok(!('next' in blank));

  // Video đầu series khai rõ là KHÔNG CÓ → vẫn tính là đã khai, nhưng không có từ neo nào.
  const first = structureSpec(REQ('- **prev**: KHÔNG CÓ (video đầu series)\n'));
  assert.ok('prev' in first);
  assert.equal(first.prev, null);

  assert.deepEqual(structureSpec(null), {});
});

test('khai `prev`/`next` mà thiếu cảnh → CHẶN; chưa khai → chỉ cảnh báo', () => {
  const cues = [cue(1), cue(2)];
  const blocked = structureProblems(cues, 'v', { prev: null, next: null });
  assert.equal(blocked.problems.length, 2, 'thiếu cả intro-link lẫn outro-next');
  assert.match(blocked.problems.join('\n'), /intro-link/);
  assert.match(blocked.problems.join('\n'), /outro-next/);

  // phá: cùng bộ cue đó nhưng REQUEST chưa khai gì → phải rơi xuống CẢNH BÁO, không chặn
  const warned = structureProblems(cues, 'v', {});
  assert.equal(warned.problems.length, 0, 'video cũ không khai `prev:`/`next:` KHÔNG được chuyển từ đạt sang trượt');
  assert.equal(warned.warnings.length, 2);

  // có đủ hai cảnh → hết đỏ
  const ok = structureProblems([cue(1, { scene: 'intro-link' }), cue(2), cue(3, { scene: 'outro-next' })], 'v', { prev: null, next: null });
  assert.equal(ok.problems.length, 0);
});

test('cảnh intro-link phải gọi lại từ neo khai ở `prev:` — và id video KHÔNG phải từ neo', () => {
  const spec = structureSpec('- **prev**: `n5-05-prototype-pilot-mvp-poc` — gọi lại "giả bằng tay"\n- **next**: x\n');
  const withAnchor = [cue(1, { scene: 'intro-link', text: 'Phần khó nhất có giả bằng tay được không.' }), cue(2, { scene: 'outro-next' })];
  assert.equal(structureProblems(withAnchor, 'v', spec).problems.length, 0);

  // phá: bỏ đúng cụm neo ra khỏi lời → đỏ
  const without = [cue(1, { scene: 'intro-link', text: 'Hôm nay chúng ta học về thiết kế.' }), cue(2, { scene: 'outro-next' })];
  assert.match(structureProblems(without, 'v', spec).problems.join('\n'), /không gọi lại ý nào đã khai/);

  /*
   * Báo oan đã gặp thật 22/09/2026: id video và tên cảnh nằm trong backtick của chính dòng `prev:`
   * bị tính thành "từ neo", nên `d05-v06` — video đã đạt — bỗng đỏ. Chỉ cụm trong dấu NHÁY KÉP và
   * có khoảng trắng mới là từ neo.
   */
  const onlyIds = structureSpec('- **prev**: `n5-05-prototype-pilot-mvp-poc` — cảnh `intro-link` nối vào bài đó\n');
  assert.equal(structureProblems(without, 'v', onlyIds).problems.length, 0, 'không khai cụm neo nào thì chỉ kiểm có cảnh');
});

test('`quiz: true` chỉ được đặt ở cue LẶNG, và số cue quiz phải khớp REQUEST', () => {
  const good = [
    cue(1, { scene: 'intro-link' }),
    cue(2, { scene: 'quiz-1', text: '', silent: true, quiz: true }),
    cue(3, { scene: 'outro-next' }),
  ];
  assert.equal(structureProblems(good, 'v', { prev: null, next: null, quiz: 1 }).problems.length, 0);

  // phá 1: cùng cue đó nhưng CÓ LỜI → nhạc quiz sẽ đè lên tiếng nói
  const loud = good.map((c) => (c.quiz ? { ...c, silent: false, text: 'Đáp án là số ba.' } : c));
  assert.match(structureProblems(loud, 'v', { prev: null, next: null, quiz: 1 }).problems.join('\n'), /KHÔNG phải cue lặng/);

  // phá 2: REQUEST khai 3 nhưng chỉ có 1
  assert.match(structureProblems(good, 'v', { prev: null, next: null, quiz: 3 }).problems.join('\n'), /khai `quiz: 3` nhưng có 1/);

  // chưa khai `quiz:` → chỉ cảnh báo, không chặn (video cũ)
  const old = structureProblems(good, 'v', {});
  assert.equal(old.problems.length, 0);
  assert.match(old.warnings.join('\n'), /chưa khai `quiz:`/);
});

test('narrativeCues bỏ cảnh quiz-* và cue lặng — đây là chỗ chỉ số tụt oan', () => {
  const cues = [
    cue(1, { scene: 'intro-link' }),
    cue(2, { scene: 'c1' }),
    cue(3, { scene: 'quiz-1' }),
    cue(4, { scene: 'quiz-1', text: '', silent: true, quiz: true }),
    cue(5, { scene: 'outro-next' }),
  ];
  const nar = narrativeCues(cues);
  assert.deepEqual(nar.map((c) => c.n), [1, 2, 5]);
  // phá: nếu KHÔNG tách, 2/5 cue của bài là quiz và mọi chỉ số "mỗi N cue một lần" tụt 40%.
  assert.ok(nar.length < cues.length);
});
