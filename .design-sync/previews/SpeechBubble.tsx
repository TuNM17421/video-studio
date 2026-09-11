import React from 'react';
import { SpeechBubble, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const TwoLines = () => (
  <Stage w={420} h={160}>
    <SpeechBubble x={20} y={20} w={380} h={100} lines={['Bước nào làm', 'bạn mất thời gian?']} tail="left" />
  </Stage>
);

export const RedRight = () => (
  <Stage w={420} h={140}>
    <SpeechBubble x={20} y={20} w={380} label="Mình bị kẹt ở bước 2!" tone="red" tail="right" />
  </Stage>
);

export const Dialogue = () => (
  <Stage w={640} h={280}>
    <SpeechBubble x={20} y={20} w={360} label="Nộp bài ở đâu ạ?" tail="left" />
    <SpeechBubble x={260} y={150} w={360} label="Mục Bài tập, em nhé." tone="red" tail="right" />
  </Stage>
);
