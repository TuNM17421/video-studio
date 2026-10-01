import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPrompt, bundleFrames, durationWords, inspectBundle } from './claude-design.mjs';

const cue = (n, section, extra = {}) => ({
  n, section, frames: 100, text: `Lời của câu ${n}.`, title: `Tiêu đề ${n}`, visual: `Chữ ${n}`, ...extra,
});
const base = {
  id: 'd9-00-thu', title: 'D9-00 · Thử', sections: ['Mở đầu', 'Thân bài'],
  cues: [cue(1, 1), cue(2, 1), cue(3, 2)], measured: true, styleName: 'lesson-lab', styleBlock: 'Phần riêng của style.',
};

test('thời lượng viết thành chữ, phút và giây', () => {
  assert.equal(durationWords(21066), 'mười một phút bốn mươi hai giây');
  assert.equal(durationWords(1800), 'một phút');
  assert.equal(durationWords(150), 'năm giây');
});

test('brief mang đủ số câu, tổng frame và số phần', () => {
  const out = buildPrompt(base);
  assert.match(out, /3 cảnh, tổng \*\*300 frame\*\*/);
  assert.match(out, /chia làm 2 phần/);
  assert.match(out, /Video: \*D9-00 · Thử\*/);
});

test('câu được gom đúng phần, và tổng frame của phần là tổng của câu trong phần', () => {
  const out = buildPrompt(base);
  assert.match(out, /### Phần 1 · Mở đầu {2}— 2 cảnh, 200 frame/);
  assert.match(out, /### Phần 2 · Thân bài {2}— 1 cảnh, 100 frame/);
});

test('thời lượng đo thật và thời lượng ước nói khác nhau, và ước có dấu ngã', () => {
  const measured = buildPrompt(base);
  assert.match(measured, /số đo thật/);
  assert.match(measured, /^1\. \[100 frame\]/m);

  const guess = buildPrompt({ ...base, measured: false });
  assert.match(guess, /Giọng đọc chưa thu/);
  assert.match(guess, /đừng neo nhịp vào frame tuyệt đối/);
  assert.match(guess, /^1\. \[~100 frame\]/m);
});

test('phần riêng của style được chèn vào, thiếu file thì brief vẫn dựng được', () => {
  assert.match(buildPrompt(base), /## Style: lesson-lab\n\nPhần riêng của style\./);
  const none = buildPrompt({ ...base, styleBlock: '' });
  assert.doesNotMatch(none, /## Style:/);
  assert.match(none, /Danh sách 3 cảnh/);
});

test('hợp đồng chụp frame luôn có mặt — nếu không thì không render được', () => {
  const out = buildPrompt(base);
  for (const must of ['window.vkDuration', 'window.vkSetFrame(n)', '?frame=N', '__frameReady', '_vendor/react.js']) {
    assert.ok(out.includes(must), `thiếu "${must}" trong brief`);
  }
});

test('câu không có chữ màn hình hay tiêu đề thì bỏ dòng đó, không in dòng rỗng', () => {
  const out = buildPrompt({ ...base, cues: [cue(1, 1, { visual: '', title: '' })], sections: ['Mở đầu'] });
  assert.match(out, /^1\. \[100 frame\] {2}Lời của câu 1\.$/m);
  assert.doesNotMatch(out, /trên màn hình:\s*$/m);
  assert.doesNotMatch(out, /tiêu đề cảnh:\s*$/m);
});

test('không có câu nào thì từ chối, không sinh brief rỗng', () => {
  assert.throws(() => buildPrompt({ ...base, cues: [] }), /không có câu nào/);
});

test('thiếu tên phần thì vẫn gom được, phần gọi là "Phần N"', () => {
  const out = buildPrompt({ ...base, sections: [] });
  assert.match(out, /chia làm 2 phần/);
  assert.match(out, /### Phần 1 · Phần 1 {2}— 2 cảnh/);
  assert.match(out, /### Phần 2 · Phần 2 {2}— 1 cảnh/);
});

test('câu ở phần không có tên KHÔNG được biến mất', () => {
  // Hai video trong repo có `section:` trên từng câu mà không export SECTIONS — gom theo danh sách tên
  // thì câu ở phần 2 rơi mất, và brief thiếu câu chỉ lộ ra sau khi đã dựng xong.
  const out = buildPrompt({ ...base, sections: ['Chỉ có tên phần một'] });
  assert.match(out, /### Phần 2 · Phần 2/);
  for (const n of [1, 2, 3]) assert.match(out, new RegExp(`^${n}\\. \\[100 frame\\]`, 'm'));
});

test('số phần nhảy cóc vẫn gom đúng, không tạo phần rỗng', () => {
  const out = buildPrompt({ ...base, cues: [cue(1, 1), cue(2, 5)], sections: [] });
  assert.match(out, /chia làm 2 phần/);
  assert.match(out, /### Phần 5 · Phần 5/);
  assert.doesNotMatch(out, /### Phần 3/);
});

const bundle = (over = {}) => ({
  files: ['Video.html', 'video.compiled.js', 'cues.js'],
  page: 'Video.html',
  pageHtml: '<script src="../../_vendor/react.js"></script><script src="./video.compiled.js"></script><script src="./cues.js"></script>',
  scripts: ['window.vkDuration = 10; window.vkSetFrame = n => {}; window.__frameReady = true; const f = params.get("frame");'],
  ...over,
});

test('thư mục đủ và đúng hợp đồng thì qua', () => {
  const r = inspectBundle(bundle());
  assert.equal(r.ok, true);
  assert.ok(r.checks.every((c) => c.ok));
});

test('thiếu file mà trang nạp thì chặn — trang trắng vẫn render ra đủ frame', () => {
  const r = inspectBundle(bundle({ files: ['Video.html', 'cues.js'] }));
  assert.equal(r.ok, false);
  const c = r.checks.find((x) => x.name === 'file trang cần');
  assert.equal(c.ok, false);
  assert.match(c.detail, /video\.compiled\.js/);
});

test('thiếu vkSetFrame thì chặn — bộ chụp không điều khiển được frame nào', () => {
  const r = inspectBundle(bundle({ scripts: ['window.vkDuration = 10; window.__frameReady = true;'] }));
  assert.equal(r.ok, false);
  assert.equal(r.checks.find((x) => x.name === 'phơi vkSetFrame').ok, false);
});

test('script từ CDN ngoài chỉ là cảnh báo, không chặn', () => {
  const r = inspectBundle(bundle({ pageHtml: '<script src="https://unpkg.com/react@18/umd/react.js"></script><script src="./video.compiled.js"></script><script src="./cues.js"></script>' }));
  assert.equal(r.ok, true);
  const c = r.checks.find((x) => x.name === 'không phụ thuộc CDN');
  assert.equal(c.ok, false);
  assert.equal(c.level, 'warning');
  assert.match(c.detail, /unpkg\.com/);
});

test('không có file .html thì dừng ngay, không soát tiếp', () => {
  const r = inspectBundle(bundle({ page: undefined, files: ['a.txt'] }));
  assert.equal(r.ok, false);
  assert.equal(r.checks.length, 1);
});

test('đọc được tổng frame bên kia khai', () => {
  assert.equal(bundleFrames(['window.PARTS = [{ n: 1, frames: 884 }, { n: 2, frames: 1565 }];']), 2449);
  assert.equal(bundleFrames(['không có PARTS']), null);
});
