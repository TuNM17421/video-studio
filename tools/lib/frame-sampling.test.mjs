import assert from 'node:assert/strict';
import test from 'node:test';
import { frameSampling } from './frame-sampling.mjs';

test('30 fps ra đúng cách đánh số cũ: mỗi frame nguồn một ảnh', () => {
  const { step, shots, sourceFrame } = frameSampling(0, 1133, 30, 30);
  assert.equal(step, 1);
  assert.equal(shots, 1133);
  assert.equal(sourceFrame(0), 0);
  assert.equal(sourceFrame(1132), 1132);
});

test('60 fps: gấp đôi số ảnh, ảnh cuối vẫn nằm trong khoảng', () => {
  const { step, shots, sourceFrame } = frameSampling(0, 1133, 60, 30);
  assert.equal(step, 0.5);
  assert.equal(shots, 2266);
  assert.equal(sourceFrame(1), 0.5);
  assert.equal(sourceFrame(shots - 1), 1132.5);
  assert.ok(sourceFrame(shots - 1) < 1133, 'không được lấy mẫu quá `to`');
});

test('--from/--to giữ nguyên khoảng nguồn', () => {
  const { shots, sourceFrame } = frameSampling(300, 600, 60, 30);
  assert.equal(shots, 600);
  assert.equal(sourceFrame(0), 300);
  assert.equal(sourceFrame(shots - 1), 599.5);
});

test('tỉ lệ không chia hết thì không lấy mẫu vượt `to`', () => {
  for (const outFps of [24, 25, 45, 50, 59]) {
    const { shots, sourceFrame } = frameSampling(0, 1133, outFps, 30);
    assert.ok(shots > 0, `${outFps} fps: phải có ảnh`);
    assert.ok(sourceFrame(shots - 1) < 1133, `${outFps} fps: ảnh cuối ${sourceFrame(shots - 1)} vượt quá 1133`);
    assert.ok(sourceFrame(shots - 1) >= 1133 - 2 * (30 / outFps), `${outFps} fps: ảnh cuối hụt quá xa cuối cảnh`);
  }
});

test('khoảng rỗng ra 0 ảnh, không ra số âm', () => {
  assert.equal(frameSampling(500, 500, 60, 30).shots, 0);
  assert.equal(frameSampling(600, 500, 60, 30).shots, 0);
});

test('fps sai thì ném lỗi chứ không lặng lẽ ra 0 ảnh', () => {
  assert.throws(() => frameSampling(0, 100, 0, 30), /outFps/);
  assert.throws(() => frameSampling(0, 100, 60, 0), /srcFps/);
});
