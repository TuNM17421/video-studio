import React from 'react';
import { Cursor, UIButton, C, SvgText } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);
const Tag = ({ x, y, children }: { x: number; y: number; children: string }) => (
  <SvgText x={x} y={y} size={17} weight={700} anchor="start" color={C.textMuted}>{children}</SvgText>
);

// From the top-left, glide to "Nộp bài" (arrive frame 30), click at 36.
const path = [
  { x: 120, y: 70, at: 0 },
  { x: 612, y: 152, at: 30 },
  { x: 612, y: 152, at: 36, click: true },
];

export const Static = () => (
  <Stage w={700} h={260}>
    <UIButton x={440} y={110} w={220} label="Nộp bài" icon="send" />
    <Cursor x={612} y={152} />
    <Tag x={40} y={230}>tĩnh · x, y</Tag>
  </Stage>
);

export const Moving = () => (
  <Stage w={700} h={260}>
    <path d="M 120 70 L 612 152" stroke={C.dotInactive} strokeWidth={3} strokeDasharray="12 10" fill="none" />
    <UIButton x={440} y={110} w={220} label="Nộp bài" icon="send" />
    <Cursor path={path} frame={16} />
    <Tag x={40} y={230}>frame 16 · đang di chuyển (EASE.inOut)</Tag>
  </Stage>
);

export const Click = () => (
  <Stage w={700} h={260}>
    <UIButton x={440} y={110} w={220} label="Nộp bài" icon="send" frame={41} pressAt={36} />
    <Cursor path={path} frame={41} />
    <Tag x={40} y={230}>frame 41 · click tại 36 → gợn sóng + nút nhấn</Tag>
  </Stage>
);
