/**
 * N1-05 · Cơ chế chú ý — video MẪU của style Illustrated (lab).
 * Rút gọn từ phần 1–3 của kịch bản gốc (25 câu → 15) để nhịp khớp với style: mỗi phép biến hình có
 * thời gian đứng yên sau đó. Lý do rút và bảng câu bị bỏ: projects/n1-05-co-che-chu-y/kich-ban-goc.md.
 *
 * Vật liệu sống suốt cả video: câu "Lan không nhét vừa cuốn sách vào túi vì nó quá dày" — hiện ở câu 1,
 * ô "dày" biến tại chỗ thành "nhỏ" ở câu 3, và tới câu 15 các thẻ nội dung nhập lại thành một dải số
 * ngay dưới ô "nó". Không câu nào xoá câu văn đi vẽ lại.
 */
import { createSpeech } from '../../../../lib/speech.js';
import { VOICE } from './voice.js';

const RAW = [
  {
    n: 1, seconds: 10, section: 1, delivery: 'ke',
    title: 'Lan không nhét vừa cuốn sách vào túi vì nó quá dày.',
    text: 'Các bạn hãy đọc câu này: Lan không nhét vừa cuốn sách vào túi vì nó quá dày.',
    visual: 'Câu hiện thành một hàng ô, mỗi ô một mảnh; ô "nó" và ô "dày" để dành chỗ nhấn về sau.',
  },
  {
    n: 2, seconds: 11, section: 1,
    title: 'nó → cuốn sách',
    text: 'Một cách hiểu hợp lý là từ nó chỉ cuốn sách, vì sách quá dày nên không vừa túi.',
    visual: 'Một đường cong nối ô "nó" về ô "sách"; hai ô cùng sáng lên.',
  },
  {
    n: 3, seconds: 12, section: 1, delivery: 'ke',
    title: 'nó → chiếc túi',
    text: 'Nếu đổi thành quá nhỏ, ta lại hiểu từ nó chỉ chiếc túi, vì túi quá nhỏ nên không chứa được sách.',
    visual: 'Ô "dày" BIẾN HÌNH tại chỗ thành ô "nhỏ"; đường cong rời ô "sách", chuyển sang ô "túi".',
  },
  {
    n: 4, seconds: 15, section: 1, delivery: 'nhan',
    title: 'Ngữ cảnh · Cơ chế chú ý',
    text: 'Những phần giúp ta hiểu từ nó được gọi là ngữ cảnh, và cơ chế chú ý là cách mô hình kết hợp thông tin giữa các phần trong câu.',
    visual: 'Camera lùi ra thấy cả câu; ngoặc nhọn ôm cả hàng ô, nhãn "ngữ cảnh".',
  },
  {
    n: 5, seconds: 9, section: 2,
    title: 'mỗi mảnh — một dãy số',
    text: 'Để tính toán, mô hình dùng một dãy số thay cho mỗi mảnh văn bản.',
    visual: 'Camera lia tới ô "nó"; dưới ô mọc ra một dải ô giá trị.',
  },
  {
    n: 6, seconds: 11, section: 2, delivery: 'nhe',
    title: 'chưa đủ',
    text: 'Chỉ có dãy số ban đầu thì chưa đủ để biết mảnh ấy đang được dùng thế nào trong câu.',
    visual: 'Dải số của ô "nó" đứng một mình giữa khung trống; phần còn lại của câu mờ hẳn.',
  },
  {
    n: 7, seconds: 12, section: 2,
    title: 'mức phù hợp → kết hợp',
    text: 'Với mỗi mảnh, mô hình tính mức phù hợp của những mảnh được phép dùng, rồi kết hợp thông tin của chúng lại.',
    visual: 'Từ ô "nó" toả các đường về những ô phía trước, đường dày mảnh khác nhau theo mức phù hợp.',
  },
  {
    n: 8, seconds: 11, section: 2, delivery: 'nhe',
    title: 'nét đậm nhạt: minh họa',
    text: 'Các nét đậm nhạt trên hình chỉ để minh họa cách tính, không phải số đo lấy từ mô hình thật.',
    visual: 'Giữ nguyên hình; dòng chữ nhỏ hiện dưới cụm đường nối.',
  },
  {
    n: 9, seconds: 12, section: 3, delivery: 'ke',
    title: 'Cần tìm gì? · Phù hợp đến đâu? · Lấy nội dung nào?',
    text: 'Hãy theo dõi ba việc: xác định cần thông tin gì, so mức phù hợp, rồi lấy nội dung để kết hợp.',
    visual: 'Ba nhãn hiện lần lượt bên phải, thành mục lục cho cả phần.',
  },
  {
    n: 10, seconds: 11, section: 3,
    title: 'thẻ truy vấn',
    text: 'Việc đầu tiên được minh họa bằng thẻ truy vấn, có thể hiểu là thẻ cần tìm thông tin gì.',
    visual: 'Dải số của ô "nó" biến hình thành một tấm thẻ, nhãn "truy vấn".',
  },
  {
    n: 11, seconds: 11, section: 3,
    title: 'thẻ so khớp',
    text: 'Thẻ so khớp giúp tính xem thông tin ở mỗi mảnh phù hợp đến đâu với điều đang cần tìm.',
    visual: 'Mỗi ô phía trước mọc một tấm thẻ nhỏ, nhãn "so khớp"; thẻ truy vấn dò qua từng thẻ.',
  },
  {
    n: 12, seconds: 9, section: 3,
    title: 'thẻ nội dung',
    text: 'Còn thẻ nội dung chứa phần thông tin sẽ được mang đi kết hợp.',
    visual: 'Hàng thẻ thứ ba hiện dưới hàng so khớp, nhãn "nội dung".',
  },
  {
    n: 13, seconds: 14, section: 3, delivery: 'nhe',
    title: 'ba loại thẻ = ba dãy số',
    text: 'Trong mô hình thật, cả ba loại thẻ đều là những dãy số được tính theo cách đã học, không phải chữ do người viết phần mềm gắn sẵn.',
    visual: 'Ba tấm thẻ cùng lật, để lộ mặt sau là ba dải ô giá trị.',
  },
  {
    n: 14, seconds: 10, section: 3,
    title: 'trọng số',
    text: 'Từ mức phù hợp vừa tính, mỗi thẻ nội dung nhận một con số gọi là trọng số.',
    visual: 'Một con số hiện cạnh mỗi thẻ nội dung và chạy lên theo mức phù hợp của thẻ ấy.',
  },
  {
    n: 15, seconds: 15, section: 3, delivery: 'nhan',
    title: 'nhân theo trọng số → cộng lại → dãy số mới',
    text: 'Mô hình nhân dãy số trên từng thẻ nội dung với trọng số tương ứng rồi cộng lại, ra một dãy số mới đã mang thông tin của cả câu.',
    visual: 'Các thẻ nội dung co giãn theo trọng số rồi trượt vào nhau, BIẾN HÌNH thành một dải số duy nhất dưới ô "nó".',
  },
];

export const SECTIONS = [
  'Một từ cần cả câu xung quanh',
  'Vì sao phải kết hợp thông tin',
  'Ba vai trò: tìm gì, so khớp, lấy nội dung',
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
