/**
 * Ba nhánh hỏng của `spawnSync` + nhánh sạch. Mỗi test kèm phép PHÁ tại chỗ: đổi đúng một trường
 * trong kết quả giả rồi khẳng định kết luận đổi theo, để test không xanh vì lý do sai.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { FF_MAX_BUFFER, ffFailure } from './ff-run.mjs';

const ok = { status: 0, signal: null, stderr: '', stdout: '' };

test('lần gọi sạch → null', () => {
  assert.equal(ffFailure(ok), null);
  // phá: cùng object đó mà status khác 0 thì KHÔNG được còn là sạch
  assert.notEqual(ffFailure({ ...ok, status: 1 }), null);
});

test('ENOBUFS nói thẳng là output vượt trần, không nói chung chung "không chạy được"', () => {
  const msg = ffFailure({ ...ok, error: Object.assign(new Error('spawnSync ENOBUFS'), { code: 'ENOBUFS' }) });
  assert.match(msg, /maxBuffer|ENOBUFS/);
  assert.match(msg, /audio quá dài|tăng FF_MAX_BUFFER/);
  // phá: lỗi khác thì KHÔNG được dùng câu của ENOBUFS
  const other = ffFailure({ ...ok, error: Object.assign(new Error('x'), { code: 'ENOENT' }) });
  assert.doesNotMatch(other, /maxBuffer/);
  assert.match(other, /ENOENT/);
});

test('status ≠ 0 bị bắt — đây là nhánh audio-qa từng bỏ sót và đem stderr rỗng đi phân tích', () => {
  const msg = ffFailure({ ...ok, status: 69 });
  assert.match(msg, /69/);
  assert.notEqual(msg, null);
});

test('bị signal giết: status null → báo tên signal, không im lặng', () => {
  const msg = ffFailure({ ...ok, status: null, signal: 'SIGKILL' });
  assert.match(msg, /SIGKILL/);
  assert.match(ffFailure({ ...ok, status: null, signal: null }), /không rõ/);
});

test('kết quả rác (undefined/null) cũng phải ra lỗi, không ra null', () => {
  for (const bad of [undefined, null, 'chuỗi']) assert.ok(ffFailure(bad), `${bad} phải bị bắt`);
});

test('tên lệnh đi vào thông báo để biết CHỖ NÀO hỏng', () => {
  assert.match(ffFailure({ ...ok, status: 1 }, { cmd: 'ebur128' }), /ebur128/);
});

test('FF_MAX_BUFFER đủ rộng cho video dài — ebur128 in ~1,6 KB mỗi giây', () => {
  const secondsCovered = FF_MAX_BUFFER / 1600;
  assert.ok(secondsCovered > 3600 * 10, `chỉ đủ ${Math.round(secondsCovered)}s — quá hẹp`);
  assert.ok(FF_MAX_BUFFER > 1024 * 1024, 'phải lớn hơn hẳn mặc định 1 MiB của Node');
});
