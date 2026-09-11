import React from 'react';
import { Recap, SceneFrame } from '../../../components/index.js';
import { useFrame } from '../../../lib/index.js';

export const meta = {
  id: 'recap-rail',
  title: 'Tóm lại: bốn ý cần nhớ',
  pattern: 'Recap rail + câu chốt',
  duration: 360,
};

/*
 * Closing recap (Day28 D28RecapScene re-seated under the centered header).
 * Four numbered rows reveal 60 f apart on a rail whose red fill tracks progress; a one-line
 * takeaway follows. Revealed rows stay: the terminal state (all rows + closing line) holds ≥ 3 s.
 */
const T = {
  reveals: [24, 84, 144, 204],
  closing: 266,
};

/* Rows start at 284 (not the component default 262) so row 1 clears the corner tag (y 228–270). */
const ROWS_TOP = 284;

const ITEMS = [
  { title: 'Hai kỳ vọng', body: 'Phần mềm theo quy tắc: cùng điều kiện → cùng kết quả. Đầu ra ngôn ngữ có nhiều cách đúng.' },
  { title: 'Ba lớp bất định', body: 'Đầu vào đa dạng · quá trình tạo theo phân bố · đầu ra khác độ dài và giọng.' },
  { title: 'Tiêu chí trước', body: 'Nói rõ điều bắt buộc đúng, sai ở đâu gây hại, khi nào chuyển sang đường an toàn.' },
  { title: 'Đo trên cả tập', body: 'Đếm câu đạt, câu thiếu ý và hậu quả từng loại sai thay vì sửa một câu vừa gặp.' },
];

const CLOSING = 'Biến thiên hữu ích khi phần nghĩa quan trọng vẫn đúng và phần chưa chắc được xử lý an toàn.';

const CAPTIONS = [
  { start: 0, end: 84, text: 'Tóm lại: phần mềm theo quy tắc lặp lại kết quả, ngôn ngữ có nhiều cách đúng.' },
  { start: 84, end: 144, text: 'Bất định đến từ ba lớp: đầu vào, quá trình tạo câu và đầu ra.' },
  { start: 144, end: 204, text: 'Đặt tiêu chí trước: điều gì bắt buộc đúng và khi nào cần đường an toàn.' },
  { start: 204, end: 266, text: 'Và đánh giá trên cả tập trường hợp, không chỉ sửa một câu vừa gặp.' },
  { start: 266, end: 360, text: 'Biến thiên chỉ hữu ích khi phần nghĩa quan trọng vẫn được giữ đúng.' },
];

export default function RecapRail() {
  const frame = useFrame();
  return (
    <SceneFrame
      frame={frame}
      eyebrow="NGÀY 05 · THIẾT KẾ SẢN PHẨM AI"
      title="Tóm lại: bốn ý cần nhớ"
      tag="TÓM LẠI"
      footer={{ left: '06 / 06 · Sản phẩm AI và ba lớp bất định' }}
      captions={CAPTIONS}
      overlay={<Recap frame={frame} items={ITEMS} reveals={T.reveals} closing={CLOSING} closingAt={T.closing} top={ROWS_TOP} />}
    />
  );
}
