import React from 'react';
import { StepCounter, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>;

export const Counting = () => (
  <Stage w={520} h={200}>
    <StepCounter x={30} y={36} value={2} max={3} label="LƯỢT GỌI CÔNG CỤ" illustrative="GIỚI HẠN MINH HỌA" />
  </Stage>
);

export const Progression = () => (
  <Stage w={1000} h={200}>
    <StepCounter x={30} y={36} value={0} max={3} label="LẦN THỬ LẠI" />
    <StepCounter x={350} y={36} value={1} max={3} label="LẦN THỬ LẠI" frame={68} at={60} />
    <StepCounter x={670} y={36} value={3} max={3} label="LẦN THỬ LẠI" />
  </Stage>
);

export const Paused = () => (
  <Stage w={520} h={240}>
    <StepCounter x={30} y={36} value={2} max={5} label="BƯỚC CỦA TÁC TỬ" paused illustrative />
  </Stage>
);
