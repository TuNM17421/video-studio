/** npm run test:tools — đây là chỗ duy nhất chặn được việc agent bịa trích dẫn, nên nó phải đúng. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDossier, MIN_QUOTE_CHARS } from './scout-verify.mjs';

const PAGE = `Prompt engineering là cách viết yêu cầu cho mô hình ngôn ngữ.
Một prompt tốt nêu rõ vai trò, nhiệm vụ, bối cảnh và định dạng đầu ra mong muốn.
Nghiên cứu năm 2024 cho thấy cách hỏi ảnh hưởng tới chất lượng trả lời nhiều hơn là chọn mô hình nào.`;

const LONG = 'Một prompt tốt nêu rõ vai trò, nhiệm vụ, bối cảnh và định dạng đầu ra mong muốn.';

function dossier(over = {}) {
  return {
    topic: 'Prompt engineering',
    createdAt: '2026-09-17T00:00:00.000Z',
    sources: [
      { id: 's1', url: 'https://a.example/x', title: 'A', publisher: 'A', published: '2024-05-01', fetchedAt: '', file: 'sources/s1.md', trust: 'cao', why: '', quotes: [LONG] },
      { id: 's2', url: 'https://b.example/y', title: 'B', publisher: 'B', published: null, fetchedAt: '', file: 'sources/s2.md', trust: 'vua', why: '', quotes: [LONG] },
    ],
    cues: { 1: ['s1', 's2'], 2: ['s1', 's2'] },
    ...over,
  };
}

const readAll = () => PAGE;
const check = (over, opts = {}) => checkDossier({ dossier: dossier(over), readSource: readAll, minSources: 2, ...opts });

test('một hồ sơ đầy đủ thì đạt', () => {
  const r = check();
  assert.equal(r.ok, true, r.problems.join(' · '));
  assert.equal(r.quotes.ok, 2);
  assert.equal(r.sources.fetched, 2);
  assert.deepEqual(r.cues.map((c) => c.level), ['ok', 'ok']);
});

test('trích đoạn không có trong trang đã tải thì trượt — đây là cái bẫy chính', () => {
  const r = check({
    sources: [{ ...dossier().sources[0], quotes: ['Nghiên cứu năm 2024 cho thấy chất lượng trả lời tăng đúng bốn mươi phần trăm.'] }],
    cues: { 1: ['s1'] },
  });
  assert.equal(r.ok, false);
  assert.equal(r.quotes.ok, 0);
  assert.match(r.quotes.problems[0].reason, /không có trong trang/);
});

test('xuống dòng khác chỗ vẫn khớp, vì trang web ngắt dòng theo trình bày', () => {
  const wrapped = LONG.replace(/ /g, '\n   ');
  const r = check({ sources: [{ ...dossier().sources[0], quotes: [wrapped] }], cues: { 1: ['s1'] } });
  assert.equal(r.quotes.ok, 1, 'gộp khoảng trắng trước khi so');
});

test('trích đoạn quá ngắn không được tính là bằng chứng', () => {
  const short = 'prompt engineering';
  assert.ok(short.length < MIN_QUOTE_CHARS);
  const r = check({ sources: [{ ...dossier().sources[0], quotes: [short] }], cues: { 1: ['s1'] } });
  assert.equal(r.ok, false);
  assert.match(r.quotes.problems[0].reason, /quá ngắn/);
});

test('nguồn chưa tải trang thì trích dẫn của nó không đối chiếu được', () => {
  const r = check({ sources: [{ ...dossier().sources[0], file: null }], cues: { 1: ['s1'] } });
  assert.equal(r.ok, false);
  assert.equal(r.sources.unfetched, 1);
  assert.match(r.quotes.problems[0].reason, /chưa tải trang/);
});

test('câu chưa đủ số nguồn tối thiểu thì cảnh báo, chưa có nguồn nào thì báo lỗi', () => {
  const r = check({ cues: { 1: ['s1'], 2: [] } });
  assert.equal(r.cues.find((c) => c.n === 1).level, 'warn');
  assert.equal(r.cues.find((c) => c.n === 2).level, 'error');
  assert.equal(r.ok, false);
});

test('gắn một id nguồn không có trong hồ sơ là lỗi, không phải bỏ qua', () => {
  const r = check({ cues: { 1: ['s1', 's9'] } });
  const row = r.cues.find((c) => c.n === 1);
  assert.equal(row.level, 'error');
  assert.match(row.note, /s9/);
});

test('câu có trong kịch bản mà hồ sơ bỏ quên vẫn bị bắt', () => {
  // Hồ sơ chỉ khai câu 1–2; kịch bản có ba câu. Duyệt theo khoá của hồ sơ sẽ không bao giờ thấy câu 3.
  const r = check({}, { cueNumbers: [1, 2, 3] });
  assert.equal(r.cues.length, 3);
  assert.equal(r.cues.find((c) => c.n === 3).level, 'error');
});

test('đọc không được file nguồn thì trượt, không im lặng cho qua', () => {
  const r = checkDossier({ dossier: dossier(), readSource: () => null, minSources: 2 });
  assert.equal(r.ok, false);
  assert.equal(r.quotes.ok, 0);
});

test('lượt từ slide: câu chỉ dựa trên slide là đủ nguồn', () => {
  const r = check({ cues: { 1: ['slide:2'], 2: ['slide:3', 'slide:4'] } });
  assert.deepEqual(r.cues.map((c) => [c.n, c.level, c.slides]), [[1, 'ok', [2]], [2, 'ok', [3, 4]]]);
});

test('lượt từ slide: gắn thêm "slide:" không bù được nguồn web còn thiếu', () => {
  // Câu đã dùng kết quả research (có s1) thì vẫn phải đủ số nguồn web, dù cũng dựa trên slide.
  const r = check({ cues: { 1: ['slide:3', 's1'] } });
  const row = r.cues.find((c) => c.n === 1);
  assert.equal(row.level, 'warn');
  assert.deepEqual(row.slides, [3]);
  assert.deepEqual(row.sources, ['s1']);
});

// ── bốn bước soát của lượt từ slide ─────────────────────────────────────────────

const slideCheck = (over = {}, slide = {}) => check(over, {
  cueNumbers: [1, 2],
  slide: {
    outline: [{ slide: 1, heading: 'Mở đầu', points: ['a'] }, { slide: 2, heading: 'Số liệu', points: ['b'] }],
    items: [{ id: 'm1', title: 'Số người dùng', kind: 'so-lieu' }],
    conclusions: { m1: { verdict: 'xac-nhan', sources: ['s1', 's2'] } },
    ...slide,
  },
});

test('lượt từ slide đầy đủ thì đạt cả bốn bước soát', () => {
  const r = slideCheck({ cues: { 1: ['slide:1'], 2: ['slide:2', 's1', 's2'] } });
  assert.equal(r.ok, true, r.problems.join(' · '));
  assert.deepEqual(r.slide.coverage, { slides: 2, covered: 2, missing: [] });
});

test('hai trang cùng một tên miền chỉ là một nơi xuất bản', () => {
  const same = dossier().sources.map((s) => ({ ...s, url: `https://news.example.vn/${s.id}`, publisher: '' }));
  const r = slideCheck({ sources: same, cues: { 1: ['slide:1'], 2: ['slide:2', 's1', 's2'] } });
  assert.equal(r.slide.independence.length, 1);
  assert.equal(r.cues.find((c) => c.n === 2).level, 'warn');
  assert.equal(r.ok, false);
});

test('khác tên miền nhưng cùng nhà xuất bản cũng chỉ là một nơi', () => {
  const google = [
    { ...dossier().sources[0], url: 'https://ai.google.dev/docs', publisher: 'Google' },
    { ...dossier().sources[1], url: 'https://blog.google/ai', publisher: 'google' },
  ];
  const r = slideCheck({ sources: google, cues: { 1: ['slide:1'], 2: ['slide:2', 's1', 's2'] } });
  assert.equal(r.slide.independence.length, 1);
});

test('mục "có thể đã cũ" cần một nguồn trong 12 tháng trước lượt chạy', () => {
  const items = [{ id: 'm1', title: 'Mô hình mới nhất', kind: 'cap-nhat' }];
  // hồ sơ tạo 2026-09-17; s1 đăng 2024-05-01, s2 không ghi ngày
  const old = slideCheck({ cues: { 1: ['slide:1'], 2: ['slide:2', 's1', 's2'] } }, { items });
  assert.deepEqual(old.slide.recency, [{ item: 'm1', title: 'Mô hình mới nhất', newest: '2024-05-01', undated: 1 }]);
  const fresh = dossier().sources.map((s, i) => (i === 0 ? { ...s, published: '2026-06-01' } : s));
  const ok = slideCheck({ sources: fresh, cues: { 1: ['slide:1'], 2: ['slide:2', 's1', 's2'] } }, { items });
  assert.deepEqual(ok.slide.recency, []);
});

test('slide có nội dung mà không câu nào dựa vào thì bị báo', () => {
  const r = slideCheck({ cues: { 1: ['slide:1'], 2: ['s1', 's2'] } });
  assert.deepEqual(r.slide.coverage.missing, [2]);
  assert.equal(r.ok, false);
});

test('kết luận dựa trên nguồn chưa tải hoặc không có trích đoạn soát được thì trượt', () => {
  const unfetched = dossier().sources.map((s, i) => (i === 1 ? { ...s, file: null } : s));
  const r = slideCheck({ sources: unfetched, cues: { 1: ['slide:1'], 2: ['slide:2', 's1'] } }, { conclusions: { m1: { verdict: 'xac-nhan', sources: ['s1', 's2', 's9'] } } });
  const f = r.slide.findings.find((x) => x.item === 'm1');
  assert.ok(f.problems.some((p) => /s2 chưa tải/.test(p)));
  assert.ok(f.problems.some((p) => /s9 không có trong hồ sơ/.test(p)));
});

test('mục đã duyệt mà chưa có kết luận thì bị báo', () => {
  const r = slideCheck({ cues: { 1: ['slide:1'], 2: ['slide:2', 's1', 's2'] } }, { conclusions: {} });
  assert.deepEqual(r.slide.findings, [{ item: 'm1', problems: ['chưa có kết luận'] }]);
});
