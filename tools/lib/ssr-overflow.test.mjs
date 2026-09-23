/**
 * HỒI QUY BASELINE VIDEO CŨ cho phép ước lượng "chữ rộng hơn hộp" của `verify`.
 *
 * ── Vì sao có file này (22/09/2026) ───────────────────────────────────────────────────────────
 * Một lane siết hệ số ước lượng bề ngang chữ in hoa 0,49 → 0,66 em để bắt ca "QUYỀN KIỂM SOÁT",
 * rồi nộp mà không chạy `verify` KHÔNG CỜ. Kết quả: `verify` toàn repo từ **1 problem** lên
 * **13**, trong đó **11 dòng chữ NẰM GỌN TRONG HỘP** của 5 video ĐÃ DUYỆT bị chặn. Luật của
 * harness là check mới không được biến video cũ từ đạt thành trượt — và không ai thấy vi phạm đó
 * vì `verify --video <id>` của từng video vẫn xanh.
 *
 * Mọi con số `real` dưới đây ĐO THẬT trong trình duyệt bằng `getComputedTextLength()` trên chính
 * frame đang bị gắn cờ (`npm run stage:serve` + CDP, 22/09/2026). Chúng là dữ liệu, không phải
 * kỳ vọng do tool tự sinh ra — nên test này vẫn đúng kể cả khi ai đó viết lại cả hàm ước lượng.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { estimateTextWidth, overflowsBox, upperShare } from './ssr-boxes.mjs';

/** video · cue · chuỗi · cỡ chữ · bề ngang ĐO THẬT · bề rộng hộp chứa. */
const MEASURED = [
  { video: 'd2-01-lab', cue: 6, text: 'ĐẦU RA 1 · CÂU VẤN ĐỀ', size: 18, real: 221, boxW: 260 },
  { video: 'd2-01-lab', cue: 6, text: 'ĐẦU RA 2 · CÁCH ĐO', size: 18, real: 195, boxW: 229 },
  { video: 'd2-01-lab', cue: 29, text: 'GIẢ THUYẾT GIẢI PHÁP', size: 18, real: 218, boxW: 257 },
  { video: 'd2-01-lab-v2', cue: 19, text: 'YÊU CẦU · XÂY MỘT CHATBOT AI', size: 18, real: 307, boxW: 348 },
  { video: 'n2-00-gioi-thieu-ngay-2', cue: 8, text: 'TRÍ TUỆ NHÂN TẠO (AI)', size: 18, real: 217, boxW: 272 },
  { video: 'n5-00-tom-tat-ngay-5', cue: 8, text: '4 MỤC SPEC RIÊNG CHO AI', size: 18, real: 254, boxW: 290 },
  { video: 'n5-00-tom-tat-ngay-5', cue: 11, text: 'NIỀM TIN NGƯỜI DÙNG', size: 18, real: 218, boxW: 247 },
  { video: 'n5-02-ai-feedback-loop', cue: 27, text: 'CHUYỂN NGƯỜI THẬT', size: 21, real: 238, boxW: 255 },
];

test('BASELINE: không dòng nào của video cũ bị gắn cờ — cả 8 đều NẰM GỌN trong hộp (đo thật)', () => {
  for (const m of MEASURED) {
    assert.ok(m.real <= m.boxW, `dữ liệu đo: "${m.text}" ${m.real}px phải ≤ hộp ${m.boxW}px`);
    assert.equal(
      overflowsBox(m.text, m.size, m.boxW), false,
      `BÁO OAN: ${m.video} câu ${m.cue} "${m.text}" — ước ${Math.round(estimateTextWidth(m.text, m.size))}px, `
      + `đo thật ${m.real}px, hộp ${m.boxW}px. Chữ nằm gọn trong hộp mà gate vẫn đỏ.`,
    );
  }
});

test('ca THẬT vẫn ĐỎ: chữ in hoa rộng hơn chính thẻ của nó ("QUYỀN KIỂM SOÁT")', () => {
  // Ca Thái bắt ở 3:15 của d05-v06: nhãn tràn hai bên thẻ trụ. Dựng lại bằng fixture vì bản thật
  // là cảnh dòng poster (div, không `<text>` SVG) nên phép này của `verify` không nhìn thấy nó.
  assert.equal(overflowsBox('QUYỀN KIỂM SOÁT', 18, 140), true);
  assert.equal(overflowsBox('QUYỀN KIỂM SOÁT', 24, 180), true);
  // Cùng chuỗi đó trong một thẻ ĐỦ RỘNG thì phải im.
  assert.equal(overflowsBox('QUYỀN KIỂM SOÁT', 18, 260), false);
});

test('ca THẬT vẫn ĐỎ: n5-06 câu 9 — chữ rộng gần gấp đôi hộp (problem có sẵn của baseline)', () => {
  // Đo thật: 752px trong hộp 377px. Đây là problem DUY NHẤT mà `verify` không cờ được phép có.
  assert.equal(overflowsBox('Vấn đề: AI product = thiết kế cho ', 32, 377), true);
});

test('ước lượng KHÔNG được lệch quá 10% so với số đo thật', () => {
  // Hệ số 0,62 cho sai số tối đa 7,8% trên 8 mẫu. Hệ số 0,66 (bản đã gây hồi quy) cho 14,7% —
  // ngưỡng 10% ở giữa, nên test này ĐỎ ngay khi ai đó siết hệ số lên lại.
  for (const m of MEASURED) {
    const est = estimateTextWidth(m.text, m.size);
    const err = Math.abs(est - m.real) / m.real;
    assert.ok(err <= 0.10, `"${m.text}": ước ${Math.round(est)} vs thật ${m.real} — lệch ${(err * 100).toFixed(1)}%`);
  }
});

test('ngưỡng so với CHÍNH bề rộng hộp, KHÔNG trừ một biên đệm 24px', () => {
  /*
   * Bản gây hồi quy so `ước > boxW - 24`, tức coi 24px đệm trong thẻ là vùng cấm. Chữ nằm trong
   * thẻ nhưng sát mép thì vẫn HIỂN THỊ ĐÚNG — nó không tràn.
   *
   * `boxW` dựng TỪ chính `est` để test này độc lập với hệ số: est luôn rơi vào khoảng
   * (boxW − 24, boxW). Bản cũ chặn; bản đúng phải im. Đổi hệ số bao nhiêu cũng không cứu được nó.
   */
  const text = 'CHUYỂN NGƯỜI THẬT';
  const size = 21;
  const est = estimateTextWidth(text, size);
  const boxW = Math.round(est + 12);
  assert.ok(est > boxW - 24 && est < boxW, 'tình huống test phải thật sự nằm trong biên đệm');
  assert.equal(overflowsBox(text, size, boxW), false, 'chữ sát mép nhưng TRONG hộp: không phải lỗi');

  // ĐỐI CHỨNG: hộp hẹp hơn chính bề ngang ước lượng thì vẫn phải đỏ.
  assert.equal(overflowsBox(text, size, Math.round(est * 0.8)), true);
});

test('upperShare phân biệt chữ in hoa với chữ thường, bỏ qua số và dấu', () => {
  assert.equal(upperShare('QUYỀN KIỂM SOÁT'), 1);
  assert.equal(upperShare('làm được gì'), 0);
  assert.equal(upperShare('4 MỤC SPEC RIÊNG CHO AI'), 1, 'số và khoảng trắng không được kéo tỉ lệ xuống');
  assert.ok(upperShare('Vấn đề: AI product') < 0.5, 'chuỗi chủ yếu chữ thường');
  assert.equal(upperShare('123 · 456'), 0, 'không có chữ cái nào');
});
