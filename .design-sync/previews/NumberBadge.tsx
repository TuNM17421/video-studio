import React from 'react';
import { NumberBadge, Card, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const Default = () => (
  <Stage w={260} h={80}>
    <NumberBadge x={50} y={40} value="01" />
    <NumberBadge x={130} y={40} value="02" active />
    <NumberBadge x={210} y={40} value="03" />
  </Stage>
);

export const OnCardEdge = () => (
  <Stage w={760} h={220}>
    <Card x={30} y={40} w={330} h={150} label="BƯỚC 1" lines={['ĐỌC ĐỀ', 'tìm dữ kiện']} muted={1} />
    <NumberBadge x={324} y={40} value="01" />
    <Card x={400} y={40} w={330} h={150} accent={C.red} label="BƯỚC 2" lines={['LẬP KẾ HOẠCH', 'chia việc nhỏ']} active={1} />
    <NumberBadge x={694} y={40} value="02" active />
  </Stage>
);

export const Letters = () => (
  <Stage w={340} h={100}>
    <NumberBadge x={60} y={50} value="A" r={30} />
    <NumberBadge x={170} y={50} value="B" r={30} active />
    <NumberBadge x={280} y={50} value="C" r={30} />
  </Stage>
);
