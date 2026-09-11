import React from 'react';
import { Stopwatch, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const Current = () => (
  <Stage w={360} h={220}>
    <Stopwatch x={180} y={90} sweep={0.8} label="Hiện nay" />
  </Stage>
);

export const Target = () => (
  <Stage w={360} h={220}>
    <Stopwatch x={180} y={90} sweep={0.45} label="Mục tiêu" color={C.accent} />
  </Stage>
);

export const Compare = () => (
  <Stage w={560} h={220}>
    <Stopwatch x={90} y={90} sweep={0} label="Bắt đầu" />
    <Stopwatch x={280} y={90} sweep={0.25} label="Đang đo" />
    <Stopwatch x={470} y={90} sweep={1} label="Hết giờ" />
  </Stage>
);

export const NoWedge = () => (
  <Stage w={360} h={220}>
    <Stopwatch x={180} y={90} sweep={0.6} wedge={false} label="Chỉ kim" color={C.accentStrong} />
  </Stage>
);
