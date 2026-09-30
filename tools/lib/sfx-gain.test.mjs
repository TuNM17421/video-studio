/**
 * npm run test:tools — phần tính toán thuần của sfx-mix, bằng fixture nhỏ (không cần video thật).
 * Bắt hai lỗi im lặng đã gặp: trừ LEAD_FRAMES hai lần (ding đỉnh sớm hơn chữ) và key override `undefined\0anchor`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { FPS, LEAD_FRAMES, toTarget, computeStartFrame, overrideKey } from './sfx-gain.mjs';

test('toTarget: one-shot chuẩn theo đỉnh, bed chuẩn theo RMS, thiếu số đo thì 0', () => {
  assert.equal(toTarget({ peak: -6 }, { peakTargetDb: -12 }), -6);
  assert.equal(toTarget({ rmsDb: -30 }, { rmsTargetDb: -36 }), -6);
  assert.equal(toTarget({}, { peakTargetDb: -12 }), 0);
  assert.equal(toTarget({ peak: -6, rmsDb: -30 }, { peakTargetDb: -12, rmsTargetDb: -40 }), -6, 'đỉnh thắng RMS khi có cả hai');
});

test('computeStartFrame: chế độ cổ điển giữ nguyên mốc đã trừ LEAD_FRAMES, không trừ lần hai', () => {
  const target = 100 - LEAD_FRAMES; // vòng lặp cues đã trừ sẵn
  assert.equal(computeStartFrame(target, 500, false), target);
});

test('computeStartFrame: chế độ phân lớp đặt ĐỈNH đúng mốc hình (đỉnh sau 500ms = 15 frame)', () => {
  assert.equal(computeStartFrame(100, 500, true), 100 - Math.round(0.5 * FPS));
  assert.equal(computeStartFrame(100, 0, true), 100);
  assert.equal(computeStartFrame(5, 500, true), 0, 'không âm');
});

test('phân lớp: mốc đích = frame chữ được đọc, không lệch thêm LEAD_FRAMES', () => {
  const spokenFrame = 15;
  // sfx-mix chế độ phân lớp truyền t.startFrame + spokenAt (không trừ LEAD) rồi trừ đỉnh.
  assert.equal(computeStartFrame(spokenFrame, 300, true) + Math.round(0.3 * FPS), spokenFrame);
});

test('overrideKey: có cue thì dựng key, chưa giải được cue thì null (không sinh undefined\\0anchor)', () => {
  assert.equal(overrideKey(7, 'đáp án'), '7\u0000đáp án');
  assert.equal(overrideKey(null, 'đáp án'), null);
  assert.equal(overrideKey(undefined, 'đáp án'), null);
});
