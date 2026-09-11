import React from 'react';
import { Player, SceneFrame, Card, Flow, C, appear, useFrame } from 'vinuni-lesson-video-ds';

// Player scales a 1920×1080 scene into its container — give it a positioned 16:9 box.
const Box = ({ children }: { children: React.ReactNode }) => (
  <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden' }}>{children}</div>
);

function HookScene() {
  const frame = useFrame();
  return (
    <SceneFrame frame={frame} eyebrow="NGÀY 02 · AI TẠO SINH" title="Máy đoán chữ tiếp theo thế nào?" tag="MINH HỌA" caption="Mình bắt đầu từ câu hỏi của người học.">
      <Card x={300} y={420} w={420} h={170} label="ĐẦU VÀO" icon="chat-bubble" lines={['CÂU HỎI', 'của người học']} size={28} lineHeight={40} opacity={appear(frame, 12)} />
      <Flow points={[{ x: 720, y: 505 }, { x: 1200, y: 505 }]} progress={appear(frame, 40, 40)} color={C.red} />
      <Card x={1200} y={420} w={420} h={170} accent={C.red} label="MÔ HÌNH" lines={['ĐOÁN TOKEN', 'tiếp theo']} size={28} lineHeight={40} opacity={appear(frame, 80)} />
    </SceneFrame>
  );
}

export const Frozen = () => (
  <Box>
    <Player scene={HookScene} duration={150} frame={120} controls={false} />
  </Box>
);

export const FrozenEarly = () => (
  <Box>
    <Player scene={HookScene} duration={150} frame={50} controls={false} />
  </Box>
);

export const WithControls = () => (
  <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', overflow: 'hidden' }}>
    <Player scene={HookScene} duration={150} frame={120} label="hook · 02-01" />
  </div>
);
