/** npm run test:tools — hai khổ hình phải khai đủ như nhau, và khổ ngang phải y nguyên như trước. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_FORMAT, FORMATS, HEIGHT, LAYOUT, WIDTH, formatOf } from '../../vinuni-lesson-video-ds/lib/tokens.js';

test('khổ ngang vẫn là mặc định của module — video đã dựng xong không đổi một pixel', () => {
  assert.equal(DEFAULT_FORMAT, '16x9');
  assert.equal(WIDTH, 1920);
  assert.equal(HEIGHT, 1080);
  assert.equal(LAYOUT, FORMATS['16x9'].layout, 'LAYOUT phải CHÍNH LÀ layout của khổ ngang, không phải bản sao');
  // Vài mốc cũ, chép tay từ bản trước khi có khái niệm khổ.
  assert.equal(LAYOUT.contentTop, 250);
  assert.equal(LAYOUT.contentBottom, 960);
  assert.equal(LAYOUT.captionMaxChars, 78);
  assert.equal(LAYOUT.safeX, 120);
});

test('mọi khổ khai đủ cùng một bộ token', () => {
  // Thiếu một token thì component đọc ra undefined và SVG nhận y="NaN" — hỏng âm thầm, không ném lỗi.
  // Đã ăn thật: CornerTag mất `tagTop` nên cả thẻ góc biến mất mà build vẫn xanh.
  const base = Object.keys(FORMATS['16x9'].layout).sort();
  for (const [id, f] of Object.entries(FORMATS)) {
    assert.deepEqual(Object.keys(f.layout).sort(), base, `khổ ${id} khai thiếu hoặc thừa token`);
    for (const [k, v] of Object.entries(f.layout)) {
      assert.ok(Number.isFinite(v), `khổ ${id}: token ${k} không phải số (${v})`);
    }
  }
});

test('mỗi khổ khai đủ phần mô tả khung', () => {
  for (const [id, f] of Object.entries(FORMATS)) {
    assert.equal(f.id, id);
    assert.ok(f.width > 0 && f.height > 0, `khổ ${id}: thiếu kích thước`);
    assert.ok(['row', 'column'].includes(f.flow), `khổ ${id}: flow phải là row hoặc column`);
    assert.ok(typeof f.label === 'string' && f.label.length, `khổ ${id}: thiếu nhãn`);
  }
});

test('thanh phụ đề chạm đúng đáy khung, không hở không tràn', () => {
  for (const [id, f] of Object.entries(FORMATS)) {
    const L = f.layout;
    assert.equal(L.captionTop + L.captionHeight, f.height, `khổ ${id}: thanh phụ đề không khít đáy`);
  }
});

test('vùng nội dung nằm trong khung và không đè lên phụ đề', () => {
  for (const [id, f] of Object.entries(FORMATS)) {
    const L = f.layout;
    assert.ok(L.contentTop > L.dividerY, `khổ ${id}: nội dung bắt đầu trước cả đường kẻ tiêu đề`);
    assert.ok(L.contentBottom <= L.captionTop, `khổ ${id}: nội dung tràn xuống thanh phụ đề`);
    assert.ok(L.dividerX1 <= f.width, `khổ ${id}: đường kẻ tiêu đề dài quá khung`);
    assert.ok(L.tagRight <= f.width, `khổ ${id}: thẻ góc rơi ngoài khung`);
    assert.ok(L.contentXMin >= 0 && L.contentXMin < f.width / 2, `khổ ${id}: lề trái vô lý`);
  }
});

test('khổ dọc phải hẹp hơn thật sự, không chỉ đổi số khung', () => {
  const doc = FORMATS['9x16'];
  const ngang = FORMATS['16x9'];
  assert.ok(doc.height > doc.width, 'khổ dọc phải cao hơn rộng');
  assert.equal(doc.flow, 'column');
  // Phụ đề là chỗ dễ quên nhất: khung hẹp hơn thì một dòng phải ngắn hơn, nếu không chữ tràn ra ngoài.
  assert.ok(
    doc.layout.captionMaxChars < ngang.layout.captionMaxChars,
    'khổ dọc hẹp hơn nên số ký tự một dòng phụ đề phải nhỏ hơn',
  );
  // Ước lượng thô: bề rộng dùng được chia cho số ký tự phải xấp xỉ nhau ở hai khổ.
  const perChar = (f) => (f.width - 2 * f.layout.captionPadX) / f.layout.captionMaxChars;
  assert.ok(Math.abs(perChar(doc) - perChar(ngang)) < 4, 'bề rộng mỗi ký tự lệch quá xa giữa hai khổ');
});

test('formatOf: id lạ hay bỏ trống thì về khổ ngang', () => {
  assert.equal(formatOf('9x16'), FORMATS['9x16']);
  assert.equal(formatOf('16x9'), FORMATS['16x9']);
  assert.equal(formatOf(undefined), FORMATS['16x9']);
  assert.equal(formatOf('vuong'), FORMATS['16x9']);
});
