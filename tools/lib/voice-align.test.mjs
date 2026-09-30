import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fold, speechIssues } from './voice-align.mjs';

/** Whisper words at a steady 0.3 s each, the shape align.py returns. */
const heard = (text, gapAfter = {}) => {
  let t = 0;
  return text.split(/\s+/).filter(Boolean).map((word, i) => {
    const w = [word, +t.toFixed(2), +(t + 0.25).toFixed(2)];
    t += 0.3 + (gapAfter[i] || 0);
    return w;
  });
};
const codes = (issues) => issues.map((i) => i.code);

test('câu nghe đủ và đúng thứ tự thì không có gì', () => {
  assert.deepEqual(speechIssues('Hôm nay chúng ta học về mô hình ngôn ngữ lớn.', heard('Hôm nay chúng ta học về mô hình ngôn ngữ lớn.')), []);
});

test('Whisper nghe nhầm tr/ch, d/gi/r, s/x và viết số bằng chữ số: không phải lỗi', () => {
  assert.equal(fold('trí'), fold('chí'));
  assert.equal(fold('dữ'), fold('giữ'));
  assert.equal(fold('rác'), fold('dác'));
  assert.equal(fold('sẽ'), fold('xẽ'));
  assert.equal(fold('3'), 'ba');
  const text = 'Trí tuệ nhân tạo dùng dữ liệu để lọc thư rác trong ba bước sẽ nói sau.';
  assert.deepEqual(speechIssues(text, heard('chí tuệ nhân tạo dùng giữ liệu để lọc thư giác trong 3 bước xẽ nói sau.')), []);
});

test('mất đuôi câu: hai từ cuối không có trong audio', () => {
  const issues = speechIssues('Agent gọi công cụ rồi đọc kết quả của mô hình.', heard('Agent gọi công cụ rồi đọc kết quả của'));
  assert.deepEqual(codes(issues), ['truncation']);
  assert.equal(issues[0].words, 'mô hình');
  assert.equal(issues[0].end, null);
});

test('mất đuôi câu: một từ cuối, sau từ khớp cuối cùng không nghe thấy gì', () => {
  assert.deepEqual(codes(speechIssues('Mô hình trả lời bằng token.', heard('Mô hình trả lời bằng'))), ['truncation']);
});

test('từ cuối bị nghe nhầm (vẫn có tiếng) thì không phải mất đuôi', () => {
  assert.deepEqual(speechIssues('Hãy viết prompt thật rõ ràng cho prompt', heard('Hãy viết prompt thật rõ ràng cho prong')), []);
});

test('nuốt chữ: một đoạn ba từ trở lên giữa câu không nghe thấy gì', () => {
  const issues = speechIssues(
    'Trước hết mô hình đọc toàn bộ tài liệu rồi mới trả lời câu hỏi.',
    heard('Trước hết mô hình rồi mới trả lời câu hỏi.'),
  );
  assert.deepEqual(codes(issues), ['dropped']);
  assert.equal(issues[0].words, 'đọc toàn bộ tài liệu');
  assert.ok(issues[0].start < issues[0].end);
});

test('ba từ bị nghe thành ba từ khác là nghe nhầm, không phải nuốt chữ', () => {
  assert.deepEqual(speechIssues('Ta dùng mô hình Transformer cho bài này.', heard('Ta dùng mô đồ trans phờ mơ cho bài này.')), []);
});

test('khoảng trống chứa chữ số thì không kết luận được', () => {
  assert.deepEqual(speechIssues('Có một trăm hai mươi câu trong bộ này.', heard('Có 120 câu trong bộ này.')), []);
});

test('lặp chữ: một từ hoặc cụm hai từ nghe hai lần liền', () => {
  const one = speechIssues('Mô hình đọc câu hỏi.', heard('Mô hình đọc đọc câu hỏi.'));
  assert.deepEqual(codes(one), ['repeat']);
  assert.equal(one[0].words, 'đọc');
  const two = speechIssues('Ta gọi đó là mô hình ngôn ngữ.', heard('Ta gọi đó là mô hình mô hình ngôn ngữ.'));
  assert.deepEqual(codes(two), ['repeat']);
  assert.equal(two[0].words, 'mô hình');
  // Đo thật trên một câu OmniVoice cắt lặp: Whisper nghe cả cụm ba từ hai lần.
  const three = speechIssues(
    'Trên bản đồ này, mình xét các mô hình tạo sinh học từ dữ liệu.',
    heard('Trên bản đồ này mình xét các mô hình các mô hình tạo sinh học từ giữ liệu.'),
  );
  assert.deepEqual(codes(three), ['repeat']);
  assert.equal(three[0].words, 'các mô hình');
});

test('lặp chữ trích đúng chữ của câu, không phải chữ Whisper viết', () => {
  // Whisper viết thường và bỏ dấu phẩy; bảng gạch chân chỗ trích bên trong câu nên phải là chữ của câu.
  const issues = speechIssues('Ta gọi Mô Hình, rồi đọc tiếp.', heard('ta gọi mô hình mô hình rồi đọc tiếp'));
  assert.deepEqual(codes(issues), ['repeat']);
  assert.equal(issues[0].words, 'Mô Hình');
});

test('từ láy có sẵn trong lời ("từ từ") không phải lặp chữ', () => {
  assert.deepEqual(speechIssues('Hãy đi từ từ qua từng bước.', heard('Hãy đi từ từ qua từng bước.')), []);
});

test('câu nói một từ hai lần mà Whisper nghe nhầm vài từ: không phải nuốt chữ', () => {
  // LCS từng ghép chữ "gõ" nghe được với chữ "gõ" thứ hai của câu và để lại một khoảng trống giả.
  assert.deepEqual(speechIssues('Bây giờ mình gõ lệnh, gõ thêm một lệnh nữa.', heard('Bây giờ minh gõ lện gọ thêm một lệnh nữa')), []);
});

test('một từ bị nghe thành từ ngay sau nó ("chưa cho" → "cho cho") không phải lặp chữ', () => {
  // Đo thật: qa-demo câu 23, OmniVoice trên máy, Whisper small.
  assert.deepEqual(speechIssues(
    'Vì vậy, tên ứng dụng bạn đang mở chưa cho biết bên trong đang dùng mô hình nào.',
    heard('Vì vậy, tên ứng dụng bạn đang mở cho cho biết bên trong đang dùng mô hình nào.'),
  ), []);
});

test('vài từ liền nhau đều bị nghe thành từ bên cạnh (cả đoạn lệch một từ) không phải lặp chữ', () => {
  // Bản nghe không dài hơn lời: thiếu một từ chỗ này, thừa một từ chỗ kia — không có gì bị đọc thêm.
  assert.deepEqual(speechIssues('Mình gõ thêm và ta ngữ ta nữa', heard('Mình gõ thêm ta ngữ ta ta nữa')), []);
});

test('viết tắt bị đánh vần (LLM, MMLU) không phải lặp chữ', () => {
  assert.deepEqual(speechIssues('Ta dùng LLM để viết bài.', heard('ta dùng eo eo em để viết bài')), []);
  assert.deepEqual(speechIssues('Ta dùng LLM để viết bài.', heard('ta dùng L L M để viết bài')), []);
  assert.deepEqual(speechIssues('Điểm MMLU của nó rất cao.', heard('điểm M M L U của nó rất cao')), []);
});

test('số và ký hiệu Whisper viết thay lời đọc không thành lặp chữ hay mất đuôi', () => {
  // Hai ca đo thật trên giọng ElevenLabs của d1-22-sep (câu 6 và 15).
  assert.deepEqual(speechIssues('Điểm của nó là ba phẩy bảy.', heard('Điểm của nó là 3, 3.')), []);
  assert.deepEqual(speechIssues('Mỗi triệu token tốn khoảng một đô la', heard('Mỗi triệu token tốn khoảng 1 $')), []);
});

test('chữ dạng NFD (dán từ PDF) vẫn khớp với chữ NFC', () => {
  assert.equal(fold('trí'.normalize('NFD')), fold('chí'));
  assert.deepEqual(speechIssues('Trí tuệ nhân tạo học từ dữ liệu.'.normalize('NFD'), heard('chí tuệ nhân tạo học từ giữ liệu.')), []);
});

test('không có từ nào khớp là việc của phép kiểm nhầm file, không báo thêm ở đây', () => {
  assert.deepEqual(speechIssues('Một câu hoàn toàn khác.', heard('xin chào các bạn')), []);
  assert.deepEqual(speechIssues('Câu nào đó.', []), []);
});
