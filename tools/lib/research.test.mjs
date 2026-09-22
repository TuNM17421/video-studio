/** npm run test:tools — pipeline research: tải trang, tìm đoạn, soát bằng chứng, soát kịch bản, thư viện dữ kiện. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fetchPage, isInternalHost, isoDay, isTransient, pageMeta, urlKey } from './fetch-page.mjs';
import { findPassages, quoteInText } from './page-text.mjs';
import { checkExtract, checkFinding, checkScript, publisherCount } from './research-check.mjs';
import { factForReuse, factSlug, findingFromFact, isFresh, lookupFact, saveFact } from './research-facts.mjs';
import { readIndex, saveSource, sourceIdFor } from './research-store.mjs';
import { lintScript, parseRefs, parseScript } from './script-lint.mjs';

const DELIVERIES = { ke: { label: 'kể' }, giang: { label: 'giảng' }, nhe: { label: 'thân mật' }, hoi: { label: 'hỏi' }, nhan: { label: 'chốt' } };
const DAY = 24 * 3600 * 1000;

// ── tải trang ─────────────────────────────────────────────────────────────────────

test('đọc tiêu đề, nơi xuất bản và ngày từ thẻ meta và JSON-LD', () => {
  const html = `<html><head><title>Bị thay</title>
    <meta property="og:title" content="Models &amp; context">
    <meta content="OpenAI" property="og:site_name">
    <script type="application/ld+json">{"@graph":[{"@type":"Article","datePublished":"2026-03-02T10:00:00Z","dateModified":"2026-05-01"}]}</script>
    </head><body>x</body></html>`;
  assert.deepEqual(pageMeta(html), { title: 'Models & context', publisher: 'OpenAI', published: '2026-03-02', modified: '2026-05-01', image: null });
});

test('trang không khai ngày thì ngày là null, không đoán', () => {
  assert.equal(pageMeta('<title>T</title><p>Cập nhật 2025</p>').published, null);
  assert.equal(isoDay('không phải ngày'), null);
  assert.equal(isoDay('March 2, 2026'), '2026-03-02');
});

test('URL làm khoá bỏ phần #', () => {
  assert.equal(urlKey('https://a.dev/x#y'), 'https://a.dev/x');
});

const PUBLIC_DNS = async () => [{ address: '93.184.216.34', family: 4 }];

test('fetchPage không gửi yêu cầu nào tới địa chỉ nội bộ: kể cả qua chuyển hướng hay qua DNS', async () => {
  const called = [];
  const redirectTo = (target) => async (url) => {
    called.push(url);
    return new Response(null, { status: 302, headers: { location: target } });
  };
  // chuyển hướng về 127.0.0.1: dừng trước khi gọi bước đó (fetch tự đi theo thì yêu cầu đã đi rồi mới kiểm)
  const viaRedirect = await fetchPage('https://a.dev/x', { fetchImpl: redirectTo('http://127.0.0.1:3100/api'), lookup: PUBLIC_DNS });
  assert.match(viaRedirect.error, /chuyển hướng về địa chỉ nội bộ/);
  assert.deepEqual(called, ['https://a.dev/x']);
  // tên miền công khai mà phân giải về mạng nội bộ
  const viaDns = await fetchPage('https://evil.example/', { fetchImpl: redirectTo('x'), lookup: async () => [{ address: '10.0.0.5', family: 4 }] });
  assert.match(viaDns.error, /trỏ về địa chỉ nội bộ/);
  assert.equal(called.length, 1);
  // CGNAT và cách viết số của 127.0.0.1 — bản chặn cũ của fetch-page để lọt
  assert.equal(isInternalHost('http://100.64.0.1/'), true);
  assert.equal(isInternalHost('http://2130706433/'), true);
  // không phân giải được là lỗi tạm thời như lỗi mạng khác
  const noDns = await fetchPage('https://nowhere.example/', { fetchImpl: redirectTo('x'), lookup: async () => { throw Object.assign(new Error('x'), { code: 'ENOTFOUND' }); } });
  assert.equal(isTransient(noDns), true);
});

test('fetchPage không ném lỗi: HTTP lỗi, PDF, trang rỗng đều thành kết quả', async () => {
  const fake = (status, type, body) => async () => new Response(body, { status, headers: { 'content-type': type } });
  const opts = (fetchImpl) => ({ fetchImpl, lookup: PUBLIC_DNS });
  assert.equal((await fetchPage('https://a.dev', opts(fake(403, 'text/html', 'no')))).error, 'HTTP 403');
  assert.match((await fetchPage('https://a.dev', opts(fake(200, 'application/pdf', 'x')))).error, /PDF/);
  assert.match((await fetchPage('https://a.dev', opts(fake(200, 'text/html', '<p>ít chữ</p>')))).error, /JavaScript/);
  const ok = await fetchPage('https://a.dev', opts(fake(200, 'text/html; charset=utf-8', `<title>T</title><p>${'chữ '.repeat(200)}</p>`)));
  assert.equal(ok.ok, true);
  assert.equal(ok.title, 'T');
  assert.equal((await fetchPage('ftp://x')).ok, false);
});

// ── tìm đoạn, so trích đoạn ───────────────────────────────────────────────────────

const PAGE = [
  'Giới thiệu về mô hình.',
  'GPT-4 Turbo has a 128,000 token context window and knowledge up to April 2023.',
  'Pricing is per token.',
  `${'Một đoạn rất dài. '.repeat(60)}Context window ở đây là 8,192 token cho GPT-4 gốc. ${'Phần đuôi dài. '.repeat(60)}`,
].join('\n');

test('findPassages ưu tiên đoạn khớp nhiều từ khoá, giữ thứ tự trang, cắt đoạn dài', () => {
  const hits = findPassages(PAGE, ['context window', '128,000'], { max: 2 });
  assert.deepEqual(hits.map((h) => h.line), [2, 4]);
  assert.equal(hits[0].hits, 2);
  assert.ok(hits[1].text.startsWith('…') && hits[1].text.endsWith('…'));
  assert.ok(hits[1].text.length < 800);
  assert.deepEqual(findPassages(PAGE, ['   ']), []);
});

test('trích đoạn chép từ đoạn đã cắt (có … hai đầu) vẫn khớp; lược giữa phải đúng thứ tự', () => {
  const clipped = findPassages(PAGE, ['8,192'])[0].text;
  assert.ok(quoteInText(clipped, PAGE));
  assert.ok(quoteInText('GPT-4 Turbo has a 128,000 token … knowledge up to April 2023', PAGE));
  assert.equal(quoteInText('knowledge up to April 2023 … GPT-4 Turbo has a 128,000 token', PAGE), false);
  assert.equal(quoteInText('GPT-4 Turbo has a 256,000 token context window', PAGE), false);
});

// ── lưu nguồn ─────────────────────────────────────────────────────────────────────

function tmpRun() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'research-'));
  const dir = path.join(root, 'bai-1');
  fs.mkdirSync(dir);
  return dir;
}

test('saveSource cấp sid mới cho URL mới, dùng lại sid cho URL cũ và URL cuối', () => {
  const dir = tmpRun();
  const a = saveSource(dir, 'https://a.dev/x#top', { ok: true, finalUrl: 'https://a.dev/x/', text: 'chữ' });
  const b = saveSource(dir, 'https://b.dev', { ok: false, error: 'HTTP 404' });
  assert.equal(a, 's1');
  assert.equal(b, 's2');
  assert.equal(saveSource(dir, 'https://a.dev/x/', { ok: true, text: 'chữ mới' }), 's1');
  assert.equal(sourceIdFor(dir, 'https://a.dev/x'), 's1');
  assert.equal(readIndex(dir).next, 3);
  assert.equal(fs.readFileSync(path.join(dir, 'sources/s1/page.txt'), 'utf8'), 'chữ mới');
});

test('nhiều page.mjs chạy cùng lúc không cấp trùng sid, không làm mất nguồn', async () => {
  const dir = tmpRun();
  const store = new URL('./research-store.mjs', import.meta.url).href;
  const { execFile } = await import('node:child_process');
  const run = (i) => new Promise((resolve, reject) => execFile(process.execPath, ['-e',
    `import(${JSON.stringify(store)}).then((m) => process.stdout.write(m.saveSource(${JSON.stringify(dir)}, 'https://a.dev/${i}', { ok: true, text: 'trang ${i}' })))`,
  ], (error, stdout) => (error ? reject(error) : resolve(stdout))));
  const sids = await Promise.all(Array.from({ length: 8 }, (_, i) => run(i)));
  assert.equal(new Set(sids).size, 8);
  const idx = readIndex(dir);
  assert.equal(Object.keys(idx.sources).length, 8);
  assert.equal(idx.next, 9);
  for (let i = 0; i < 8; i++) assert.equal(fs.readFileSync(path.join(dir, 'sources', idx.urls[`https://a.dev/${i}`], 'page.txt'), 'utf8'), `trang ${i}`);
  assert.equal(fs.existsSync(path.join(dir, 'sources', '.index.lock')), false);
});

// ── soát bóc tách ─────────────────────────────────────────────────────────────────

const CLAIM = { id: 'c1', slides: [2], text: 'GPT-4 có cửa sổ ngữ cảnh 128K token', question: 'Cửa sổ ngữ cảnh của GPT-4?', kind: 'number', difficulty: 'normal', timeSensitive: true, priority: 'high', key: 'gpt-4 context window' };

test('checkExtract bắt id trùng, loại lạ, số slide không có thật', () => {
  const outline = { outline: [{ slide: 1, heading: 'Mở đầu', skip: true }, { slide: 2, heading: 'Token', points: ['a'] }] };
  assert.equal(checkExtract({ outline, claims: { claims: [CLAIM] }, slideCount: 2 }).ok, true);
  const bad = checkExtract({ outline, claims: { claims: [CLAIM, { ...CLAIM, kind: 'khác', slides: [9] }] }, slideCount: 2 });
  assert.equal(bad.ok, false);
  assert.ok(bad.problems.some((p) => /trùng/.test(p)));
  assert.ok(bad.problems.some((p) => /kind/.test(p)));
  assert.ok(bad.problems.some((p) => /slides/.test(p)));
});

// ── soát bằng chứng ───────────────────────────────────────────────────────────────

const NOW = Date.parse('2026-09-19');
const SOURCES = {
  s1: { id: 's1', url: 'https://platform.openai.com/docs/models', publisher: 'OpenAI', published: '2026-03-02', text: PAGE },
  s2: { id: 's2', url: 'https://help.openai.com/x', publisher: 'OpenAI', published: '2026-01-01', text: PAGE },
  s3: { id: 's3', url: 'https://www.theverge.com/y', publisher: 'The Verge', published: '2024-01-01', text: PAGE },
  s4: { id: 's4', url: 'https://papers.dev/z.pdf', text: null, error: 'trang là PDF' },
};
const resolveSource = (ref) => SOURCES[ref] ?? null;
const QUOTE = 'GPT-4 Turbo has a 128,000 token context window';
const finding = (patch = {}) => ({
  claim: 'c1', verdict: 'fix', answer: 'GPT-4 Turbo: 128K', corrected: 'GPT-4 Turbo có cửa sổ 128K token',
  sources: [{ id: 's1', kind: 'official' }, { id: 's3', kind: 'news' }],
  evidence: [{ source: 's1', quote: QUOTE, stance: 'supports' }],
  ...patch,
});

test('một nguồn chính thức đủ cho claim thường; trích đoạn phải có trong trang gốc', () => {
  assert.equal(checkFinding({ claim: CLAIM, finding: finding(), resolveSource, referenceDate: NOW }).ok, true);
  const fake = checkFinding({ claim: CLAIM, finding: finding({ evidence: [{ source: 's1', quote: 'GPT-4 Turbo has a 256,000 token context window', stance: 'supports' }] }), resolveSource, referenceDate: NOW });
  assert.equal(fake.ok, false);
  assert.ok(fake.problems.some((p) => /nguyên văn/.test(p)));
});

test('hai trang cùng nơi xuất bản không phải hai nguồn độc lập', () => {
  assert.equal(publisherCount([SOURCES.s1, SOURCES.s2]), 1);
  const r = checkFinding({
    claim: { ...CLAIM, difficulty: 'hard' },
    finding: finding({ sources: [{ id: 's1', kind: 'news' }, { id: 's2', kind: 'news' }], evidence: [{ source: 's1', quote: QUOTE, stance: 'supports' }, { source: 's2', quote: QUOTE, stance: 'supports' }] }),
    resolveSource, referenceDate: NOW,
  });
  assert.ok(r.problems.some((p) => /2 nơi xuất bản/.test(p)));
});

test('kết luận "cần sửa" lấy cả trích đoạn phản bác slide làm căn cứ; kết luận "ok" thì không', () => {
  const both = { sources: [{ id: 's1', kind: 'news' }, { id: 's3', kind: 'news' }], evidence: [{ source: 's1', quote: QUOTE, stance: 'supports' }, { source: 's3', quote: QUOTE, stance: 'contradicts' }] };
  const hard = { ...CLAIM, difficulty: 'hard', timeSensitive: false };
  assert.equal(checkFinding({ claim: hard, finding: finding(both), resolveSource, referenceDate: NOW }).ok, true);
  const ok = checkFinding({ claim: hard, finding: finding({ ...both, verdict: 'ok', corrected: undefined }), resolveSource, referenceDate: NOW });
  assert.ok(ok.problems.some((p) => /2 nơi xuất bản/.test(p)));
  assert.ok(ok.warnings.some((w) => /phản bác/.test(w)));
});

test('dữ kiện hay đổi mà nguồn cũ hơn 12 tháng thì trượt; không ghi ngày chỉ cảnh báo', () => {
  const old = checkFinding({ claim: CLAIM, finding: finding({ sources: [{ id: 's3', kind: 'official' }], evidence: [{ source: 's3', quote: QUOTE, stance: 'supports' }] }), resolveSource, referenceDate: NOW });
  assert.ok(old.problems.some((p) => /12 tháng/.test(p)));
  const undated = { ...SOURCES.s1, published: null };
  const r = checkFinding({ claim: CLAIM, finding: finding(), resolveSource: (ref) => (ref === 's1' ? undated : null), referenceDate: NOW });
  assert.equal(r.ok, true);
  assert.ok(r.warnings.some((w) => /ghi ngày/.test(w)));
});

test('trang không đọc được: cảnh báo, và claim vẫn cần một trích đoạn soát được', () => {
  const r = checkFinding({ claim: CLAIM, finding: finding({ sources: [{ id: 's4', kind: 'paper' }], evidence: [{ source: 's4', quote: QUOTE, stance: 'supports' }] }), resolveSource, referenceDate: NOW });
  assert.equal(r.ok, false);
  assert.equal(r.quotes.unverifiable, 1);
  assert.ok(r.warnings.some((w) => /PDF/.test(w)));
});

test('insufficient hợp lệ khi có lý do; fix thiếu câu sửa thì trượt; trích đoạn ngắn thì trượt', () => {
  assert.equal(checkFinding({ claim: CLAIM, finding: { claim: 'c1', verdict: 'insufficient', answer: 'chưa rõ', reason: 'không nguồn nào nói', evidence: [] }, resolveSource, referenceDate: NOW }).ok, true);
  assert.ok(checkFinding({ claim: CLAIM, finding: finding({ corrected: '' }), resolveSource, referenceDate: NOW }).problems.some((p) => /corrected/.test(p)));
  assert.ok(checkFinding({ claim: CLAIM, finding: finding({ evidence: [{ source: 's1', quote: 'GPT-4 Turbo', stance: 'supports' }] }), resolveSource, referenceDate: NOW }).problems.some((p) => /ngắn/.test(p)));
});

// ── thư viện dữ kiện ──────────────────────────────────────────────────────────────

test('dữ kiện đã kiểm được lưu, tra lại theo key (không phân biệt hoa thường), hết hạn thì bỏ qua', () => {
  const dir = tmpRun();
  const f = finding();
  const file = saveFact(dir, { claim: CLAIM, finding: f, sources: { s1: { url: SOURCES.s1.url } }, runId: 'bai-1', checkedAt: new Date(NOW).toISOString() });
  // Tên file đặt theo **câu của slide**, không theo `key`: `key` do chặng bóc tách nghĩ ra lại mỗi lượt.
  assert.match(file, /^_facts\/gpt-4-co-cua-so-ngu-canh-128k-token-[0-9a-f]{8}\.json$/);
  assert.equal(factSlug('Cửa sổ ngữ cảnh — GPT-4?'), 'cua-so-ngu-canh-gpt-4');
  const hit = lookupFact(dir, { ...CLAIM, key: 'GPT-4 Context Window' }, { now: NOW + 10 * DAY });
  assert.equal(hit.verdict, 'fix');
  assert.equal(hit.evidence[0].url, SOURCES.s1.url);
  assert.equal(lookupFact(dir, CLAIM, { now: NOW + 120 * DAY }), null);
  assert.equal(isFresh({ ...hit, timeSensitive: false }, NOW + 120 * DAY), true);
  assert.equal(isFresh({ ...hit, timeSensitive: false }, NOW + 120 * DAY, true), false);
  const reused = findingFromFact({ ...CLAIM, id: 'c7' }, hit);
  assert.equal(reused.claim, 'c7');
  assert.equal(reused.reused.from, file);
  assert.equal(saveFact(dir, { claim: CLAIM, finding: { ...f, verdict: 'insufficient' }, sources: {}, runId: 'x' }), null);
});

test('không dùng lại dữ kiện khi câu slide khác, khi là của chính lượt này, hay khi hai khoá chỉ giống slug', () => {
  const dir = tmpRun();
  saveFact(dir, { claim: CLAIM, finding: finding(), sources: {}, runId: 'bai-1', checkedAt: new Date(NOW).toISOString() });
  const opts = { now: NOW + DAY };
  // cùng khoá, slide khác số liệu → kết luận của bài trước không áp được
  assert.equal(lookupFact(dir, { ...CLAIM, text: 'GPT-4 có cửa sổ ngữ cảnh 32K token' }, opts), null);
  assert.equal(lookupFact(dir, CLAIM, { ...opts, excludeRun: 'bai-1' }), null);
  assert.ok(lookupFact(dir, CLAIM, { ...opts, excludeRun: 'bai-2' }));
  // Hai câu slide chỉ khác nhau ở ký tự mà slug bỏ đi ("c++" / "c#") vẫn phải là hai dữ kiện: phần băm lấy
  // nguyên câu, không lấy slug.
  const cpp = { ...CLAIM, text: 'C++ ra đời năm 1985', key: 'c++ first release year', question: 'C++ ra đời năm nào?' };
  const csharp = { ...CLAIM, text: 'C# ra đời năm 1985', key: 'c# first release year', question: 'C# ra đời năm nào?' };
  saveFact(dir, { claim: cpp, finding: finding(), sources: {}, runId: 'x', checkedAt: new Date(NOW).toISOString() });
  assert.equal(lookupFact(dir, csharp, opts), null);
  assert.ok(lookupFact(dir, cpp, opts));
});

test('cùng câu slide nhưng hỏi chuyện khác thì không dùng lại', () => {
  const dir = tmpRun();
  saveFact(dir, { claim: CLAIM, finding: finding(), sources: {}, runId: 'bai-1', checkedAt: new Date(NOW).toISOString() });
  // Một dòng slide có thể sinh hai claim: một hỏi cửa sổ ngữ cảnh, một hỏi ngày ra mắt. Kết luận của cái
  // này không trả lời cho cái kia.
  const other = { ...CLAIM, key: 'gpt-4 release date', question: 'GPT-4 ra mắt khi nào?' };
  assert.equal(lookupFact(dir, other, { now: NOW + DAY }), null);
});

test('cùng câu slide thì dùng lại được dù chặng bóc tách đặt khoá khác đi', () => {
  const dir = tmpRun();
  saveFact(dir, { claim: CLAIM, finding: finding(), sources: {}, runId: 'bai-1', checkedAt: new Date(NOW).toISOString() });
  // `key` là cụm tiếng Anh agent tự nghĩ: số ít/số nhiều, viết tắt… đổi mỗi lượt. Câu slide thì không đổi.
  for (const key of ['gpt-4 context window size', 'GPT-4 context-window', 'gpt4 context window']) {
    const hit = lookupFact(dir, { ...CLAIM, key }, { now: NOW + DAY });
    assert.ok(hit, `phải dùng lại được với key "${key}"`);
    assert.equal(hit.verdict, 'fix');
  }
  // Nhưng câu slide khác thì vẫn phải research lại, dù khoá y hệt.
  assert.equal(lookupFact(dir, { ...CLAIM, text: 'GPT-4 có cửa sổ ngữ cảnh 32K token' }, { now: NOW + DAY }), null);
});

test('trích đoạn có lược: mỗi phần đủ dài và các phần phải gần nhau', () => {
  const page = `GPT-4 was released in March 2023 by OpenAI.\n${'Filler text here. '.repeat(40)}\nOther news: 32 people attended. Tokens are pieces of words used by the model.`;
  assert.equal(quoteInText('GPT-4 … 32 … tokens are pieces of words used by the model', page), false);
  assert.equal(quoteInText('GPT-4 was released … by OpenAI', page), true);
  assert.equal(quoteInText('GPT-4 was released in March 2023 … Tokens are pieces of words', page), false);
});

test('kết luận "slide sai" cũng phải đủ nguồn và đủ mới như "cần sửa"', () => {
  const r = checkFinding({
    claim: { ...CLAIM, difficulty: 'hard' },
    finding: finding({ verdict: 'wrong', sources: [{ id: 's3', kind: 'blog' }], evidence: [{ source: 's3', quote: QUOTE, stance: 'contradicts' }] }),
    resolveSource, referenceDate: NOW,
  });
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => /2 nơi xuất bản/.test(p)));
  assert.ok(r.problems.some((p) => /12 tháng/.test(p)));
});

// ── kịch bản ──────────────────────────────────────────────────────────────────────

const SCRIPT = `# Bài 2 · Token

- **Mục tiêu:** hiểu token là gì.
- **Thời lượng dự kiến:** khoảng một phút.

## 1 · Mở đầu

### Câu 1
- **Kiểu:** kể
- **Lời:** Mỗi lần bạn gõ một câu hỏi, mô hình không đọc từng chữ như bạn nghĩ.
- **Trên màn hình:** Một câu hỏi tách thành các mảnh nhỏ
- **Nguồn:** slide:1

### Câu 2
- **Kiểu:** giảng
- **Lời:** Nó đọc từng mảnh chữ, gọi là token, và cửa sổ của GPT-4 Turbo chứa được một trăm hai mươi tám nghìn mảnh như thế.
- **Trên màn hình:** GPT-4 Turbo · 128,000 token
- **Nguồn:** slide:2, c1
`;

test('parseScript đọc phần đầu, phần, câu và dòng nối tiếp', () => {
  const s = parseScript(`# T\n\n- **Mục tiêu:** dòng một\n  dòng hai\n\n## 1 · A\n\n### Câu 1\n- **Lời:** Xin chào các bạn nhé.\n`);
  assert.equal(s.title, 'T');
  assert.equal(s.header['mục tiêu'], 'dòng một dòng hai');
  assert.equal(s.cues[0].section, '1 · A');
  assert.equal(s.cues[0].fields['lời'], 'Xin chào các bạn nhé.');
  assert.deepEqual(parseRefs('slide:4, c3; C5, xyz'), { slides: [4], claims: ['c3', 'c5'], unknown: ['xyz'] });
});

test('lintScript: chữ số và kiểu lạ là problem; câu ngắn, viết tắt, nhiều câu là warning', () => {
  const s = parseScript(`# T\n- **Mục tiêu:** x\n## A\n### Câu 1\n- **Kiểu:** mạnh\n- **Lời:** Có 20 token trong JSON này. Rất nhiều.\n- **Trên màn hình:** x\n### Câu 2\n- **Kiểu:** chốt\n- **Lời:** Hết.\n- **Trên màn hình:** x\n`);
  const { issues } = lintScript(s, { deliveries: DELIVERIES });
  const has = (level, re) => issues.some((i) => i.level === level && re.test(i.message));
  assert.ok(has('problem', /chữ số/));
  assert.ok(has('problem', /mạnh/));
  assert.ok(has('warning', /JSON/));
  assert.ok(has('warning', /2 câu/));
  assert.ok(has('warning', /quá ngắn/));
});

test('checkScript: kịch bản đúng mẫu thì đạt; dẫn claim chưa qua soát thì trượt', () => {
  const outline = [{ slide: 1, heading: 'Mở đầu' }, { slide: 2, heading: 'Token' }, { slide: 3, heading: 'Cảm ơn', skip: true }];
  const known = `slide 2: 128,000 token`;
  const ok = checkScript({ markdown: SCRIPT, deliveries: DELIVERIES, outline, claims: { c1: { ok: true, verdict: 'fix' } }, knownText: known });
  assert.equal(ok.ok, true, JSON.stringify(ok.issues));
  assert.deepEqual(ok.coverage, { slides: 2, covered: 2, missing: [] });
  const failed = checkScript({ markdown: SCRIPT, deliveries: DELIVERIES, outline, claims: { c1: { ok: false, verdict: 'fix' } }, knownText: known });
  assert.ok(failed.issues.some((i) => i.level === 'problem' && /chưa qua soát/.test(i.message)));
  const noNumber = checkScript({ markdown: SCRIPT, deliveries: DELIVERIES, outline, claims: { c1: { ok: true, verdict: 'fix' } }, knownText: '' });
  assert.ok(noNumber.issues.some((i) => i.level === 'warning' && /128,000/.test(i.message)));
});

test('checkScript nhắc slide chưa có câu nào và claim cần sửa mà không dùng', () => {
  const outline = [{ slide: 1 }, { slide: 2 }, { slide: 4, heading: 'Bị bỏ' }];
  const r = checkScript({ markdown: SCRIPT, deliveries: DELIVERIES, outline, claims: { c1: { ok: true, verdict: 'fix' }, c2: { ok: true, verdict: 'wrong' } }, knownText: '128,000' });
  assert.deepEqual(r.coverage.missing, [4]);
  assert.ok(r.issues.some((i) => /c2/.test(i.message)));
});

test('dữ kiện tra ra theo câu hỏi (khoá đặt lại khác) vẫn qua được soát cờ dùng lại', () => {
  // Tra nhận khoá *hoặc* câu hỏi; soát lại từng đòi khoá — nên lượt sau đặt khoá khác đi thì chính dữ kiện vừa
  // dùng lại bị coi là cờ giả và claim đi research lại từ đầu.
  const dir = tmpRun();
  saveFact(dir, { claim: CLAIM, finding: finding(), sources: { s1: { url: SOURCES.s1.url } }, runId: 'bai-1', checkedAt: new Date(NOW).toISOString() });
  const rekeyed = { ...CLAIM, id: 'c4', key: 'gpt4 max context length' };
  const hit = lookupFact(dir, rekeyed, { now: NOW + DAY });
  assert.ok(hit);
  const reused = findingFromFact(rekeyed, hit);
  assert.ok(factForReuse(dir, rekeyed, reused));
  // cờ dùng lại vẫn phải khớp từng trường: đổi kết luận là cờ giả
  assert.equal(factForReuse(dir, rekeyed, { ...reused, verdict: 'ok' }), null);
  // và vẫn phải đúng điều đang hỏi: khoá khác *và* câu hỏi khác thì không nhận
  assert.equal(factForReuse(dir, { ...rekeyed, question: 'GPT-4 ra mắt khi nào?' }, reused), null);
});

test('checkScript không ghép chữ số của nguồn: 3.5 không thành 35, 1,2 không thành 12', () => {
  const outline = [{ slide: 1 }, { slide: 2 }];
  const script = (loi, screen) => SCRIPT.replace(/- \*\*Lời:\*\* Nó đọc[^\n]*/, `- **Lời:** ${loi}`).replace('GPT-4 Turbo · 128,000 token', screen);
  const run = (md, knownText) => checkScript({ markdown: md, deliveries: DELIVERIES, outline, claims: { c1: { ok: true, verdict: 'fix' } }, knownText });
  const flagged = (r, re) => r.issues.some((i) => re.test(i.message));
  // Nguồn nói 3.5% và 1,2 triệu — kịch bản đọc 35% hay ghi 35% / 12 là con số bịa, phải bị bắt.
  const src = 'slide 2: tỉ lệ lỗi 3.5%, 1,2 triệu người dùng, GPT-3.5';
  assert.ok(flagged(run(script('Tỉ lệ lỗi chỉ còn ba mươi lăm phần trăm với mô hình mới.', 'Tỉ lệ lỗi 35%'), src), /ba mươi lăm/));
  assert.ok(flagged(run(script('Tỉ lệ lỗi đã giảm mạnh với mô hình mới này.', 'Tỉ lệ lỗi 35%'), src), /"35%"/));
  assert.ok(flagged(run(script('Tỉ lệ lỗi đã giảm mạnh với mô hình mới này.', 'Người dùng: 12'), src), /"12"/));
  // Viết đúng thì qua — kể cả cách viết khác của cùng giá trị (3,5 ↔ 3.5; 128.000 ↔ 128,000 ↔ 128K).
  const same = run(script('Tỉ lệ lỗi đã giảm mạnh với mô hình mới này.', 'Tỉ lệ lỗi 3,5%'), src);
  assert.ok(!flagged(same, /con số/), JSON.stringify(same.issues));
  const thousands = run(script('Cửa sổ chứa được một trăm hai mươi tám nghìn token.', 'GPT-4 Turbo · 128.000 token'), 'slide 2: 128K token, 128,000');
  assert.ok(!flagged(thousands, /con số|lời đọc nói/), JSON.stringify(thousands.issues));
});
