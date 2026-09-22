/**
 * npm run test:tools — phần thuần của đường OmniVoice trên Kaggle: tên kernel, metadata, run.py.
 * (Đọc trạng thái kernel là việc của Studio — studio/src/lib/server/voice.test.ts.)
 * Không có mạng hay credentials Kaggle ở đây, nên chỉ kiểm những gì không cần gọi Kaggle.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildRunPy, kernelMetadata, kernelSlug } from './kaggle.mjs';

test('mỗi video một kernel riêng', () => {
  // Lỗi thật của bản đầu: tên lấy theo thư mục `kaggle-kernel`, nên video nào cũng đè lên cùng một kernel.
  assert.notEqual(kernelSlug('d2-01-lab'), kernelSlug('n2-00-gioi-thieu-ngay-2'));
  assert.equal(kernelSlug('d2-01-lab'), 'vs-d2-01-lab-voice');
});

test('tên kernel hợp lệ với Kaggle kể cả khi mã video dài hoặc lạ', () => {
  for (const id of ['A_B c', 'x', 'n5-01-mot-ma-video-rat-dai-vuot-qua-gioi-han-cua-kaggle-nhieu-lan']) {
    const slug = kernelSlug(id);
    assert.match(slug, /^[a-z0-9-]+$/);
    assert.ok(slug.length >= 5 && slug.length <= 50, slug);
    assert.ok(!slug.includes('--'), slug);
  }
  assert.throws(() => kernelSlug(''));
});

test('kernel private, có GPU và mạng', () => {
  const meta = kernelMetadata({ owner: 'thai', slug: 'vs-a-voice' });
  assert.equal(meta.id, 'thai/vs-a-voice');
  assert.equal(meta.title, meta.id.split('/')[1]);
  assert.equal(meta.is_private, true);
  assert.equal(meta.enable_gpu, true);
  assert.equal(meta.enable_internet, true);
});

test('run.py là Python hợp lệ và lời đọc không chen được vào mã', (t) => {
  const python = ['python3', 'python'].find((p) => spawnSync(p, ['--version']).status === 0);
  if (!python) return t.skip('máy không có Python');
  const rows = [
    { id: '01', text: 'Câu có "nháy kép", \\ gạch chéo và """ ba nháy', ref: 'r1', ref_text: 'mẫu', language_id: 'vi' },
    { id: '02', text: 'Câu hai', ref: 'r2', ref_text: 'mẫu', language_id: 'vi', speed: 0.9 },
  ];
  const src = buildRunPy({ refs: { r1: { url: 'https://example.com/a.wav' }, r2: { flac: 'AAAA' } }, rows });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaggle-run-'));
  const file = path.join(dir, 'run.py');
  fs.writeFileSync(file, src);
  assert.equal(spawnSync(python, ['-m', 'py_compile', file]).status, 0);
  // Đọc lại đúng DATA mà kernel sẽ thấy, không chạy phần cài đặt/sinh giọng.
  const probe = spawnSync(python, ['-c', `import json,re,sys; s=open(sys.argv[1],encoding="utf-8").read(); print(json.dumps(json.loads(eval(re.search(r"DATA = json.loads\\((.*)\\)\\n", s).group(1)))))`, file], { encoding: 'utf8' });
  assert.equal(probe.status, 0, probe.stderr);
  assert.deepEqual(JSON.parse(probe.stdout).rows, rows);
});
