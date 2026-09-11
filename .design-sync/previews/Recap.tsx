import React from 'react';
import { Recap, SceneFrame, Player, useFrame } from 'vinuni-lesson-video-ds';

// Recap is an HTML overlay under the centered header. Rows reveal at `reveals[i]`;
// the closing line fades in at closingAt. Frozen at 320 the terminal state holds.
const Frame = ({ scene, frame = 320 }: { scene: React.ComponentType; frame?: number }) => (
  <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden' }}>
    <Player scene={scene} duration={360} frame={frame} controls={false} />
  </div>
);

const ITEMS = [
  { title: 'Hai kỳ vọng', body: 'Phần mềm theo quy tắc: cùng điều kiện → cùng kết quả. Đầu ra ngôn ngữ có nhiều cách đúng.' },
  { title: 'Ba lớp bất định', body: 'Đầu vào đa dạng · quá trình tạo theo phân bố · đầu ra khác độ dài và giọng.' },
  { title: 'Tiêu chí trước', body: 'Nói rõ điều bắt buộc đúng, sai ở đâu gây hại, khi nào chuyển sang đường an toàn.' },
  { title: 'Đo trên cả tập', body: 'Đếm câu đạt, câu thiếu ý và hậu quả từng loại sai thay vì sửa một câu vừa gặp.' },
];
const REVEALS = [24, 84, 144, 204];

function FourRowsScene() {
  const frame = useFrame();
  return (
    <SceneFrame
      frame={frame}
      eyebrow="NGÀY 05 · THIẾT KẾ SẢN PHẨM AI"
      title="Tóm lại: bốn ý cần nhớ"
      tag="TÓM LẠI"
      footer={{ left: '06 / 06 · Sản phẩm AI và ba lớp bất định' }}
      overlay={
        <Recap
          frame={frame}
          items={ITEMS}
          reveals={REVEALS}
          closing="Biến thiên hữu ích khi phần nghĩa quan trọng vẫn đúng và phần chưa chắc được xử lý an toàn."
          closingAt={266}
          top={284}
        />
      }
    />
  );
}

function ThreeRowsScene() {
  const frame = useFrame();
  return (
    <SceneFrame
      frame={frame}
      eyebrow="NGÀY 02 · AI TẠO SINH"
      title="Tóm lại: vòng sinh chữ"
      tag="TÓM LẠI"
      overlay={
        <Recap
          frame={frame}
          top={300}
          gap={160}
          items={[
            { title: 'Ngữ cảnh', body: 'Mọi token đã có được đưa vào mô hình cùng một lúc.' },
            { title: 'Xác suất', body: 'Mô hình tính khả năng cho từng token có thể đứng tiếp theo.' },
            { title: 'Vòng lặp', body: 'Token vừa chọn được nối vào ngữ cảnh rồi lặp lại từ đầu.' },
          ]}
          reveals={[20, 60, 100]}
        />
      }
    />
  );
}

export const FourRowsClosing = () => <Frame scene={FourRowsScene} />;
export const ThreeRows = () => <Frame scene={ThreeRowsScene} />;
export const MidReveal = () => <Frame scene={FourRowsScene} frame={150} />;
