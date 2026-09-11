import React from 'react';
import { RichText, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const RedKeyword = () => (
  <Stage w={900} h={140}>
    <RichText x={450} y={82} spans={[{ text: 'Mô hình chỉ đoán ' }, { text: 'token tiếp theo', color: C.red, weight: 700 }, { text: '.' }]} />
  </Stage>
);

export const MixedWeights = () => (
  <Stage w={900} h={140}>
    <RichText
      x={40}
      y={82}
      anchor="start"
      size={28}
      color={C.textMuted}
      weight={500}
      spans={[{ text: 'Desired: ' }, { text: 'replicas = 3', color: C.text, weight: 700 }, { text: '  ·  Actual: ' }, { text: 'replicas = 1', color: C.red, weight: 700 }]}
    />
  </Stage>
);

export const AccentBlue = () => (
  <Stage w={900} h={140}>
    <RichText x={450} y={86} size={40} weight={700} spans={[{ text: 'Nhận thức → ' }, { text: 'Suy luận', color: C.accent }, { text: ' → Hành động' }]} />
  </Stage>
);
