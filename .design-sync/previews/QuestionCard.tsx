import React from 'react';
import { QuestionCard, SceneFrame, Player, useFrame } from 'vinuni-lesson-video-ds';

// QuestionCard is an HTML overlay in the SceneFrame content zone; questions reveal 20 f apart,
// then the hint. Frozen at 150 every line has settled.
const Frame = ({ scene, frame = 150 }: { scene: React.ComponentType; frame?: number }) => (
  <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden' }}>
    <Player scene={scene} duration={180} frame={frame} controls={false} />
  </div>
);

function TwoQuestionsScene() {
  const frame = useFrame();
  return (
    <SceneFrame
      frame={frame}
      eyebrow="NGÀY 02 · AI TẠO SINH"
      title="Bạn kể lại vòng sinh như thế nào?"
      tag="TỰ KIỂM TRA"
      overlay={<QuestionCard frame={frame} start={20} questions={['Ngữ cảnh đã có đi vào đâu?', 'Token vừa chọn được đưa về đâu?']} hint="Thử kể lại trước khi xem sơ đồ." />}
    />
  );
}

function ThreeQuestionsScene() {
  const frame = useFrame();
  return (
    <SceneFrame
      frame={frame}
      eyebrow="NGÀY 04 · TRUY XUẤT TÀI LIỆU"
      title="Trước khi sang phần tiếp theo"
      tag="TỰ KIỂM TRA"
      overlay={
        <QuestionCard
          frame={frame}
          start={10}
          top={320}
          gap={120}
          questions={['Vì sao cần chia tài liệu thành đoạn?', 'Câu hỏi được so với đoạn nào?', 'Khi nào nên trả lời "không biết"?']}
          hint="Dừng video và trả lời từng câu."
        />
      }
    />
  );
}

function SingleScene() {
  const frame = useFrame();
  return (
    <SceneFrame
      frame={frame}
      eyebrow="NGÀY 05 · THIẾT KẾ SẢN PHẨM AI"
      title="Một câu để nhớ"
      overlay={<QuestionCard frame={frame} start={20} top={440} questions={['Điều gì bắt buộc phải đúng trong câu trả lời?']} />}
    />
  );
}

export const TwoQuestions = () => <Frame scene={TwoQuestionsScene} />;
export const ThreeQuestions = () => <Frame scene={ThreeQuestionsScene} />;
export const SingleNoHint = () => <Frame scene={SingleScene} />;
export const Revealing = () => <Frame scene={TwoQuestionsScene} frame={42} />;
