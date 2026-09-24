/**
 * N1-03 · Mô hình ngôn ngữ tạo văn bản từng mảnh như thế nào? — style ILLUSTRATED (lab).
 * Phạm vi: phần 1–3 của kịch bản gốc (câu 01–25, 00:00–03:12); phần 4–6 để cho một video khác.
 * Lời đọc chép NGUYÊN VĂN từ projects/n1-03-llm-sinh-tung-token/kich-ban-goc.md — đổi một chữ là phải
 * thu lại câu đó.
 *
 * Vật liệu sống suốt cả video: câu "Tôi mang ô vì trời…" thành hàng sáu token (bộ tách GPT-5), rồi thành
 * mã số, rồi thành dãy số, rồi mọc thêm một viên ở mỗi vòng lặp. Toạ độ hàng token khai một lần ở
 * shared.jsx, cảnh nào cũng dùng lại — xem styles/illustrated.md.
 */
import { createSpeech } from '../../../../lib/speech.js';
import { VOICE } from './voice.js';

const RAW = [
  // ——— Phần 1 · Mở đầu — chữ xuất hiện từ đâu ———
  {
    n: 1, seconds: 7, section: 1,
    title: 'Chữ xuất hiện dần',
    text: 'Khi một trợ lý hội thoại trả lời, các bạn thường thấy chữ xuất hiện dần trên màn hình.',
    visual: 'Một bong bóng trò chuyện hiện từng mảnh, không cho thấy đoạn hoàn chỉnh ngay từ đầu.',
  },
  {
    n: 2, seconds: 8, section: 1,
    title: 'Tiếp tục chuỗi từ ngữ cảnh',
    text: 'Trong bài này, mình xét cách mô hình tạo từng mảnh văn bản rồi dùng phần vừa có để viết tiếp.',
    visual: 'Mở hộp mô hình; chuỗi đầu vào nối qua vòng lặp đến một thẻ đầu ra.',
  },
  {
    n: 3, seconds: 6, section: 1, delivery: 'ke',
    title: 'Tôi mang ô vì trời…',
    text: 'Hãy nhìn câu chưa hoàn thành trên màn hình: tôi mang ô vì trời.',
    visual: 'Hiện nguyên câu “Tôi mang ô vì trời…” với khoảng trống cuối, gắn MINH HỌA.',
  },
  {
    n: 4, seconds: 10, section: 1, delivery: 'nhan',
    title: 'Hợp lý chưa chắc đúng',
    text: 'Điều cần hiểu cuối video là mô hình chọn mảnh tiếp theo như thế nào và vì sao câu nghe hợp lý vẫn có thể sai.',
    visual: 'Hai nhãn “Tạo câu” và “Kiểm chứng” đặt thành hai bước riêng.',
  },
  // ——— Phần 2 · Token — đơn vị mô hình xử lý ———
  {
    n: 5, seconds: 6, section: 2,
    title: 'Token: mảnh văn bản để xử lý',
    text: 'Trước tiên, văn bản được chia thành những mảnh nhỏ để xử lý, gọi là token.',
    visual: 'Câu văn đi vào hộp bộ tách văn bản thành token rồi ra thành dãy ô đánh số.',
  },
  {
    n: 6, seconds: 9, section: 2,
    title: 'Token không cố định bằng một từ',
    text: 'Một mảnh có thể là cả một từ, chỉ một phần của từ hoặc một dấu câu, tùy cách chia của mô hình.',
    visual: 'Một từ nằm trong một ô, một từ khác trải qua hai ô; dấu câu có ô riêng.',
  },
  {
    n: 7, seconds: 8, section: 2,
    title: 'Mảnh chữ = cách hình dung',
    text: 'Tên gọi mảnh văn bản giúp mình dễ hình dung, còn token được chia ở đâu là do bộ tách quyết định.',
    visual: 'Thêm nhãn “Mảnh chữ: cách gọi trực giác”, không hiển thị phân tách như kết quả thật.',
  },
  {
    n: 8, seconds: 8, section: 2, delivery: 'nhan',
    title: 'Khoảng trắng không phải bộ đếm token',
    text: 'Đặc biệt với tiếng Việt, các bạn không nên đếm khoảng trắng rồi mặc định mỗi tiếng là đúng một token.',
    visual: 'Bộ đếm khoảng trắng và bộ đếm token đặt cạnh nhau với dấu không đồng nhất.',
  },
  {
    n: 9, seconds: 7, section: 2,
    title: 'Mảnh văn bản → mã số → dãy số',
    text: 'Mỗi mảnh được chuyển thành mã số, rồi thành một dãy số để mô hình thực hiện phép tính.',
    visual: 'Các thẻ chữ lật mặt sau thành mã và dãy số, ghi “Sơ đồ đơn giản hóa”.',
  },
  {
    n: 10, seconds: 9, section: 2,
    title: 'Dùng phần văn bản được phép',
    text: 'Qua nhiều bước tính toán, những dãy số này kết hợp thông tin từ phần văn bản mà mô hình được phép dùng.',
    visual: 'Dãy thẻ đi qua các lớp; đánh dấu vị trí và chỉ nối các phần đã có, không vẽ đường từ văn bản chưa sinh.',
  },
  {
    n: 11, seconds: 8, section: 2, delivery: 'hoi',
    title: 'Sau “trời” có thể là gì?',
    text: 'Hãy nhìn vào ô trống sau chữ trời và thử đoán xem những cách nối tiếp nào nghe có vẻ phù hợp.',
    visual: 'Phóng lớn khoảng trống cuối câu; các thẻ ứng viên chờ phía dưới.',
  },
  // ——— Phần 3 · Dự đoán, chọn, nối rồi lặp ———
  {
    n: 12, seconds: 7, section: 3,
    title: '1. Tính khả năng của từng mảnh tiếp theo',
    text: 'Từ phần câu đã có, mô hình tính khả năng xuất hiện của từng mảnh có thể nối tiếp.',
    visual: 'Hộp mô hình xuất ra nhiều thanh khả năng, không xuất thẳng một từ duy nhất.',
  },
  {
    n: 13, seconds: 7, section: 3,
    title: 'Vài cách nối để minh họa',
    text: 'Bảng minh họa có các lựa chọn mưa, nắng, lạnh và một nhóm gom những cách nối khác.',
    visual: 'Bốn thanh hiện với nhãn mưa, nắng, lạnh, khác; giữ MINH HỌA ở góc.',
  },
  {
    n: 14, seconds: 10, section: 3, delivery: 'ke',
    title: 'MINH HỌA: khả năng nối tiếp văn bản',
    text: 'Mình đặt khả năng của mưa cao hơn để dựng ví dụ dễ hình dung; các tỷ lệ này không được lấy từ một mô hình thật.',
    visual: 'Thanh mưa 60% cao hơn ba thanh còn lại; chú thích mô phỏng vẫn rõ.',
  },
  {
    n: 15, seconds: 9, section: 3, delivery: 'nhan',
    title: 'Khả năng nối tiếp văn bản ≠ xác suất thời tiết',
    text: 'Các phần trăm trong bảng nói về mảnh văn bản có thể nối tiếp, không đo xem trời thật sự đang mưa hay không.',
    visual: 'Giữ bảng mưa, nắng, lạnh, khác và nhãn MINH HỌA; thêm tên Bảng nối tiếp văn bản, tách khỏi biểu tượng báo thời tiết chưa có dữ liệu.',
  },
  {
    n: 16, seconds: 8, section: 3,
    title: 'Sơ đồ đã giản lược',
    text: 'Mô hình thật có nhiều mảnh để chọn hơn, và một từ trên thẻ có thể cần tách thành nhiều mảnh.',
    visual: 'Phía sau bốn thanh mở ra nhiều hàng mờ; thẻ từ tách thử thành nhiều mảnh.',
  },
  {
    n: 17, seconds: 7, section: 3,
    title: '2. Chọn một token',
    text: 'Sau khi có bảng khả năng, hệ thống dùng một quy tắc để chọn ra mảnh tiếp theo.',
    visual: 'Một bộ chọn đứng giữa bảng phân bố và đầu câu, lấy một thẻ.',
  },
  {
    n: 18, seconds: 5, section: 3,
    title: 'Cách 1: chọn mức cao nhất',
    text: 'Một cách là luôn chọn mảnh có khả năng cao nhất trong bảng.',
    visual: 'Khoanh thẻ có khả năng cao nhất ở nhánh thứ nhất; giữ nhánh thứ hai mờ, chưa hiện kết quả.',
  },
  {
    n: 19, seconds: 8, section: 3,
    title: 'Cách 2: chọn theo mức khả năng',
    text: 'Cách khác là chọn theo các mức khả năng ấy, nên những mảnh ít khả năng hơn vẫn có thể được chọn.',
    visual: 'Mở nhánh thứ hai từ cùng bảng khả năng; dùng các vùng chọn có kích thước tương ứng, rồi chọn một thẻ; mọi tỷ lệ vẫn ghi MINH HỌA.',
  },
  {
    n: 20, seconds: 6, section: 3, delivery: 'ke',
    title: '3. Nối token vào chuỗi',
    text: 'Giả sử lần này chọn mưa, hệ thống nối mảnh ấy vào cuối câu đang viết.',
    visual: 'Thẻ mưa trượt vào khoảng trống sau trời; con trỏ chuyển sang vị trí mới.',
  },
  {
    n: 21, seconds: 8, section: 3,
    title: 'Ngữ cảnh mới gồm token vừa sinh',
    text: 'Lần dự đoán sau sẽ dùng cả chữ mưa vừa thêm, vì nó đã trở thành một phần của câu.',
    visual: 'Khung ngữ cảnh mở rộng bao gồm mưa; mũi tên quay về hộp mô hình.',
  },
  {
    n: 22, seconds: 8, section: 3, delivery: 'nhan',
    title: '4. Tính lại và lặp',
    text: 'Do đó, bảng khả năng phải được tính lại ở mỗi bước, thay vì dùng mãi bảng của bước đầu.',
    visual: 'Bảng phân bố cũ tan đi; bảng mới có dấu câu và từ nối phù hợp.',
  },
  {
    n: 23, seconds: 6, section: 3,
    title: 'Lặp đến điều kiện dừng',
    text: 'Các bước dự đoán, chọn và nối lặp lại cho đến khi gặp điều kiện dừng.',
    visual: 'Vòng lặp chạy thêm vài lượt rồi gặp biển dừng.',
  },
  {
    n: 24, seconds: 9, section: 3,
    title: 'Có nhiều điều kiện dừng',
    text: 'Hệ thống có thể dừng khi có tín hiệu kết thúc, hoặc khi câu trả lời đã chạm mức độ dài cho phép.',
    visual: 'Hai nhánh “Kết thúc” và “Giới hạn đầu ra” cùng dẫn đến dừng.',
  },
  {
    n: 25, seconds: 8, section: 3, delivery: 'nhan',
    title: 'Dừng tạo chữ chưa chắc đã trả lời xong',
    text: 'Vì vậy, câu trả lời có thể bị cắt khi chưa viết xong, chỉ vì đã hết phần độ dài được cấp.',
    visual: 'Một câu đang viết dở gặp vạch ngân sách; gắn nhãn “Cần kiểm tra kết thúc”.',
  },
];

export const SECTIONS = [
  'Mở đầu — chữ xuất hiện từ đâu',
  'Token — đơn vị mô hình xử lý',
  'Dự đoán, chọn, nối rồi lặp',
];

const FPS = 30;
let cursor = 0;
export const CUES = RAW.map((c) => {
  const start = cursor;
  cursor += c.frames ?? c.seconds * FPS;
  return { ...c, screen: c.title, start, end: cursor };
});
export const DURATION = cursor;

export const { spokenAt, speechEnd } = createSpeech(RAW, VOICE);
