/**
 * Soát giọng theo TỪ. Đây là thứ suýt để lọt "đòn bẩy" ở lượt d05-v06: soát theo % từng cue thì
 * cue nào cũng "gần đạt" (cue 104 = 92%), và phải 2 lượt Kaggle mới kết luận được.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { collectTerms, norm, termHealth } from './voice-terms.mjs';

const row = (n, text, heardText) => ({ n, text, heardText, silent: false });

test('norm bỏ dấu, hạ chữ thường và QUY SỐ về một dạng', () => {
  assert.equal(norm('Đòn Bẩy!'), 'don bay');
  // Bỏ dấu là CÓ CHỦ ĐÍCH: Whisper hay ghi lệch dấu, và lệch dấu không phải đọc sai.
  assert.equal(norm('đòn bảy'), norm('Đòn Bẩy'));
  // Whisper ghi "80%" cho lời đọc "tám mươi phần trăm" — không quy số thì mọi cue có số đều báo giả.
  assert.equal(norm('tám mươi'), norm('80'));
});

test('collectTerms chỉ lấy cụm lặp ở ≥2 cue, bỏ cụm toàn từ chức năng', () => {
  const cues = [
    { n: 1, text: 'Đòn bẩy của sản phẩm nằm ở đâu' },
    { n: 2, text: 'Cái đòn bẩy đó là dữ liệu' },
    { n: 3, text: 'Chuyện này thì không liên quan' },
  ];
  const terms = collectTerms(cues).map((t) => t.term);
  assert.ok(terms.includes('don bay'), `phải có "don bay", đang có: ${terms.join(' | ')}`);
  assert.deepEqual(collectTerms(cues).find((t) => t.term === 'don bay').cues, [1, 2]);
  // phá: cụm chỉ xuất hiện MỘT cue thì không phải thuật ngữ của bài
  assert.ok(!terms.includes('du lieu'), 'cụm chỉ có ở 1 cue không được vào danh sách');
  assert.ok(!terms.some((t) => t === 'thi khong' || t === 'la mot'), 'cụm toàn từ chức năng bị loại');
});

test('termHealth bắt LỖI HỆ THỐNG: một cụm hụt ở ≥2 cue', () => {
  /*
   * `heardText` phải khác ở PHỤ ÂM, không chỉ ở dấu: `norm` cố ý bỏ dấu để "đòn bẩy" ↔ "đòn bảy"
   * không bị tính là đọc sai (lệch dấu của Whisper là chuyện thường, không phải lỗi giọng).
   */
  const rows = [
    row(1, 'Đòn bẩy của sản phẩm là dữ liệu', 'Trọng bẩy của sản phẩm là dữ liệu'),
    row(2, 'Cái đòn bẩy đó nằm ở đâu', 'Cái trọng bẩy đó nằm ở đâu'),
    row(3, 'Người dùng quyết định', 'Người dùng quyết định'),
    row(4, 'Người dùng nói gì', 'Người dùng nói gì'),
  ];
  const h = termHealth(rows);
  const don = h.find((t) => t.term === 'don bay');
  assert.ok(don, 'phải phát hiện "don bay"');
  assert.deepEqual(don.missedIn, [1, 2]);
  assert.equal(don.systemic, true, 'hụt ở 2 cue = lỗi hệ thống của TỪ, không phải của câu');

  // ĐỐI CHỨNG: cụm Whisper nghe ĐÚNG ở mọi cue thì không được vào bảng.
  assert.ok(!h.some((t) => t.term === 'nguoi dung'), '"người dùng" nghe đúng cả hai cue');
});

test('hụt ở ĐÚNG MỘT cue là chuyện của câu đó, không phải lỗi hệ thống', () => {
  const rows = [
    row(1, 'Đòn bẩy của sản phẩm', 'Trọng bẩy của sản phẩm'),
    row(2, 'Đòn bẩy đó nằm đâu', 'Đòn bẩy đó nằm đâu'),
  ];
  const don = termHealth(rows).find((t) => t.term === 'don bay');
  assert.ok(don);
  assert.equal(don.systemic, false, '1/2 cue → xem lại câu đó, chưa phải đổi lời');
});

test('số viết khác dạng KHÔNG bị tính là đọc sai', () => {
  const rows = [
    row(1, 'Tám mươi phần trăm người dùng bỏ đi', '80% người dùng bỏ đi'),
    row(2, 'Tám mươi phần trăm còn lại thì ở lại', '80% còn lại thì ở lại'),
  ];
  const h = termHealth(rows);
  assert.ok(!h.some((t) => /80|phan/.test(t.term)),
    `cụm toàn số không được vào bảng, đang có: ${h.map((t) => t.term).join(' | ')}`);
});

test('gộp cụm chồng nhau — "xác suất" và "theo xác suất" là MỘT phát hiện', () => {
  const rows = [
    row(1, 'Máy đoán theo xác suất chứ không chắc chắn', 'Máy đoán theo sác suất chứ không chắc chắn'),
    row(2, 'Mọi thứ theo xác suất đều có thể sai', 'Mọi thứ theo sác suất đều có thể sai'),
  ];
  const hits = termHealth(rows).filter((t) => t.term.includes('xac suat'));
  assert.equal(hits.length, 1, `phải gộp thành một dòng, đang có: ${hits.map((t) => t.term).join(' | ')}`);
  assert.equal(hits[0].term, 'theo xac suat', 'giữ cụm DÀI nhất — nó mang nghĩa rõ hơn');
});

test('cue lặng và cue chưa có heardText bị bỏ qua, không làm lệch tỉ lệ', () => {
  const rows = [
    { n: 1, text: '', heardText: '', silent: true },
    { n: 2, text: 'Đòn bẩy ở đây', heardText: undefined },
    row(3, 'Đòn bẩy ở kia', 'Đon bay ở kia'),
  ];
  const h = termHealth(rows);
  assert.ok(!h.some((t) => t.inCues.includes(1) || t.inCues.includes(2)));
});
