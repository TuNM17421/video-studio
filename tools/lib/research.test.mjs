/** npm run test:tools — pipeline research: tải trang, tìm đoạn, soát bằng chứng, soát kịch bản, thư viện dữ kiện. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPage, isInternalHost, isoDay, isTransient, pageMeta, urlKey } from './fetch-page.mjs';
import { findPassages, quoteInText } from './page-text.mjs';
import { checkExtract, checkFinding, checkScript, claimCap, publisherCount } from './research-check.mjs';
import { factForReuse, factSlug, findingFromFact, isFresh, lookupFact, saveFact } from './research-facts.mjs';
import { readIndex, saveSource, sourceIdFor } from './research-store.mjs';
import { durationPhrase, lintScript, parseRefs, parseScript, spokenNumbers, syncDuration } from './script-lint.mjs';

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

test('checkExtract: slide là số trang — không trùng, không hổng, tới đúng trang cuối', () => {
  const claims = { claims: [{ ...CLAIM, slides: [2] }] };
  const outline = (numbers, pages) => ({ ...(pages ? { pages } : {}), outline: numbers.map((slide) => ({ slide, heading: `Trang ${slide}` })) });
  assert.equal(checkExtract({ outline: outline([1, 2, 3], 3), claims, slideCount: null }).ok, true);
  // Lượt thật: hai mục cùng số 47, và số tự đếm bỏ qua vài trang.
  const twice = checkExtract({ outline: outline([1, 2, 2, 3]), claims, slideCount: null });
  assert.ok(twice.problems.some((p) => /slide 2 có hơn một mục/.test(p)), JSON.stringify(twice.problems));
  const gaps = checkExtract({ outline: outline([1, 2, 5, 6, 7, 9]), claims, slideCount: null });
  assert.ok(gaps.problems.some((p) => /thiếu mục cho slide 3–4, 8/.test(p)), JSON.stringify(gaps.problems));
  // Tổng số trang: Studio đếm được thì theo Studio, không thì theo `pages` agent ghi (PDF mã hoá).
  assert.ok(checkExtract({ outline: outline([1, 2, 3], 5), claims, slideCount: null }).problems.some((p) => /file có 5 trang/.test(p)));
  assert.ok(checkExtract({ outline: outline([1, 2, 3], 3), claims, slideCount: 4 }).problems.some((p) => /file có 4 trang/.test(p)));
});

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
  // Dữ kiện do một bài trước lưu (bai-0) — lượt không bao giờ dùng lại dữ kiện của chính nó.
  saveFact(dir, { claim: CLAIM, finding: finding(), sources: { s1: { url: SOURCES.s1.url } }, runId: 'bai-0', checkedAt: new Date(NOW).toISOString() });
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

test('checkScript: nhóm của số có dấu nghìn không thành con số riêng (500 từ 1,500,000; 48 từ 2,048)', () => {
  const outline = [{ slide: 1 }, { slide: 2 }];
  const script = (loi, screen) => SCRIPT.replace(/- \*\*Lời:\*\* Nó đọc[^\n]*/, `- **Lời:** ${loi}`).replace('GPT-4 Turbo · 128,000 token', screen);
  const run = (md, knownText) => checkScript({ markdown: md, deliveries: DELIVERIES, outline, claims: { c1: { ok: true, verdict: 'fix' } }, knownText });
  const flagged = (r, re) => r.issues.some((i) => re.test(i.message));
  // Tái hiện lỗi sau 761a3ee: mỗi nhóm của "1,500,000" được tính là một con số có trong nguồn.
  assert.ok(flagged(run(script('Sản phẩm có năm trăm nghìn người dùng ngay tháng đầu.', 'Người dùng tháng đầu'), 'slide 2: 1,500,000 users'), /năm trăm nghìn/));
  assert.ok(flagged(run(script('Mô hình mới giảm bốn mươi tám phần trăm lỗi.', 'Lỗi giảm'), 'slide 2: 2,048 tokens'), /bốn mươi tám/));
  assert.ok(flagged(run(script('Giá tăng tới hai trăm phần trăm chỉ sau một năm.', 'Giá tăng'), 'slide 2: $1,200 price'), /hai trăm/));
  // Cả khối vẫn là con số có thật, đọc hay ghi kiểu nào cũng qua.
  const ok = run(script('Sản phẩm có một triệu năm trăm nghìn người dùng ngay tháng đầu.', 'Người dùng: 1.500.000'), 'slide 2: 1,500,000 users');
  assert.ok(!flagged(ok, /con số|lời đọc nói/), JSON.stringify(ok.issues));
  // Số phiên bản không có dấu nghìn: nhóm lẻ vẫn đọc riêng được ("bốn chấm sáu").
  const version = run(script('Claude Opus bốn chấm sáu là bản mạnh nhất của đợt này.', 'Claude Opus 4.6'), 'slide 2: Claude Opus 4.6');
  assert.ok(!flagged(version, /con số|lời đọc nói/), JSON.stringify(version.issues));
});

// ── soát bằng chứng chạy thật (research-verify.mjs) trên một lượt giả ─────────────────

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TWO_CLAIMS = [
  { id: 'c1', slides: [1], text: 'ChatGPT có 100 triệu người dùng sau hai tháng', question: 'ChatGPT đạt bao nhiêu người dùng sau hai tháng?', kind: 'number', difficulty: 'easy', timeSensitive: false, priority: 'normal', key: 'chatgpt users two months' },
  { id: 'c2', slides: [2], text: 'Transformer ra đời năm 2017', question: 'Transformer ra đời năm nào?', kind: 'date', difficulty: 'easy', timeSensitive: false, priority: 'normal', key: 'transformer year' },
];
const PAGE_TEXT = 'Reuters report. ChatGPT reached 100 million monthly active users in January, two months after launch, according to a UBS study.\n'
  + 'The Transformer architecture was introduced in the 2017 paper Attention Is All You Need by Vaswani and colleagues.';

/** Một lượt research giả dưới thư mục tạm: slide, dàn ý, hai claim, một trang nguồn đã tải (có vân tay). */
function fakeRun(name = 'bai-1', root = fs.mkdtempSync(path.join(os.tmpdir(), 'research-cli-'))) {
  const dir = path.join(root, name);
  fs.mkdirSync(path.join(dir, 'input'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify({ version: 1, id: name, createdAt: '2026-09-20T00:00:00Z', deck: { slides: 2 } }));
  fs.writeFileSync(path.join(dir, 'outline.json'), JSON.stringify({ outline: [{ slide: 1, heading: 'ChatGPT', points: ['100 triệu người dùng'] }, { slide: 2, heading: 'Transformer', points: ['2017'] }] }));
  fs.writeFileSync(path.join(dir, 'claims.json'), JSON.stringify({ claims: TWO_CLAIMS }));
  const sid = saveSource(dir, 'https://en.wikipedia.org/wiki/ChatGPT', { ok: true, text: PAGE_TEXT, publisher: 'Wikipedia', published: '2026-01-01' });
  return { dir, root, sid };
}
const writeFinding = (dir, cid, f) => {
  fs.mkdirSync(path.join(dir, 'claims', cid), { recursive: true });
  fs.writeFileSync(path.join(dir, 'claims', cid, 'finding.json'), JSON.stringify(f));
};
const honest = (sid, cid, answer, quote) => ({ claim: cid, verdict: 'ok', answer, sources: [{ id: sid, kind: 'reference' }], evidence: [{ source: sid, quote, stance: 'supports' }] });
const verifyCli = (dir, ...args) => {
  let out;
  try { out = execFileSync(process.execPath, [path.join(ROOT, 'tools/research-verify.mjs'), dir, ...args, '--json'], { cwd: ROOT, encoding: 'utf8' }); } catch (e) { out = e.stdout; }
  return JSON.parse(out.trim().split('\n').at(-1));
};
const factFiles = (root) => { try { return fs.readdirSync(path.join(root, '_facts')); } catch { return []; } };

test('lô sau ghi lại finding của claim đã soát xong thì lần soát của lô đó soát lại claim kia', () => {
  const { dir, sid } = fakeRun();
  writeFinding(dir, 'c1', honest(sid, 'c1', 'ChatGPT đạt 100 triệu người dùng sau hai tháng.', 'ChatGPT reached 100 million monthly active users in January'));
  assert.equal(verifyCli(dir, '--stage', 'evidence', '--claims', 'c1', '--no-fetch').claims.c1.ok, true);
  // Lô 2 chỉ được giao c2, nhưng agent ghi đè cả c1 với con số khác và trích đoạn bịa.
  writeFinding(dir, 'c2', honest(sid, 'c2', 'Transformer ra đời năm 2017.', 'The Transformer architecture was introduced in the 2017 paper'));
  writeFinding(dir, 'c1', { ...honest(sid, 'c1', 'ChatGPT đạt 500 triệu người dùng sau hai tháng.', 'x'), evidence: [{ source: sid, quote: 'totally fabricated quote that appears on no page at all', stance: 'supports' }] });
  const ev = verifyCli(dir, '--stage', 'evidence', '--claims', 'c2', '--no-fetch');
  assert.equal(ev.claims.c2.ok, true, JSON.stringify(ev.claims.c2));
  assert.equal(ev.claims.c1.ok, false, 'c1 bị ghi đè phải trượt soát, không giữ dấu "đạt" cũ');
  assert.ok(ev.claims.c1.warnings.some((w) => /ngoài lượt research/.test(w)), JSON.stringify(ev.claims.c1.warnings));
  // Không ai ghi lại c1 nữa thì lần soát sau không soát lại nó — dòng của c1 (kèm cảnh báo, vẫn đúng tới khi c1 được
  // research lại) giữ nguyên.
  const again = verifyCli(dir, '--stage', 'evidence', '--claims', 'c2', '--no-fetch');
  assert.deepEqual(again.claims.c1, ev.claims.c1);
});

test('dữ kiện chỉ vào thư viện khi cổng 2 đã qua (--save-facts), kèm cảnh báo lúc soát', () => {
  const { dir, root, sid } = fakeRun();
  writeFinding(dir, 'c1', honest(sid, 'c1', 'ChatGPT đạt 100 triệu người dùng sau hai tháng.', 'ChatGPT reached 100 million monthly active users in January'));
  verifyCli(dir, '--stage', 'evidence', '--claims', 'c1', '--no-fetch');
  assert.deepEqual(factFiles(root), [], 'soát xong chưa được lưu — người duyệt còn có thể bỏ claim ở cổng 2');
  const saved = verifyCli(dir, '--save-facts');
  assert.equal(saved.saved.length, 1);
  const fact = JSON.parse(fs.readFileSync(path.join(root, saved.saved[0].file), 'utf8'));
  assert.equal(fact.run, 'bai-1');
  assert.ok(Array.isArray(fact.warnings));
  // Claim bị bỏ ở cổng 2 (không còn trong claims.json) không vào thư viện.
  fs.writeFileSync(path.join(dir, 'claims.json'), JSON.stringify({ claims: [TWO_CLAIMS[1]] }));
  fs.rmSync(path.join(root, '_facts'), { recursive: true, force: true });
  assert.deepEqual(verifyCli(dir, '--save-facts').saved, []);
});

test('lượt không dùng lại dữ kiện chính nó lưu; "Research lại" gỡ dữ kiện đó khỏi thư viện', () => {
  const { dir, root, sid } = fakeRun();
  writeFinding(dir, 'c1', honest(sid, 'c1', 'ChatGPT đạt 100 triệu người dùng sau hai tháng.', 'ChatGPT reached 100 million monthly active users in January'));
  verifyCli(dir, '--stage', 'evidence', '--claims', 'c1', '--no-fetch');
  const [{ file }] = verifyCli(dir, '--save-facts').saved;
  const fact = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  // Agent chép lại đúng dữ kiện của lượt mình sau "Research lại": cờ dùng lại không được nhận.
  const own = findingFromFact(TWO_CLAIMS[0], { ...fact, file });
  assert.equal(factForReuse(dir, TWO_CLAIMS[0], own), null);
  const forgot = verifyCli(dir, '--forget-facts', '--claims', 'c1');
  assert.deepEqual(forgot.removed, [file]);
  assert.deepEqual(factFiles(root), []);
});

test('dùng lại ở bài sau: cảnh báo gốc hiện lại, dòng "dùng lại" là ghi chú không làm cổng 2 dừng', () => {
  const first = fakeRun('bai-1');
  writeFinding(first.dir, 'c1', honest(first.sid, 'c1', 'ChatGPT đạt 100 triệu người dùng sau hai tháng.', 'ChatGPT reached 100 million monthly active users in January'));
  verifyCli(first.dir, '--stage', 'evidence', '--claims', 'c1', '--no-fetch');
  // Cảnh báo lúc soát gốc được lưu cùng dữ kiện — giả một cảnh báo để thấy nó đi theo.
  const evFile = path.join(first.dir, 'checks', 'evidence.json');
  const ev = JSON.parse(fs.readFileSync(evFile, 'utf8'));
  ev.claims.c1.warnings = ['nguồn duy nhất là blog — người duyệt nên xem'];
  fs.writeFileSync(evFile, JSON.stringify(ev));
  verifyCli(first.dir, '--save-facts');
  // Bài sau (cùng thư mục research/) gặp lại đúng claim đó.
  const second = fakeRun('bai-2', first.root);
  assert.deepEqual(verifyCli(second.dir, '--reuse').reused.map((r) => r.claim), ['c1']);
  const row = verifyCli(second.dir, '--stage', 'evidence', '--claims', 'c1', '--no-fetch').claims.c1;
  assert.equal(row.ok, true);
  assert.deepEqual(row.warnings, ['nguồn duy nhất là blog — người duyệt nên xem']);
  assert.ok(row.notes.some((n) => /dùng lại dữ kiện/.test(n)));
});

// ── kịch bản: độ dài, số thập phân, thuật ngữ, bảng số ─────────────────────────────

test('lời đọc: số thập phân đọc "phẩy"/"chấm" là một con số, nhân được cả bậc', () => {
  const values = (s) => spokenNumbers(s).map((n) => n.value);
  // Bản cũ đọc "hai phẩy năm" thành 2 rồi bỏ "năm" như chữ chỉ năm — con số nghe thấy không ai soát.
  assert.deepEqual(values('giá hai phẩy năm đô la'), [2.5]);
  assert.deepEqual(values('một phẩy năm triệu người dùng'), [1500000]);
  assert.deepEqual(values('một phẩy một triệu người dùng'), [1100000], 'không lệch vì phép nhân số thực');
  assert.deepEqual(values('năm phẩy hai phần trăm'), [5.2]);
  assert.equal(spokenNumbers('năm phẩy hai phần trăm')[0].percent, true);
  assert.deepEqual(values('không phẩy bảy mươi lăm'), [0.75]);
  assert.deepEqual(values('Claude Opus bốn chấm sáu'), [4.6]);
  assert.deepEqual(values('năm hai nghìn không trăm hai mươi hai'), [2022], '"năm" chỉ năm vẫn là mốc thời gian');
});

test('checkScript soát cả số thập phân nghe thấy; "1,5 triệu" của nguồn khớp "một phẩy năm triệu"', () => {
  const outline = [{ slide: 1 }, { slide: 2 }];
  const script = (loi, screen) => SCRIPT.replace(/- \*\*Lời:\*\* Nó đọc[^\n]*/, `- **Lời:** ${loi}`).replace('GPT-4 Turbo · 128,000 token', screen);
  const run = (md, knownText) => checkScript({ markdown: md, deliveries: DELIVERIES, outline, claims: { c1: { ok: true, verdict: 'fix' } }, knownText });
  const flagged = (r, re) => r.issues.some((i) => re.test(i.message));
  // Nguồn nói 2.5 đô la; lời đọc "ba phẩy năm" là con số bịa — bản cũ bỏ qua mọi số nghe thấy dưới mười.
  assert.ok(flagged(run(script('Mỗi triệu token đầu vào có giá ba phẩy năm đô la.', 'Giá mỗi triệu token'), 'slide 2: giá $2.5 mỗi triệu token'), /ba phẩy năm/));
  const ok = run(script('Sản phẩm có một phẩy năm triệu người dùng ngay tháng đầu.', 'Người dùng: 1,5 triệu'), 'slide 2: 1,5 triệu người dùng');
  assert.ok(!flagged(ok, /lời đọc nói|con số/), JSON.stringify(ok.issues));
});

test('lời đọc có "tỷ" mà câu thiếu dòng Trên màn hình thì bị bắt — biên chữ theo Unicode, không theo \\b', () => {
  const s = parseScript('# T\n- **Mục tiêu:** x\n## A\n### Câu 1\n- **Kiểu:** kể\n- **Lời:** Mô hình này đã có một tỷ người dùng khắp thế giới.\n');
  const { issues } = lintScript(s, { deliveries: DELIVERIES });
  assert.ok(issues.some((i) => i.level === 'problem' && /không có dòng \*\*Trên màn hình/.test(i.message)), JSON.stringify(issues));
});

test('viết tắt có trên slide là thuật ngữ của bài; tên có chữ số là việc của bước làm video', () => {
  const md = '# T\n- **Mục tiêu:** x\n## A\n### Câu 1\n- **Kiểu:** kể\n- **Lời:** Một LLM như GPT-4 được gọi qua API để trả lời câu hỏi của bạn.\n- **Trên màn hình:** LLM · API\n- **Nguồn:** slide:1\n';
  const outline = [{ slide: 1 }];
  const known = 'slide 1: LLMs và API, GPT-4';
  const r = checkScript({ markdown: md, deliveries: DELIVERIES, outline, claims: {}, knownText: known });
  // Bản cũ cảnh báo cả LLM, GPT, API — lượt sửa thật đã xoá "LLM" và "API" khỏi cả bài giảng về LLM để hết cảnh báo.
  assert.ok(!r.issues.some((i) => /viết tắt/.test(i.message)), JSON.stringify(r.issues));
  assert.equal(r.issues.find((i) => /tên có chữ số/.test(i.message))?.code, 'pronounce');
  const other = checkScript({ markdown: md.replace('qua API', 'qua SDK'), deliveries: DELIVERIES, outline, claims: {}, knownText: known });
  assert.ok(other.issues.some((i) => /viết tắt trong lời đọc: SDK/.test(i.message)), JSON.stringify(other.issues));
});

test('lời đọc cả dãy số (bảng giá) thì cảnh báo — bảng để trên màn hình', () => {
  const s = parseScript('# T\n- **Mục tiêu:** x\n## A\n### Câu 1\n- **Kiểu:** giảng\n- **Lời:** Bản lớn giá năm mươi đô la, bản vừa mười lăm đô la, bản nhỏ hai phẩy năm đô la, còn cửa sổ là hai trăm nghìn token.\n- **Trên màn hình:** bảng giá\n');
  const { issues } = lintScript(s, { deliveries: DELIVERIES });
  assert.ok(issues.some((i) => i.level === 'warning' && /4 con số/.test(i.message)), JSON.stringify(issues));
});

test('checkScript: dài quá số câu đã đặt — tính cả số câu lẫn số từ', () => {
  const cue = (n, words) => `### Câu ${n}\n- **Kiểu:** ${n % 2 ? 'kể' : 'giảng'}\n- **Lời:** ${Array.from({ length: words }, () => 'chữ').join(' ')}.\n- **Trên màn hình:** x\n- **Nguồn:** slide:1\n`;
  const md = (count, words) => `# T\n- **Mục tiêu:** x\n## A\n${Array.from({ length: count }, (_, i) => cue(i + 1, words)).join('\n')}`;
  const run = (count, words, target) => checkScript({ markdown: md(count, words), deliveries: DELIVERIES, outline: [{ slide: 1 }], claims: {}, knownText: '', target });
  const length = (r) => r.issues.find((i) => i.code === 'length');
  assert.equal(length(run(10, 20, 10)), undefined);
  assert.equal(length(run(13, 20, 10)).level, 'warning');
  assert.equal(length(run(16, 20, 10)).level, 'problem');
  // Đúng mười câu nhưng mỗi câu bốn mươi từ: 400 từ so với 240 — cũng dài gấp rưỡi.
  assert.equal(length(run(10, 40, 10)).level, 'problem');
  assert.match(length(run(16, 20, 10)).message, /đừng tách câu/);
  // Kịch bản viết tay (không có mức đặt) thì không soát độ dài.
  assert.equal(length(run(16, 20, null)), undefined);
  assert.deepEqual(run(16, 20, 10).length, { target: 10, words: 240, maxCues: 12, ratio: 1.6 });
});

test('checkScript: slide nhiều hơn số câu thì chỉ nhắc slide mang ý đã research, và bảo gộp chứ không thêm câu', () => {
  const outline = Array.from({ length: 30 }, (_, i) => ({ slide: i + 1 }));
  const claims = { c1: { ok: true, verdict: 'ok', slides: [2] }, c2: { ok: true, verdict: 'ok', slides: [17] }, c3: { ok: true, verdict: 'insufficient', slides: [20] } };
  const r = checkScript({ markdown: SCRIPT, deliveries: DELIVERIES, outline, claims, knownText: '128,000', target: 5 });
  // Bản cũ liệt kê 28 slide thiếu — lượt sửa theo đó nhồi thêm câu cho từng slide.
  const coverage = r.issues.filter((i) => i.cue === null && /^slide /.test(i.message));
  assert.equal(coverage.length, 1, JSON.stringify(coverage));
  assert.match(coverage[0].message, /^slide 17 có ý đã research/);
  assert.match(coverage[0].message, /gộp/);
  const small = checkScript({ markdown: SCRIPT, deliveries: DELIVERIES, outline: outline.slice(0, 6), claims, knownText: '128,000', target: 10 });
  assert.ok(small.issues.some((i) => /^slide 3–6 không có câu nào/.test(i.message)), JSON.stringify(small.issues));
});

test('thời lượng ở phần đầu ghi theo lời đọc thật, không theo con số người viết đoán', () => {
  assert.equal(durationPhrase(375), 'khoảng sáu phút rưỡi');
  assert.equal(durationPhrase(165), 'khoảng ba phút');
  assert.equal(durationPhrase(1260), 'khoảng hai mươi mốt phút');
  assert.equal(durationPhrase(20), 'dưới một phút');
  const md = '# T\r\n\r\n- **Mục tiêu:** x\r\n- **Thời lượng dự kiến:** khoảng bốn phút rưỡi.\r\n\r\n## 1 · A\r\n';
  assert.equal(syncDuration(md, 375), md.replace('bốn phút rưỡi', 'sáu phút rưỡi'));
  assert.equal(syncDuration(syncDuration(md, 375), 375), null, 'đã đúng thì không ghi lại');
  // Không có dòng đó ở phần đầu thì không thêm dòng — số dòng của các lỗi khác phải giữ nguyên.
  assert.equal(syncDuration('# T\n\n## 1 · A\n- **Thời lượng dự kiến:** x\n', 375), null);
});

test('soát kịch bản (research-verify) lấy mức đặt từ state.json và ghi lại dòng thời lượng', () => {
  const { dir } = fakeRun();
  const state = JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'));
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify({ ...state, options: { cues: 1 } }));
  const cue = (n) => `### Câu ${n}\n- **Kiểu:** ${['kể', 'giảng', 'chốt'][n - 1]}\n- **Lời:** Câu thứ ${['nhất', 'hai', 'ba'][n - 1]} nói về mô hình ngôn ngữ và cách nó đoán chữ tiếp theo.\n- **Trên màn hình:** x\n- **Nguồn:** slide:${n === 3 ? 2 : 1}\n`;
  const file = path.join(dir, 'output', 'kich-ban.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `# Bài 1\n\n- **Mục tiêu:** x\n- **Thời lượng dự kiến:** khoảng mười phút.\n\n## 1 · A\n\n${[1, 2, 3].map(cue).join('\n')}`);
  const report = verifyCli(dir, '--stage', 'script');
  assert.equal(report.length.target, 1);
  assert.ok(report.issues.some((i) => i.code === 'length' && i.level === 'problem'), JSON.stringify(report.issues));
  assert.match(fs.readFileSync(file, 'utf8'), /- \*\*Thời lượng dự kiến:\*\* dưới một phút\.\n/);
});

// ── chi phí: tự soát, độ mới của tài liệu chính thức, số claim ──────────────────────

test('trang giá/docs chính thức của đúng hãng không ghi ngày là bản hiện hành — không phạt, lấy ngày tải làm mốc', () => {
  const claim = { ...CLAIM, text: 'OpenAI GPT-4 Turbo có cửa sổ ngữ cảnh 128K token' };
  const live = { ...SOURCES.s1, published: null, fetchedAt: '2026-09-18T10:00:00Z' };
  const both = finding({ evidence: [{ source: 's1', quote: QUOTE, stance: 'supports' }, { source: 's3', quote: QUOTE, stance: 'supports' }] });
  // Bản cũ lấy ngày của bài báo cũ (2024) làm "nguồn mới nhất" và đánh trượt — thêm nguồn lại bị phạt.
  const r = checkFinding({ claim, finding: both, resolveSource: (ref) => ({ s1: live, s3: SOURCES.s3 })[ref] ?? null, referenceDate: NOW });
  assert.equal(r.ok, true, JSON.stringify(r.problems));
  assert.deepEqual(r.warnings, []);
  assert.equal(r.asOf, '2026-09-18');
  // Trang không ghi ngày của nơi khác vẫn chỉ là cảnh báo — nhãn "official" agent tự khai không đủ.
  const thirdParty = { ...SOURCES.s3, published: null, fetchedAt: '2026-09-18T10:00:00Z' };
  const r2 = checkFinding({
    claim, finding: finding({ sources: [{ id: 's3', kind: 'official' }], evidence: [{ source: 's3', quote: QUOTE, stance: 'supports' }] }),
    resolveSource: (ref) => (ref === 's3' ? thirdParty : null), referenceDate: NOW,
  });
  assert.ok(r2.warnings.some((w) => /ghi ngày/.test(w)), JSON.stringify(r2.warnings));
  assert.equal(r2.asOf, undefined);
});

test('bóc tách: nhiều claim hơn mức kịch bản dùng được thì cảnh báo, không chặn', () => {
  assert.deepEqual([claimCap(20), claimCap(5), claimCap(21), claimCap(80), claimCap(null)], [10, 4, 11, 25, 25]);
  const outline = { outline: [{ slide: 1 }, { slide: 2 }] };
  const many = { claims: Array.from({ length: 12 }, (_, i) => ({ ...CLAIM, id: `c${i + 1}`, text: `${CLAIM.text} ${i}`, key: `${CLAIM.key} ${i}` })) };
  const r = checkExtract({ outline, claims: many, slideCount: 2, cues: 20 });
  assert.equal(r.ok, true, JSON.stringify(r.problems));
  assert.ok(r.warnings.some((w) => /tối đa 10/.test(w)), JSON.stringify(r.warnings));
  assert.ok(!checkExtract({ outline, claims: many, slideCount: 2, cues: 24 }).warnings.some((w) => /mức hợp lý/.test(w)));
});

test('agent tự soát (--dry): in kết quả, không ghi file nào, và không mở được chế độ ghi', () => {
  const { dir, root, sid } = fakeRun();
  writeFinding(dir, 'c1', honest(sid, 'c1', 'ChatGPT đạt 100 triệu người dùng.', 'ChatGPT reached'));
  const r = verifyCli(dir, '--stage', 'evidence', '--dry', '--claims', 'c1');
  assert.equal(r.dry, true);
  assert.equal(r.claims.c1.ok, false);
  assert.ok(r.claims.c1.problems.some((p) => /ngắn/.test(p)), JSON.stringify(r.claims.c1.problems));
  assert.equal(fs.existsSync(path.join(dir, 'checks', 'evidence.json')), false, 'tự soát không được ghi kết quả soát');
  // Lệnh nằm trong allowlist của chặng research: ghép thêm cờ không được lưu dữ kiện vào thư viện hay dùng lại dữ kiện.
  for (const extra of [['--save-facts'], ['--reuse'], ['--forget-facts']]) {
    const bad = verifyCli(dir, '--stage', 'evidence', '--dry', '--claims', 'c1', ...extra);
    assert.equal(bad.ok, false);
    assert.match(bad.error, /--dry/);
  }
  assert.match(verifyCli(dir, '--stage', 'evidence', '--dry').error, /--dry/);
  assert.deepEqual(factFiles(root), []);
  assert.equal(fs.existsSync(path.join(dir, 'checks', 'evidence.json')), false);
});

test('dàn ý do code dựng: soát bóc tách dựng lại outline.json từ slides.json (agent ghi đè cũng mất), nhận skip từ claims.json', () => {
  const { dir } = fakeRun();
  fs.writeFileSync(path.join(dir, 'input', 'slides.json'), JSON.stringify({ source: 'pdf', slides: [
    { slide: 1, paragraphs: ['ChatGPT', '100 triệu người dùng sau hai tháng'], notes: [] },
    { slide: 2, paragraphs: ['Transformer', 'Ra đời năm 2017'], notes: [] },
  ] }));
  // Agent tự đánh số — đúng lỗi của lượt thật (hai mục cùng số, trang mất hẳn).
  fs.writeFileSync(path.join(dir, 'outline.json'), JSON.stringify({ outline: [{ slide: 1, heading: 'tự chế' }, { slide: 1, heading: 'trùng' }] }));
  fs.writeFileSync(path.join(dir, 'claims.json'), JSON.stringify({ skip: [2], claims: TWO_CLAIMS }));
  const r = verifyCli(dir, '--stage', 'extract');
  assert.equal(r.ok, true, JSON.stringify(r.problems));
  const outline = JSON.parse(fs.readFileSync(path.join(dir, 'outline.json'), 'utf8'));
  assert.equal(outline.source, 'code');
  assert.deepEqual(outline.outline.map((o) => [o.slide, o.heading, Boolean(o.skip)]), [[1, 'ChatGPT', false], [2, 'Transformer', true]]);
});
