/**
 * THỬ NGHIỆM — N1-03 câu 05–10 dựng lại trên MỘT mặt phẳng + camera (styles/illustrated.md).
 * Cùng lời đọc, cùng nội dung với n1-03-llm-sinh-tung-token câu 05–10; khác ở cơ chế: không Series,
 * không cảnh, không tiêu đề cảnh. Dùng để đặt cạnh bản cũ mà so thị giác.
 */
import { createSpeech } from '../../../../lib/speech.js';
import { VOICE } from './voice.js';

const RAW = [
  {
    n: 1, seconds: 6, section: 1,
    title: 'Token: mảnh văn bản để xử lý',
    text: 'Trước tiên, văn bản được chia thành những mảnh nhỏ để xử lý, gọi là token.',
    visual: 'Câu văn đi vào hộp bộ tách văn bản thành token rồi ra thành dãy ô đánh số.',
  },
  {
    n: 2, seconds: 9, section: 1,
    title: 'Token không cố định bằng một từ',
    text: 'Một mảnh có thể là cả một từ, chỉ một phần của từ hoặc một dấu câu, tùy cách chia của mô hình.',
    visual: 'Một từ nằm trong một ô, một từ khác trải qua hai ô; dấu câu có ô riêng.',
  },
  {
    n: 3, seconds: 8, section: 1,
    title: 'Mảnh chữ = cách hình dung',
    text: 'Tên gọi mảnh văn bản giúp mình dễ hình dung, còn token được chia ở đâu là do bộ tách quyết định.',
    visual: 'Thêm nhãn “Mảnh chữ: cách gọi trực giác”, không hiển thị phân tách như kết quả thật.',
  },
  {
    n: 4, seconds: 8, section: 1,
    title: 'Khoảng trắng không phải bộ đếm token',
    text: 'Đặc biệt với tiếng Việt, các bạn không nên đếm khoảng trắng rồi mặc định mỗi tiếng là đúng một token.',
    visual: 'Bộ đếm khoảng trắng và bộ đếm token đặt cạnh nhau với dấu không đồng nhất.',
  },
  {
    n: 5, seconds: 7, section: 1,
    title: 'Mảnh văn bản → mã số → dãy số',
    text: 'Mỗi mảnh được chuyển thành mã số, rồi thành một dãy số để mô hình thực hiện phép tính.',
    visual: 'Các thẻ chữ lật mặt sau thành mã và dãy số, ghi “Sơ đồ đơn giản hóa”.',
  },
  {
    n: 6, seconds: 9, section: 1,
    title: 'Dùng phần văn bản được phép',
    text: 'Qua nhiều bước tính toán, những dãy số này kết hợp thông tin từ phần văn bản mà mô hình được phép dùng.',
    visual: 'Dãy thẻ đi qua các lớp; đánh dấu vị trí và chỉ nối các phần đã có, không vẽ đường từ văn bản chưa sinh.',
  },
];

export const SECTIONS = ['Token — đơn vị mô hình xử lý'];

const FPS = 30;
let cursor = 0;
export const CUES = RAW.map((c) => {
  const start = cursor;
  cursor += c.frames ?? c.seconds * FPS;
  return { ...c, screen: c.title, start, end: cursor };
});
export const DURATION = cursor;

export const { spokenAt, speechEnd } = createSpeech(RAW, VOICE);
