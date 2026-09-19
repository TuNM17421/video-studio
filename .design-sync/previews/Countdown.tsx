import React from 'react';
import { Countdown, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const QuizPause = () => (
  <Stage w={360} h={300}>
    <Countdown x={180} y={130} r={86} seconds={30} frame={540} label="giây để suy nghĩ" />
  </Stage>
);

export const Running = () => (
  <Stage w={600} h={260}>
    <Countdown x={100} y={120} r={64} seconds={30} frame={0} label="Bắt đầu" />
    <Countdown x={300} y={120} r={64} seconds={30} frame={450} label="Còn một nửa" />
    <Countdown x={500} y={120} r={64} seconds={30} frame={900} label="Hết giờ" />
  </Stage>
);

export const PlainRing = () => (
  <Stage w={360} h={300}>
    <Countdown x={180} y={130} r={86} seconds={20} frame={150} clock={false} color={C.accent} label="không có núm" />
  </Stage>
);
