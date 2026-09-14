/**
 * npm run test:tools — dò phần cứng cho model local.
 *
 * Repo này chạy trên Windows, macOS và Linux, nhưng máy nào cũng chỉ là một trong số đó. Các tổ hợp
 * còn lại chỉ kiểm được ở đây: `deviceFrom` là hàm thuần, nhận đúng thứ hệ điều hành trả về.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { batchSizeFor, deviceFrom, torchArgs } from './omnivoice.mjs';

const NVIDIA_3060 = 'NVIDIA GeForce RTX 3060 Laptop GPU, 6144';
const NVIDIA_4090 = 'NVIDIA GeForce RTX 4090, 24564';

test('Mac Apple Silicon dùng MPS', () => {
  const d = deviceFrom({ platform: 'darwin', arch: 'arm64', totalMemGb: 32 });
  assert.equal(d.id, 'mps');
  assert.equal(d.tight, false, '32 GB bộ nhớ hợp nhất là thoải mái');
});

test('Mac Apple Silicon 8 GB vẫn là máy chật', () => {
  // Bộ nhớ hợp nhất: model chiếm luôn phần RAM mà hệ điều hành đang dùng.
  assert.equal(deviceFrom({ platform: 'darwin', arch: 'arm64', totalMemGb: 8 }).tight, true);
});

test('Mac Intel KHÔNG được nhận là MPS', () => {
  // Lỗi thật đã mắc: bắt mọi máy darwin là Apple Silicon thì Mac Intel cài nhầm bản torch.
  const d = deviceFrom({ platform: 'darwin', arch: 'x64', totalMemGb: 16 });
  assert.equal(d.id, 'cpu');
  assert.match(d.label, /Intel/);
});

test('Linux có card NVIDIA thì dùng CUDA', () => {
  const d = deviceFrom({ platform: 'linux', arch: 'x64', nvidia: NVIDIA_4090 });
  assert.equal(d.id, 'cuda');
  assert.equal(d.vramGb, 24);
  assert.equal(d.tight, false);
});

test('Linux không có GPU thì về CPU, và luôn bị coi là chật', () => {
  const d = deviceFrom({ platform: 'linux', arch: 'x64', nvidia: '' });
  assert.equal(d.id, 'cpu');
  assert.equal(d.tight, true);
});

test('Windows có card yếu thì vẫn dùng CUDA nhưng báo chật', () => {
  const d = deviceFrom({ platform: 'win32', arch: 'x64', nvidia: NVIDIA_3060 });
  assert.equal(d.id, 'cuda');
  assert.equal(d.vramGb, 6);
  assert.equal(d.tight, true, 'dưới 8 GB VRAM phải cảnh báo');
});

test('tên card không bị lặp chữ NVIDIA', () => {
  assert.match(deviceFrom({ platform: 'linux', arch: 'x64', nvidia: NVIDIA_3060 }).label, /^NVIDIA GeForce/);
  assert.doesNotMatch(deviceFrom({ platform: 'linux', arch: 'x64', nvidia: NVIDIA_3060 }).label, /NVIDIA NVIDIA/);
  // Card không mang sẵn chữ NVIDIA thì mới ghép thêm vào.
  assert.match(deviceFrom({ platform: 'linux', arch: 'x64', nvidia: 'Tesla T4, 15360' }).label, /^NVIDIA Tesla T4/);
});

test('nvidia-smi trả về rác thì không được nhận là có GPU', () => {
  for (const junk of ['', '   ', '\n']) {
    assert.equal(deviceFrom({ platform: 'linux', arch: 'x64', nvidia: junk }).id, 'cpu');
  }
});

test('chỉ CUDA mới cài torch bản cu128', () => {
  assert.ok(torchArgs('cuda').some((a) => a.includes('cu128')));
  for (const device of ['mps', 'cpu']) {
    assert.ok(!torchArgs(device).some((a) => a.includes('cu128')), `${device} không được cài bản CUDA`);
    assert.ok(!torchArgs(device).includes('--extra-index-url'), `${device} dùng PyPI thường`);
  }
});

// Đây là bug đã đo được: card 6 GB, để nó tự gom batch thì cả 39 câu vào một lượt, VRAM 97 %,
// hơn 30 phút không ra nổi một file. Chia nhỏ là thứ duy nhất cứu được.
test('card chật thì chia batch nhỏ, card rộng mới gom nhiều', () => {
  const card = (vramGb, tight) => ({ id: 'cuda', label: '', vramGb, tight });
  assert.equal(batchSizeFor(card(6, true)), 2);
  assert.equal(batchSizeFor(card(8, false)), 4);
  assert.equal(batchSizeFor(card(12, false)), 8);
  assert.equal(batchSizeFor(card(24, false)), 16);
});

test('không GPU hoặc không đo được VRAM thì chọn mức an toàn nhất', () => {
  assert.equal(batchSizeFor({ id: 'cpu', vramGb: null, tight: true }), 1);
  assert.equal(batchSizeFor({ id: 'cuda', vramGb: null, tight: false }), 4);
  assert.equal(batchSizeFor(null), 1);
});

test('Mac Apple Silicon đi theo đúng ngưỡng chật/rộng của bộ nhớ hợp nhất', () => {
  assert.equal(batchSizeFor(deviceFrom({ platform: 'darwin', arch: 'arm64', totalMemGb: 8 })), 2);
  assert.equal(batchSizeFor(deviceFrom({ platform: 'darwin', arch: 'arm64', totalMemGb: 32 })), 16);
});
