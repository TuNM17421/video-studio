import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { attributionText, creditLine, DEFAULT_POLICY, licenseAllowed, licenseLabel, normalizeLicense, readPolicy } from './image-license.mjs';

test('normalizeLicense đọc được cách ghi của Commons và Openverse', () => {
  const cases = [
    ['pd', 'pd'], ['Public domain', 'pd'], ['pdm', 'pd'], ['PD-US', 'pd'], ['cc0', 'cc0'], ['CC0', 'cc0'],
    ['cc-by-4.0', 'cc-by'], ['CC BY 2.0', 'cc-by'], ['by', 'cc-by'], ['cc-by-sa-3.0', 'cc-by-sa'], ['CC BY-SA 4.0', 'cc-by-sa'], ['by-sa', 'cc-by-sa'],
    ['by-nc', 'cc-by-nc'], ['by-nc-sa', 'cc-by-nc-sa'], ['by-nd', 'cc-by-nd'], ['by-nc-nd', 'cc-by-nc-nd'], ['CC BY-NC 2.0', 'cc-by-nc'],
    ['sampling+', 'other'], ['nc-sampling+', 'other'], ['GFDL', 'other'], ['Fair use', 'other'], ['', 'unknown'], [null, 'unknown'],
  ];
  for (const [raw, code] of cases) assert.equal(normalizeLicense(raw).code, code, String(raw));
  assert.equal(normalizeLicense('cc-by-sa-4.0').version, '4.0');
});

test('chính sách thương mại: loại NC, ND, không rõ; BY-SA giữ và gắn cờ share-alike', () => {
  for (const code of ['pd', 'cc0', 'cc-by']) assert.deepEqual(licenseAllowed(code), { ok: true, reason: null, shareAlike: false });
  assert.deepEqual(licenseAllowed('cc-by-sa'), { ok: true, reason: null, shareAlike: true });
  assert.match(licenseAllowed('cc-by-nc').reason, /NC/);
  assert.match(licenseAllowed('cc-by-nc-sa').reason, /NC/);
  assert.match(licenseAllowed('cc-by-nd').reason, /ND/);
  assert.match(licenseAllowed('unknown').reason, /không đọc được/);
  assert.equal(licenseAllowed('other').ok, false);
  assert.equal(licenseAllowed('cc-by-sa', { ...DEFAULT_POLICY, allow: ['pd', 'cc0', 'cc-by'] }).ok, false);
});

test('images.policy.json của repo đúng chính sách đã chốt', () => {
  const p = readPolicy();
  assert.deepEqual([...p.allow].sort(), ['cc-by', 'cc-by-sa', 'cc0', 'pd']);
  assert.ok(!p.allow.some((c) => /nc|nd/.test(c)));
});

test('readPolicy lấy file, trường thiếu hoặc sai kiểu thì về mặc định', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-policy-'));
  const file = path.join(dir, 'p.json');
  fs.writeFileSync(file, JSON.stringify({ allow: ['pd'], maxSlots: 'x' }));
  const p = readPolicy(file);
  assert.deepEqual(p.allow, ['pd']);
  assert.equal(p.maxSlots, DEFAULT_POLICY.maxSlots);
  assert.deepEqual(readPolicy(path.join(dir, 'khong-co.json')), { ...DEFAULT_POLICY });
});

test('dòng nguồn ngắn, ghi nơi đăng gốc; ghi công đầy đủ có link', () => {
  const c = {
    source: 'openverse', origin: 'flickr', title: 'Turing statue', creator: 'Umh Sapiens', license: 'cc-by', licenseVersion: '2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/', landingUrl: 'https://www.flickr.com/photos/x/1',
  };
  assert.equal(creditLine(c), 'Ảnh: Umh Sapiens · CC BY 2.0 · Flickr');
  assert.match(attributionText(c), /^“Turing statue” — Umh Sapiens, CC BY 2\.0 \(https:\/\/creativecommons\.org\/licenses\/by\/2\.0\/\), Flickr: https:\/\/www\.flickr\.com/);
  assert.equal(creditLine({ source: 'commons', title: 'Alan Turing Aged 16', creator: null, license: 'pd' }), 'Ảnh: Alan Turing Aged 16 · Public domain · Wikimedia Commons');
  assert.equal(licenseLabel('cc-by-sa', '4.0'), 'CC BY-SA 4.0');
  assert.ok(creditLine({ source: 'commons', creator: 'x'.repeat(100), license: 'pd' }).length < 100);
});
