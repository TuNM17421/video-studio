import React from 'react';
import { StatusDot, C, SvgText } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);
const Tag = ({ x, y, children }: { x: number; y: number; children: string }) => (
  <SvgText x={x} y={y} size={17} weight={700} anchor="start" color={C.textMuted}>{children}</SvgText>
);

export const Default = () => (
  <Stage w={200} h={70}>
    <StatusDot x={60} y={35} />
    <StatusDot x={140} y={35} active />
  </Stage>
);

export const ThinkingCountdown = () => (
  <Stage w={420} h={110}>
    <SvgText x={30} y={45} size={20} weight={700} anchor="start" color={C.text}>SUY NGHĨ 5 GIÂY</SvgText>
    {[0, 1, 2, 3, 4].map((i) => (
      <StatusDot key={i} x={42 + i * 34} y={80} active={i < 2} />
    ))}
    <Tag x={220} y={86}>còn 3 giây</Tag>
  </Stage>
);

export const Large = () => (
  <Stage w={260} h={90}>
    <StatusDot x={50} y={45} r={16} />
    <StatusDot x={130} y={45} r={16} active />
    <StatusDot x={210} y={45} r={16} opacity={0.4} />
  </Stage>
);
