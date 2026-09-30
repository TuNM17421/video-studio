/**
 * Tín hiệu bàn giao giữa lane. Sai ở đây là một lane đi tiếp trong khi lane kia chưa xong — đúng
 * cách `cues.js` bị ghi đè giữa lúc lane cảnh đang build (retro d05-v06 F3).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { coerce, getPath, handoffPath, readHandoff, satisfied, setPath } from './handoff.mjs';

test('getPath/setPath đi qua khoá lồng nhau và KHÔNG sửa object gốc', () => {
  const a = { voice: { state: 'staged', cues: 159 } };
  assert.equal(getPath(a, 'voice.state'), 'staged');
  assert.equal(getPath(a, 'voice.audition.done'), undefined, 'khoá chưa có → undefined, không ném');
  assert.equal(getPath(a, 'khong.co.gi'), undefined);

  const b = setPath(a, 'voice.audition.done', true);
  assert.equal(getPath(b, 'voice.audition.done'), true);
  assert.equal(getPath(b, 'voice.cues'), 159, 'nhánh cũ phải còn');
  assert.equal(getPath(a, 'voice.audition'), undefined, 'object gốc KHÔNG được sửa tại chỗ');
});

test('coerce giữ đúng kiểu — `--value true` không được thành chuỗi "true"', () => {
  assert.equal(coerce('true'), true);
  assert.equal(coerce('false'), false);
  assert.equal(coerce('null'), null);
  assert.equal(coerce('159'), 159);
  assert.deepEqual(coerce('[1,2]'), [1, 2]);
  assert.equal(coerce('staged'), 'staged');
  // phá: nếu trả chuỗi "true", phép chờ `--equals true` sẽ trượt mãi và lane treo tới hết timeout.
  assert.notEqual(coerce('true'), 'true');
});

test('satisfied: không có --equals nghĩa là "có mặt và khác null/false"', () => {
  assert.equal(satisfied('staged', undefined), true);
  assert.equal(satisfied(true, undefined), true);
  assert.equal(satisfied(0, undefined), true, '0 vẫn là một giá trị đã đặt');
  assert.equal(satisfied(undefined, undefined), false);
  assert.equal(satisfied(null, undefined), false);
  assert.equal(satisfied(false, undefined), false, '`audition.done: false` KHÔNG được coi là xong');

  assert.equal(satisfied('bound', 'bound'), true);
  assert.equal(satisfied('staged', 'bound'), false);
  assert.equal(satisfied(true, true), true);
  assert.equal(satisfied('true', true), false, 'so sánh phải theo KIỂU, không theo chuỗi');
});

test('readHandoff: thiếu file hoặc JSON hỏng → {} , không ném', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-'));
  assert.deepEqual(readHandoff('v1', root), {}, 'chưa lane nào ghi → coi như chưa có tín hiệu');

  const f = handoffPath('v1', root);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, '{ hỏng');
  assert.deepEqual(readHandoff('v1', root), {}, 'file hỏng KHÔNG được làm lane chờ sập');

  fs.writeFileSync(f, JSON.stringify({ voice: { state: 'bound' } }));
  assert.equal(getPath(readHandoff('v1', root), 'voice.state'), 'bound');
});

test('đường dẫn đúng chỗ hai lane đã thoả thuận tay ở lượt dựng trước', () => {
  assert.equal(path.relative('/r', handoffPath('d05', '/r')), path.join('projects', 'd05', '.studio', 'handoff.json'));
});
