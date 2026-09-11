import React from 'react';
import { Statement, SceneFrame, Player, C, useFrame } from 'vinuni-lesson-video-ds';

// Statement is a full-frame closing line on bgAlt: SceneFrame overlay with header={false}
// and background={C.bgAlt}. Settled after the 18-frame fade — freeze at 90.
const Frame = ({ scene, frame = 90 }: { scene: React.ComponentType; frame?: number }) => (
  <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden' }}>
    <Player scene={scene} duration={120} frame={frame} controls={false} />
  </div>
);

function DefaultScene() {
  const frame = useFrame();
  return (
    <SceneFrame
      frame={frame}
      header={false}
      background={C.bgAlt}
      overlay={<Statement frame={frame} eyebrow="TRƯỚC KHI THỰC HÀNH" text="LLM dự đoán, Transformer giúp nó nhìn toàn cục, và mỗi token đều có giá." />}
    />
  );
}

function TwoSentencesScene() {
  const frame = useFrame();
  return (
    <SceneFrame
      frame={frame}
      header={false}
      background={C.bgAlt}
      overlay={
        <Statement
          frame={frame}
          eyebrow="ĐIỀU CẦN NHỚ"
          icon="alert-bubble"
          text="Biến thiên không phải lỗi. Lỗi là khi phần nghĩa quan trọng bị sai mà không ai phát hiện."
        />
      }
    />
  );
}

function NoEyebrowScene() {
  const frame = useFrame();
  return (
    <SceneFrame frame={frame} header={false} background={C.bgAlt} overlay={<Statement frame={frame} icon="gear" text="Tác tử chỉ tốt bằng công cụ và tiêu chí mà bạn trao cho nó." />} />
  );
}

export const Default = () => <Frame scene={DefaultScene} />;
export const TwoSentences = () => <Frame scene={TwoSentencesScene} />;
export const NoEyebrow = () => <Frame scene={NoEyebrowScene} />;
