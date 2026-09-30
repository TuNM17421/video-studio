/**
 * Phần LOGIC THUẦN của `--gaps`: phân loại khe và giải ra `pauseAfter`. Không đụng file .wav, không
 * gọi ffmpeg — `edgesOf` là hàm giả.
 *
 * Mỗi test dưới đây đều chứng minh được nó BIẾT FAIL: đổi đúng một thứ trong input (bỏ `gap` khai
 * tay, cho hai cue cùng section, bỏ dấu `?`) là kỳ vọng đổi theo — xem phần `assert.notEqual` đi
 * kèm, chúng là phép phá tại chỗ.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { GAP_KINDS, classifyGap, gapLength, jitterSeconds, resolveGaps, targetFor } from './voice-gaps.mjs';

const cue = (n, text, extra = {}) => ({ n, text, section: 1, scene: 'a', pauseAfter: 0.5, ...extra });

test('khai tay `gap` thắng mọi phép SUY (trong cùng cảnh, cùng chương)', () => {
  const cues = [cue(1, 'Câu này cùng một ý với câu sau.', { gap: 'chapter' }), cue(2, 'Câu sau.')];
  assert.equal(classifyGap(cues, 0).kind, 'chapter');
  // phá: bỏ `gap` đi thì cùng bộ cue đó phải rơi về `tight`
  const without = [cue(1, 'Câu này cùng một ý với câu sau.'), cue(2, 'Câu sau.')];
  assert.equal(classifyGap(without, 0).kind, 'tight');
});

test('ở ranh giới CHƯƠNG/CẢNH, khe = MAX(khai tay, ranh giới) — khai tay không rút ngắn được', () => {
  // `punch` (0,82 s) khai ở câu cuối chương KHÔNG được ăn mất nhịp `chapter` (1,40 s).
  const chapEdge = [cue(1, 'Câu chốt của chương.', { gap: 'punch' }), cue(2, 'Chương mới.', { section: 2, scene: 'b' })];
  assert.equal(classifyGap(chapEdge, 0).kind, 'chapter');
  assert.match(classifyGap(chapEdge, 0).source, /lấy max/);

  // cùng chuyện ở ranh giới CẢNH: punch (0,82) < scene (1,05)
  const sceneEdge = [cue(1, 'Câu chốt của cảnh.', { gap: 'punch' }), cue(2, 'Cảnh mới.', { scene: 'b' })];
  assert.equal(classifyGap(sceneEdge, 0).kind, 'scene');

  // CHIỀU NGƯỢC LẠI: khai tay DÀI HƠN ranh giới thì khai tay vẫn thắng — max không tước quyền lane script.
  const handLonger = [cue(1, 'Hết cảnh, và là cầu nối.', { gap: 'chapter' }), cue(2, 'Cảnh mới.', { scene: 'b' })];
  assert.equal(classifyGap(handLonger, 0).kind, 'chapter');

  // Khai tay NGẮN nhưng KHÔNG ở ranh giới nào → vẫn là khai tay (max chỉ áp ở ranh giới cấu trúc).
  const inside = [cue(1, 'Giữa cảnh thôi.', { gap: 'tight' }), cue(2, 'Nói tiếp.')];
  assert.equal(classifyGap(inside, 0).kind, 'tight');

  // PHÁ: hành vi CŨ (khai tay đè tất) trả `punch` ở cả hai ca ranh giới trên — hai assert này đỏ với code cũ.
  assert.notEqual(classifyGap(chapEdge, 0).kind, 'punch');
  assert.notEqual(classifyGap(sceneEdge, 0).kind, 'punch');
});

test('gapLength xếp đúng thứ tự độ dài khe, và suy thẳng từ GAP_KINDS', () => {
  assert.ok(gapLength('tight') < gapLength('count'));
  assert.ok(gapLength('count') < gapLength('beat'));
  assert.ok(gapLength('beat') < gapLength('punch'));
  assert.ok(gapLength('punch') < gapLength('scene'));
  assert.ok(gapLength('scene') < gapLength('chapter'));
  for (const [kind, k] of Object.entries(GAP_KINDS)) {
    assert.equal(gapLength(kind), (k.range[0] + k.range[1]) / 2, `${kind}: phải suy từ GAP_KINDS, không chép tay`);
  }
  assert.equal(gapLength('khong-co-loai'), -Infinity, 'loại lạ phải thua mọi loại thật');
});

test('đổi section → chapter, đổi scene → scene, cùng cả hai → tight', () => {
  const chap = [cue(1, 'Hết chương.'), cue(2, 'Chương mới.', { section: 2, scene: 'b' })];
  assert.equal(classifyGap(chap, 0).kind, 'chapter');

  const scene = [cue(1, 'Hết cảnh.'), cue(2, 'Cảnh mới.', { scene: 'b' })];
  assert.equal(classifyGap(scene, 0).kind, 'scene');

  const same = [cue(1, 'Cùng một ý.'), cue(2, 'Nói tiếp.')];
  assert.equal(classifyGap(same, 0).kind, 'tight');
});

test('câu hỏi / câu mời gọi → beat; bỏ dấu hỏi thì về tight', () => {
  const ask = [cue(1, 'Bạn có nhớ lần đầu không?'), cue(2, 'Mình thì nhớ.')];
  assert.equal(classifyGap(ask, 0).kind, 'beat');
  const flat = [cue(1, 'Bạn có nhớ lần đầu.'), cue(2, 'Mình thì nhớ.')];
  assert.notEqual(classifyGap(flat, 0).kind, 'beat');
});

test('chuỗi đếm → count, nhưng "một" và "năm" KHÔNG tính là từ đếm', () => {
  const counting = [cue(1, 'Hai con đường.'), cue(2, 'Ba cách làm.'), cue(3, 'Bốn kết quả.')];
  assert.equal(classifyGap(counting, 1).kind, 'count');
  // phá: "một"/"năm" là mạo từ và "năm 2006" — nếu tính chúng thì câu nào cũng thành count
  const notCounting = [cue(1, 'Một cái trần thôi.'), cue(2, 'Năm ngoái cũng vậy.'), cue(3, 'Thế thôi.')];
  assert.notEqual(classifyGap(notCounting, 1).kind, 'count');
});

test('pauseAfter ≥ 1,0 sẵn có được hiểu là punch, không bị san phẳng về tight', () => {
  const cues = [cue(1, 'Rồi tới đây.', { pauseAfter: 1.0 }), cue(2, 'Câu chốt.')];
  assert.equal(classifyGap(cues, 0).kind, 'punch');
  const short = [cue(1, 'Rồi tới đây.', { pauseAfter: 0.3 }), cue(2, 'Câu chốt.')];
  assert.equal(classifyGap(short, 0).kind, 'tight');
});

test('cue cuối không có khe', () => {
  const cues = [cue(1, 'Một câu duy nhất.')];
  assert.equal(classifyGap(cues, 0).kind, null);
});

test('đích luôn nằm trong dải của loại khe, và TẤT ĐỊNH theo số cue', () => {
  for (const [kind, k] of Object.entries(GAP_KINDS)) {
    for (const n of [1, 7, 42, 199]) {
      const t = targetFor(kind, n);
      assert.ok(t >= k.range[0] - 1e-9 && t <= k.range[1] + 1e-9, `${kind}/${n}: ${t} ngoài dải ${k.range}`);
      assert.equal(t, targetFor(kind, n), 'cùng cue phải ra cùng số — không được dùng nguồn ngẫu nhiên');
    }
  }
  assert.notEqual(targetFor('tight', 1), targetFor('tight', 2), 'jitter phải thật sự đổi theo cue');
  assert.equal(targetFor('khong-co-loai', 1), null);
  assert.ok(Math.abs(jitterSeconds(5, 0.04)) <= 0.04 + 1e-9);
});

test('resolveGaps trừ đúng phần lặng clip GIỮ LẠI, và không bao giờ ra pauseAfter âm', () => {
  const cues = [cue(1, 'Câu một.'), cue(2, 'Câu hai.'), cue(3, 'Câu ba.', { section: 2 })];
  const edges = { 1: { lead: 0.05, tail: 0.08 }, 2: { lead: 0.05, tail: 0.08 }, 3: { lead: 0.05, tail: 0.08 } };
  const out = resolveGaps(cues, (n) => edges[n]);

  assert.equal(out.length, 3);
  for (const row of out.slice(0, 2)) {
    assert.equal(row.kept, 0.13, 'đuôi clip trước 0,08 + đầu clip sau 0,05');
    // khe THỰC sau khi sửa phải chạm đích
    assert.ok(Math.abs(row.pauseAfter + row.kept - row.target) < 0.0015, `${row.n}: ${row.after} ≠ ${row.target}`);
  }
  assert.equal(out[2].kind, null, 'cue cuối không có khe');

  // phá: clip giữ lại NHIỀU hơn cả đích ⇒ pauseAfter phải kẹp về 0, không âm
  const fat = resolveGaps(cues, () => ({ lead: 0.5, tail: 0.5 }));
  assert.equal(fat[0].pauseAfter, 0);
  assert.ok(fat[0].kept > fat[0].target, 'tình huống test phải thật sự vượt đích, nếu không phép kẹp không được chạm tới');
});
