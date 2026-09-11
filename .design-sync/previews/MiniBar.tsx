import React from 'react';
import { MiniBar, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const Default = () => (
  <Stage w={360} h={80}>
    <MiniBar x={30} y={40} w={300} value={0.7} label="Đạt tiêu chí · 7 ca" />
  </Stage>
);

export const RedAccent = () => (
  <Stage w={360} h={80}>
    <MiniBar x={30} y={40} w={300} value={0.2} label="Thiếu ý · 2 ca" accent={C.red} />
  </Stage>
);

export const Stacked = () => (
  <Stage w={360} h={220}>
    <MiniBar x={30} y={45} w={300} value={0.7} label="Đạt tiêu chí · 7 ca" />
    <MiniBar x={30} y={110} w={300} value={0.2} label="Thiếu ý · 2 ca" accent={C.red} />
    <MiniBar x={30} y={175} w={300} value={0.1} label="Sai hướng · 1 ca" accent={C.red} opacity={0.5} />
  </Stage>
);

export const Empty = () => (
  <Stage w={360} h={80}>
    <MiniBar x={30} y={40} w={300} value={0} label="Chưa đo · 0 ca" />
  </Stage>
);
