/**
 * Phần LOGIC THUẦN của sub-clip: nối mảnh, đo khe nội bộ, cổng "không đổi wording", tổ hợp biến thể.
 * Không gọi ffmpeg, không đụng .wav thật — PCM dựng bằng tay.
 *
 * Mỗi test đi kèm một phép PHÁ tại chỗ: đổi đúng một thứ trong input rồi khẳng định kỳ vọng đổi
 * theo, để test không thể xanh vì lý do sai.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { candidates, joinParts, makeTtsText, partId, peak, rejoin } from './voice-subclip.mjs';

const SR = 24000;
const sec = (n) => Math.round(n * SR);

/** PCM: `lead` giây lặng + `speech` giây sóng vuông biên độ `amp` + `tail` giây lặng. */
function clip({ lead = 0.2, speech = 1, tail = 0.3, amp = 8000 } = {}) {
  const pcm = Buffer.alloc((sec(lead) + sec(speech) + sec(tail)) * 2);
  for (let i = 0; i < sec(speech); i++) {
    pcm.writeInt16LE(i % 24 < 12 ? amp : -amp, (sec(lead) + i) * 2);
  }
  return pcm;
}

const seconds = (pcm) => pcm.length / 2 / SR;

test('nối: độ dài = tổng phần giữ lại của các mảnh + đúng các khe nội bộ', () => {
  const parts = [clip({ lead: 0.2, speech: 1.0, tail: 0.3 }), clip({ lead: 0.2, speech: 0.5, tail: 0.3 })];
  const { pcm, gaps } = joinParts(parts, { gap: 0.21, sampleRate: SR });

  assert.equal(gaps.length, 1, 'hai mảnh thì đúng một mối nối');
  assert.ok(Math.abs(gaps[0] - 0.21) < 0.002, `khe nội bộ ${gaps[0]} phải chạm đích 0,21 s`);

  // mảnh ĐẦU giữ nguyên lặng đầu (0,2 s), mảnh CUỐI giữ nguyên lặng đuôi (0,3 s);
  // ở giữa: đuôi mảnh 1 kẹp còn 0,08 + đầu mảnh 2 kẹp còn 0,05, rồi chèn thêm cho đủ 0,21.
  const expected = 0.2 + 1.0 + 0.08 + 0.21 - (0.08 + 0.05) + 0.05 + 0.5 + 0.3;
  assert.ok(Math.abs(seconds(pcm) - expected) < 0.003, `${seconds(pcm)} ≠ ${expected}`);

  // PHÁ: nới đích khe lên thì clip phải DÀI ra đúng bằng phần nới
  const wider = joinParts(parts, { gap: 0.5, sampleRate: SR });
  assert.ok(Math.abs(seconds(wider.pcm) - seconds(pcm) - 0.29) < 0.003, 'đích +0,29 s thì clip phải dài thêm đúng 0,29 s');
});

test('khe nội bộ được ĐO: mảnh đã sẵn nhiều lặng thì KHÔNG cộng thêm mù', () => {
  // đuôi mảnh 1 kẹp 0,08 + đầu mảnh 2 kẹp 0,05 = 0,13 — vẫn dưới đích 0,21 nên phải chèn 0,08
  const tight = joinParts([clip({ tail: 0.3 }), clip({ lead: 0.2 })], { gap: 0.21, sampleRate: SR });
  assert.ok(Math.abs(tight.gaps[0] - 0.21) < 0.002);

  // đích NHỎ hơn phần lặng đã giữ lại (0,13) ⇒ không chèn gì, và khe không bao giờ bị âm
  const fat = joinParts([clip({ tail: 0.3 }), clip({ lead: 0.2 })], { gap: 0.05, sampleRate: SR });
  assert.ok(fat.gaps[0] >= 0.129 && fat.gaps[0] <= 0.131, `khe thực ${fat.gaps[0]} phải là 0,13 đã có sẵn`);
  assert.ok(seconds(fat.pcm) < seconds(tight.pcm), 'không chèn thì clip phải ngắn hơn bản có chèn');
});

test('nối KHÔNG làm clipping: đỉnh clip nối = đỉnh mảnh to nhất', () => {
  const a = clip({ amp: 30000 });
  const b = clip({ amp: 12000 });
  const { pcm } = joinParts([a, b], { gap: 0.21, sampleRate: SR });
  assert.ok(Math.abs(peak(pcm) - peak(a)) < 1e-6, 'nối là ghép nối tiếp, không cộng biên độ');
  assert.ok(peak(pcm) < 1, 'không chạm trần 0 dBFS');
  // PHÁ: mảnh to hơn thì đỉnh phải đi theo, nếu không phép đo đỉnh là vô nghĩa
  const louder = joinParts([clip({ amp: 32000 }), b], { gap: 0.21, sampleRate: SR });
  assert.ok(peak(louder.pcm) > peak(pcm));
});

test('ba mảnh ra đúng hai khe, mỗi khe chạm đích', () => {
  const { gaps } = joinParts([clip(), clip(), clip()], { gap: 0.21, sampleRate: SR });
  assert.equal(gaps.length, 2);
  for (const g of gaps) assert.ok(Math.abs(g - 0.21) < 0.002);
});

test('một mảnh duy nhất: không khe, PCM giữ nguyên độ dài', () => {
  const one = clip({ lead: 0.2, speech: 1, tail: 0.3 });
  const { pcm, gaps } = joinParts([one], { gap: 0.21, sampleRate: SR });
  assert.equal(gaps.length, 0);
  assert.equal(pcm.length, one.length, 'mảnh đầu = mảnh cuối thì cả hai rìa giữ nguyên');
  assert.throws(() => joinParts([], {}), /không có mảnh/);
});

test('cổng wording: nối `text` các mảnh phải ra đúng lời đã khoá', () => {
  const parts = [{ text: 'Một nút ghi: tự động xử lý xong khiếu nại.' }, { text: 'Nút kia ghi: soạn sẵn thư.' }];
  assert.equal(rejoin(parts), 'Một nút ghi: tự động xử lý xong khiếu nại. Nút kia ghi: soạn sẵn thư.');
  // PHÁ: rụng một mảnh thì chuỗi nối lại phải KHÁC — đó là thứ cổng trong main() so với cues.js
  assert.notEqual(rejoin([parts[0]]), rejoin(parts));
});

test('tổ hợp biến thể: không khai biến thể thì đúng một ứng viên; khai thì nhân lên', () => {
  const plain = [{ text: 'a' }, { text: 'b' }];
  assert.deepEqual(candidates(plain), [[0, 0]]);

  const withVariants = [{ text: 'a' }, { text: 'Có ba đòn bẩy,', variants: ['Có ba đòn-bẩy,', 'Có ba đòn bẩy.'] }];
  const combos = candidates(withVariants);
  assert.equal(combos.length, 3, 'một mảnh 3 cách viết → 3 clip ứng viên');
  assert.deepEqual(combos[0], [0, 0], 'ứng viên 0 luôn là cách viết nguyên dạng');

  const two = [{ text: 'a', variants: ['A'] }, { text: 'b', variants: ['B'] }];
  assert.equal(candidates(two).length, 4, '2×2 tổ hợp');
});

test('partId đặt tên mảnh ổn định và phân biệt được biến thể', () => {
  assert.equal(partId(21, 0, 0), '021a');
  assert.equal(partId(21, 2, 0), '021c');
  assert.equal(partId(41, 1, 2), '041b-v2');
  assert.notEqual(partId(41, 1, 1), partId(41, 1, 2));
});

test('pronounce áp đúng biên từ — cùng phép thế của voice-export', () => {
  const tts = makeTtsText({ app: 'áp', AI: 'ây ai' });
  assert.equal(tts('Nếu app ghi AI thì sao?'), 'Nếu áp ghi ây ai thì sao?');
  assert.equal(tts('apple không phải app'), 'apple không phải áp', 'không được ăn vào giữa từ khác');
  assert.equal(makeTtsText({})('giữ nguyên'), 'giữ nguyên');
});
