import React from 'react';
import { Slider, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

const Temp = ({ value }: { value: number }) => (
  <Stage w={520} h={120}>
    <Slider x1={140} x2={380} y={40} value={value} left="TẬP TRUNG" right="RỘNG" title="ĐỘ NGẪU NHIÊN (TEMPERATURE)" />
  </Stage>
);

export const Middle = () => <Temp value={0.5} />;
export const LowExtreme = () => <Temp value={0} />;
export const HighExtreme = () => <Temp value={1} />;

export const AccentColor = () => (
  <Stage w={520} h={120}>
    <Slider x1={140} x2={380} y={40} value={0.3} left="NGẮN" right="DÀI" title="ĐỘ DÀI CÂU TRẢ LỜI" color={C.accent} />
  </Stage>
);
