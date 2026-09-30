/**
 * N2-00 · Giới thiệu ngày 2 — bản BẢNG TRẮNG (whiteboard style, lab).
 * Lời đọc giống hệt n2-00-gioi-thieu-ngay-2 (kịch bản rà ngày 10/09/2026, 16 câu) để so hai style trên
 * cùng giọng. Khác bản gốc: cả video là MỘT tấm bảng — không cắt cảnh; board.js khai từng nét vẽ theo
 * spokenAt. `visual` mô tả phần được vẽ lên bảng trong câu đó.
 */
import { createSpeech } from '../../../../lib/speech.js';
import { VOICE } from './voice.js';

const RAW = [
  {
    n: 1, frames: 229, speech: 199, seconds: 11, section: 1,
    title: 'Bắt đầu từ đâu?',
    text: 'Nếu được nhờ làm một trợ lý trí tuệ nhân tạo, bạn sẽ bắt đầu bằng việc chọn công cụ hay tìm hiểu người dùng đang gặp khó khăn gì?',
    screen: 'Bắt đầu từ đâu?',
    visual: 'Bút viết “Bắt đầu từ đâu?” đỏ, vẽ người que nói “Làm một trợ lý AI”, hai mũi tên tới hai ô bằng nhau Chọn công cụ / hay / Hiểu khó khăn.',
  },
  {
    n: 2, frames: 177, speech: 147, seconds: 8, section: 1,
    title: 'Ngày 2 · Xác định đúng vấn đề',
    text: 'Chào bạn, ngày hai giúp chúng ta làm rõ vấn đề trước khi quyết định dùng công nghệ để giải quyết.',
    screen: 'Ngày 2 · Xác định đúng vấn đề',
    visual: 'Viết “Ngày 2: làm rõ vấn đề trước”; khoanh đỏ Hiểu khó khăn + chữ “trước”, cạnh Chọn công cụ ghi “sau”.',
  },
  {
    n: 3, frames: 211, speech: 181, seconds: 11, section: 1,
    title: 'Lộ trình ngày 2',
    text: 'Bạn sẽ học cách xác định việc cần cải thiện, chọn cách giải quyết và kiểm tra xem đã đủ điều kiện để bắt đầu làm hay chưa.',
    screen: 'Cần cải thiện gì? · Làm thế nào? · Đã sẵn sàng chưa?',
    visual: 'Cục lau xoá phần mở đầu; camera lùi ra toàn bảng, sáu khung nét đứt hiện; bút viết ba câu hỏi Cần cải thiện gì? → Làm thế nào? → Đã sẵn sàng chưa? kèm nhãn vùng.',
  },
  {
    n: 4, frames: 194, speech: 164, seconds: 9, section: 2,
    title: '1 · Tìm khó khăn đằng sau lời đề nghị',
    text: 'Đầu tiên, bạn sẽ học cách tìm khó khăn thật sự đằng sau một đề nghị như làm trợ lý hỗ trợ học viên.',
    screen: '1 · Tìm khó khăn đằng sau lời đề nghị',
    visual: 'Gạch chân đỏ Cần cải thiện gì?, camera vào ô 1; tiêu đề phần 1; “Khó khăn thật sự?” đỏ, ô lời đề nghị “Làm trợ lý hỗ trợ học viên”, mũi tên “đằng sau”.',
  },
  {
    n: 5, frames: 216, speech: 186, seconds: 11, section: 2,
    title: 'Quan sát họ tìm ở đâu · Hỏi bước làm mất thời gian',
    text: 'Qua ví dụ một học viên tìm hướng dẫn nộp bài, bạn sẽ quan sát họ tìm ở đâu và hỏi bước nào khiến họ mất thời gian.',
    screen: 'Quan sát họ tìm ở đâu · Hỏi bước làm mất thời gian',
    visual: 'Nửa phải ô 1: học viên, trang 1 · 2 · 3, người quan sát; khoanh đỏ các trang (tìm ở đâu), ô câu hỏi “Bước nào mất thời gian?”.',
  },
  {
    n: 6, frames: 219, speech: 189, seconds: 10, section: 2,
    title: '2 · Viết rõ người, việc và ảnh hưởng',
    text: 'Phần hai giúp bạn viết rõ ai đang gặp khó, họ vướng ở bước nào và việc đó gây chậm trễ hoặc sai sót gì.',
    screen: '2 · Viết rõ người, việc và ảnh hưởng',
    visual: 'Camera xuống ô 2; tiêu đề phần 2; phiếu ba dòng Ai gặp khó? / Vướng ở bước nào? / Chậm trễ hay sai sót gì? với dòng trống nét đứt.',
  },
  {
    n: 7, frames: 226, speech: 196, seconds: 11, section: 2,
    title: 'Đo hiện tại · Chọn mục tiêu · Đo lại',
    text: 'Bạn sẽ ghi lại hiện nay học viên mất bao lâu để tìm đúng hướng dẫn, chọn thời gian muốn rút ngắn, rồi đo lại sau khi cải thiện.',
    screen: 'Đo hiện tại · Chọn mục tiêu · Đo lại',
    visual: 'Nửa phải ô 2: ba đồng hồ Hiện nay → Mục tiêu (kim ngắn hơn) → Đo lại; không có số.',
  },
  {
    n: 8, frames: 212, speech: 182, seconds: 9, section: 2,
    title: '3 · Trí tuệ nhân tạo (AI) có giúp ích?',
    text: 'Phần ba đặt câu hỏi: trí tuệ nhân tạo, hay AI, có thực sự giúp ích cho công việc ấy hay không.',
    screen: '3 · Trí tuệ nhân tạo (AI) có giúp ích?',
    visual: 'Camera lùi ra gạch chân Làm thế nào?, vào ô 3; tiêu đề phần 3; ô AI → mũi tên → Công việc (người que), dấu ? đỏ.',
  },
  {
    n: 9, frames: 183, speech: 153, seconds: 9, section: 2,
    title: 'Chọn vai trò của AI trong từng việc',
    text: 'Bạn sẽ cân nhắc những việc có thể giao AI làm thay và những việc AI nên hỗ trợ để con người quyết định.',
    screen: 'Chọn vai trò của AI trong từng việc',
    visual: 'Nửa phải ô 3: Từng việc tách hai nhánh AI làm thay / AI hỗ trợ, ghi “→ con người quyết định”.',
  },
  {
    n: 10, frames: 303, speech: 273, seconds: 14, section: 2,
    title: '4 · Con người đặt sẵn bước làm · AI chọn bước tiếp',
    text: 'Ở phần bốn, bạn sẽ so sánh hai cách tổ chức công việc: con người đặt sẵn quy tắc và các bước xử lý, hoặc để AI chọn bước tiếp theo dựa trên kết quả vừa nhận được.',
    screen: '4 · Con người đặt sẵn bước làm · AI chọn bước tiếp',
    visual: 'Camera xuống ô 4; tiêu đề phần 4; Con người đặt sẵn: Bước 1 → Bước 2 → Bước 3 · hoặc · AI chọn bước tiếp: Kết quả → AI → Bước tiếp, mũi tên đỏ quay về.',
  },
  {
    n: 11, frames: 182, speech: 152, seconds: 9, section: 2,
    title: 'Đủ dùng và phù hợp',
    text: 'Mục đích là chọn cách đủ giải quyết công việc, đồng thời cân nhắc chi phí, thời gian chờ và rủi ro.',
    screen: 'Đủ dùng và phù hợp',
    visual: 'Nửa phải ô 4: ô Cách đủ dùng, ba tiêu chí Chi phí / Thời gian chờ / Rủi ro (đỏ) chỉ vào.',
  },
  {
    n: 12, frames: 196, speech: 166, seconds: 10, section: 2,
    title: '5 · Đánh giá kết quả AI và xử lý sai',
    text: 'Phần năm giúp bạn xác định thế nào là kết quả đạt yêu cầu và cần làm gì khi hệ thống AI cho ra kết quả sai.',
    screen: '5 · Đánh giá kết quả AI và xử lý sai',
    visual: 'Camera lùi ra gạch chân Đã sẵn sàng chưa?, vào ô 5; tiêu đề phần 5; Kết quả AI tách Đạt yêu cầu (tick) / Sai → cần xử lý (đỏ).',
  },
  {
    n: 13, frames: 266, speech: 236, seconds: 12, section: 2,
    title: 'Báo nhầm người không cần giúp · Bỏ sót người cần giúp',
    text: 'Bạn sẽ xem hai lỗi thường gặp: hệ thống AI báo nhầm rằng một người cần giúp dù họ không gặp khó, hoặc bỏ sót người thật sự đang cần hỗ trợ.',
    screen: 'Báo nhầm người không cần giúp · Bỏ sót người cần giúp',
    visual: 'Nửa phải ô 5: AI báo nhầm → người “không cần giúp”; AI bỏ sót - - ✗ - → người “đang cần giúp”.',
  },
  {
    n: 14, frames: 202, speech: 172, seconds: 10, section: 2,
    title: '6 · Hoàn chỉnh mô tả để ra quyết định',
    text: 'Phần sáu giúp bạn hoàn chỉnh bản mô tả vấn đề, cách giải quyết dự kiến và những điều phải kiểm tra trước khi bắt đầu làm.',
    screen: '6 · Hoàn chỉnh mô tả để ra quyết định',
    visual: 'Camera xuống ô 6; tiêu đề phần 6; tờ Bản mô tả: Vấn đề / Cách giải quyết dự kiến / Điều phải kiểm tra.',
  },
  {
    n: 15, frames: 228, speech: 198, seconds: 10, section: 2,
    title: 'Chọn hướng đi và giải thích lý do',
    text: 'Bạn sẽ cân nhắc đi tiếp, chuẩn bị thêm hoặc dừng đề xuất, dựa vào lợi ích dự kiến và khả năng kiểm soát rủi ro.',
    screen: 'Chọn hướng đi và giải thích lý do',
    visual: 'Nửa phải ô 6: mũi tên từ bản mô tả tới Đi tiếp / Chuẩn bị thêm / Dừng đề xuất; “dựa vào: lợi ích dự kiến, kiểm soát rủi ro”.',
  },
  {
    n: 16, frames: 340, speech: 310, seconds: 14, section: 3,
    title: 'Sau hôm nay',
    text: 'Sau hôm nay, bạn sẽ biết bài toán nào thật sự cần AI, AI nên làm thay hay hỗ trợ con người, và khi nào nên làm tiếp, chuẩn bị thêm hoặc dừng ý tưởng sản phẩm đó.',
    screen: 'Sau hôm nay · Cần AI? · AI làm gì? · Làm tiếp hay dừng?',
    visual: 'Camera lùi ra toàn bảng; viết “Sau hôm nay” và dưới mỗi câu hỏi cột một câu khoanh đỏ: Cần AI? · Làm thay hay hỗ trợ? · Tiếp, thêm hay dừng?',
  },
];

const FPS = 30;
let cursor = 0;
export const CUES = RAW.map((c) => {
  const start = cursor;
  cursor += c.seconds * FPS;
  return { ...c, start, end: cursor };
});
export const DURATION = cursor;

export const { spokenAt, speechEnd } = createSpeech(RAW, VOICE);
