import React from 'react';
import { HookOverlay, SceneFrame, Player, Card, useFrame } from 'vinuni-lesson-video-ds';

// HookOverlay covers scene 1 for its first 150 frames (question 8→28, underline 30→58,
// exit 116→132, backdrop fades 134→149). Frozen at 64 the hook is fully settled.
const Frame = ({ scene, frame = 64 }: { scene: React.ComponentType; frame?: number }) => (
  <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden' }}>
    <Player scene={scene} duration={240} frame={frame} controls={false} />
  </div>
);

function TwoLineScene() {
  const frame = useFrame();
  return (
    <SceneFrame
      frame={frame}
      eyebrow="NGÀY 05 · THIẾT KẾ SẢN PHẨM AI"
      title="Cùng điều kiện, cùng kết quả?"
      overlay={<HookOverlay frame={frame} question={'Cùng một câu hỏi, AI trả lời\nhai cách khác nhau: đó có phải lỗi?'} />}
    >
      <Card x={760} y={440} w={400} h={170} label="CÂU HỎI" icon="chat-bubble" lines={['HAI CÂU TRẢ LỜI', 'cùng một đầu vào']} size={28} lineHeight={40} />
    </SceneFrame>
  );
}

function OneLineScene() {
  const frame = useFrame();
  return (
    <SceneFrame
      frame={frame}
      eyebrow="NGÀY 02 · AI TẠO SINH"
      title="Máy đoán chữ tiếp theo thế nào?"
      overlay={<HookOverlay frame={frame} question="Máy có thật sự hiểu câu bạn viết?" />}
    >
      <Card x={760} y={440} w={400} h={170} label="ĐẦU VÀO" icon="chat-bubble" lines={['CÂU HỎI', 'của người học']} size={28} lineHeight={40} />
    </SceneFrame>
  );
}

export const TwoLines = () => <Frame scene={TwoLineScene} />;
export const OneLine = () => <Frame scene={OneLineScene} />;
export const Revealing = () => <Frame scene={TwoLineScene} frame={142} />;
