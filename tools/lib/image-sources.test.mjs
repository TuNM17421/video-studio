import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanUrl, commonsCandidate, mergeCandidates, openverseCandidate, plainText, renderUrl, searchCommons, searchOpenverse } from './image-sources.mjs';

/** Một trang File: của Commons, rút gọn từ câu trả lời thật của API (formatversion=2). */
const COMMONS_PAGE = {
  pageid: 22828488,
  title: 'File:Alan Turing Aged 16.jpg',
  index: 2,
  imageinfo: [{
    width: 675, height: 919, mime: 'image/jpeg',
    thumburl: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Alan_Turing_Aged_16.jpg?utm_source=commons.wikimedia.org&utm_content=thumbnail_unscaled',
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Alan_Turing_Aged_16.jpg?utm_source=commons.wikimedia.org&utm_content=original',
    descriptionurl: 'https://commons.wikimedia.org/wiki/File:Alan_Turing_Aged_16.jpg',
    extmetadata: {
      ObjectName: { value: 'Alan Turing Aged 16' },
      ImageDescription: { value: 'Passport photo of Alan Turing at age 16' },
      DateTimeOriginal: { value: 'between 1928 and 1929<div style="display: none;">date QS:P,+1928-00-00T00:00:00Z/8</div>' },
      Artist: { value: 'Possibly <a href="//x">Arthur Reginald Chaffin</a> (1893-1954)' },
      License: { value: 'pd' },
      LicenseShortName: { value: 'Public domain' },
      AttributionRequired: { value: 'false' },
    },
  }],
};

const OPENVERSE_RESULT = {
  id: 'd10ede1e-b6b1-4921-841e-244f3395381e',
  title: 'Estatua de Alan Turing en Manchester',
  foreign_landing_url: 'https://www.flickr.com/photos/88728265@N08/9408487601',
  url: 'https://live.staticflickr.com/7417/9408487601_8768def119_b.jpg',
  creator: 'Umh Sapiens',
  license: 'by', license_version: '2.0', license_url: 'https://creativecommons.org/licenses/by/2.0/',
  provider: 'flickr', source: 'flickr', filetype: null, mature: false, height: 768, width: 1024,
  thumbnail: 'https://api.openverse.org/v1/images/d10ede1e-b6b1-4921-841e-244f3395381e/thumb/',
};

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } });

test('plainText bỏ phần ẩn, thẻ và entity; cleanUrl bỏ utm_*', () => {
  assert.equal(plainText('between 1928 and 1929<div style="display: none;">date QS:P</div>'), 'between 1928 and 1929');
  assert.equal(plainText('<b>A</b>&amp;B&#233; &nbsp;C'), 'A &Bé C');
  assert.equal(plainText(''), null);
  assert.equal(cleanUrl('https://u.org/a.jpg?utm_source=x&w=2'), 'https://u.org/a.jpg?w=2');
});

test('commonsCandidate: metadata lấy nguyên từ nguồn', () => {
  const c = commonsCandidate(COMMONS_PAGE);
  assert.equal(c.id, 'commons:File:Alan Turing Aged 16.jpg');
  assert.equal(c.title, 'Alan Turing Aged 16');
  assert.equal(c.description, 'Passport photo of Alan Turing at age 16');
  assert.equal(c.date, 'between 1928 and 1929');
  assert.equal(c.creator, 'Possibly Arthur Reginald Chaffin (1893-1954)');
  assert.equal(c.license, 'pd');
  assert.equal(c.attributionRequired, false);
  assert.equal(c.imageUrl, 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Alan_Turing_Aged_16.jpg');
  assert.equal(commonsCandidate({ title: 'File:x.jpg' }), null);
});

test('openverseCandidate: mã giấy phép ngắn được quy về mã chung, ghi nơi đăng gốc', () => {
  const c = openverseCandidate(OPENVERSE_RESULT);
  assert.equal(c.id, 'openverse:d10ede1e-b6b1-4921-841e-244f3395381e');
  assert.deepEqual([c.license, c.licenseVersion, c.origin, c.mime], ['cc-by', '2.0', 'flickr', 'image/jpeg']);
  assert.equal(openverseCandidate({ ...OPENVERSE_RESULT, license: 'by-nc-sa' }).license, 'cc-by-nc-sa');
  assert.equal(openverseCandidate({ ...OPENVERSE_RESULT, license: 'pdm' }).license, 'pd');
});

test('searchCommons gửi User-Agent, lọc bitmap và giữ thứ tự xếp hạng', async () => {
  let seen;
  const fetchImpl = async (url, init) => {
    seen = { url: new URL(url), ua: init.headers['User-Agent'] };
    return json({ query: { pages: [{ ...COMMONS_PAGE, index: 2 }, { ...COMMONS_PAGE, title: 'File:First.jpg', index: 1 }] } });
  };
  const r = await searchCommons('Alan Turing', { fetchImpl });
  assert.equal(r.ok, true);
  assert.deepEqual(r.candidates.map((c) => c.id), ['commons:File:First.jpg', 'commons:File:Alan Turing Aged 16.jpg']);
  assert.match(seen.ua, /VinUni-VideoStudio/);
  assert.equal(seen.url.searchParams.get('gsrsearch'), 'Alan Turing filetype:bitmap');
  assert.equal(seen.url.searchParams.get('gsrnamespace'), '6');
});

test('searchOpenverse chỉ xin giấy phép thương mại, bỏ ảnh nhạy cảm, báo rõ khi hết lượt', async () => {
  let url;
  const ok = async (u) => {
    url = new URL(u);
    return json({ results: [OPENVERSE_RESULT, { ...OPENVERSE_RESULT, id: 'm', mature: true }] });
  };
  const r = await searchOpenverse('Alan Turing', { fetchImpl: ok });
  assert.equal(url.searchParams.get('license_type'), 'commercial');
  assert.deepEqual(r.candidates.map((c) => c.id), ['openverse:d10ede1e-b6b1-4921-841e-244f3395381e']);
  const limited = await searchOpenverse('x', { fetchImpl: async () => json({ detail: 'throttled' }, 429, { 'retry-after': '30' }) });
  assert.equal(limited.ok, false);
  assert.match(limited.error, /^Openverse: hết lượt gọi API \(HTTP 429, thử lại sau 30 giây\)/);
  const offline = await searchCommons('x', { fetchImpl: async () => { throw new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } }); } });
  assert.deepEqual([offline.ok, offline.candidates.length, offline.error], [false, 0, 'Commons: ENOTFOUND']);
});

test('lỗi mạng hay 5xx thì thử lại một lần; 429 và 4xx thì không', async () => {
  let n = 0;
  const flaky = async () => (++n === 1 ? json({}, 503) : json({ query: { pages: [COMMONS_PAGE] } }));
  const r = await searchCommons('x', { fetchImpl: flaky });
  assert.deepEqual([r.ok, n], [true, 2]);
  n = 0;
  const limited = async () => (n++, json({}, 429));
  assert.equal((await searchOpenverse('x', { fetchImpl: limited })).ok, false);
  assert.equal(n, 1);
  n = 0;
  const bad = async () => (n++, json({}, 400));
  assert.equal((await searchCommons('x', { fetchImpl: bad })).error, 'Commons: HTTP 400');
  assert.equal(n, 1);
});

test('tên tác giả của Commons bỏ phần liên kết phụ "(talk)", "( category )"', () => {
  const page = structuredClone(COMMONS_PAGE);
  page.imageinfo[0].extmetadata.Artist = { value: '<a href="//u">mattbuck</a> (<a href="//c">category</a>)' };
  assert.equal(commonsCandidate(page).creator, 'mattbuck');
});

test('renderUrl: ảnh Commons rộng hơn 1920 thì xin bản thu nhỏ, còn lại dùng ảnh gốc', async () => {
  const small = commonsCandidate(COMMONS_PAGE);
  assert.equal(await renderUrl(small, { fetchImpl: async () => assert.fail('không cần gọi API') }), small.imageUrl);
  const big = { ...small, width: 4000, height: 3000 };
  let asked;
  const fetchImpl = async (u) => {
    asked = new URL(u);
    return json({ query: { pages: [{ imageinfo: [{ thumburl: 'https://upload.wikimedia.org/thumb/1920px-x.jpg?utm_source=a' }] }] } });
  };
  assert.equal(await renderUrl(big, { fetchImpl }), 'https://upload.wikimedia.org/thumb/1920px-x.jpg');
  assert.equal(asked.searchParams.get('titles'), 'File:Alan Turing Aged 16.jpg');
  assert.equal(asked.searchParams.get('iiurlwidth'), '1920');
});

test('mergeCandidates: bỏ trùng theo trang nguồn, lấy xen kẽ giữa các danh sách', () => {
  const a = [{ id: 'commons:1', landingUrl: 'https://commons.wikimedia.org/wiki/File:A_b.jpg' }, { id: 'commons:2', landingUrl: 'https://c/2' }];
  const b = [{ id: 'openverse:9', landingUrl: 'https://commons.wikimedia.org/wiki/File:A b.jpg' }, { id: 'openverse:8', landingUrl: 'https://f/8' }];
  assert.deepEqual(mergeCandidates([a, b]).map((c) => c.id), ['commons:1', 'commons:2', 'openverse:8']);
  assert.deepEqual(mergeCandidates([[{ id: 'x', landingUrl: 'https://p/1' }], [{ id: 'y', landingUrl: 'https://p/2' }], []]).map((c) => c.id), ['x', 'y']);
});
