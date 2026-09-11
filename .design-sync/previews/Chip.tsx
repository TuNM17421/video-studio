import React from 'react';
import { Chip, Card, C, SvgText } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);
const Tag = ({ x, y, children }: { x: number; y: number; children: string }) => (
  <SvgText x={x} y={y} size={17} weight={700} anchor="start" color={C.textMuted}>{children}</SvgText>
);

export const Default = () => (
  <Stage w={220} h={90}>
    <Chip x={30} y={27} label="ĐỌC" />
  </Stage>
);

export const Tones = () => (
  <Stage w={560} h={130}>
    <Chip x={30} y={30} label="ĐỌC" />
    <Tag x={30} y={100}>blue</Tag>
    <Chip x={200} y={30} label="CHẶN" tone="red" />
    <Tag x={200} y={100}>red</Tag>
    <Chip x={380} y={30} label="Có mã" tone="muted" />
    <Tag x={380} y={100}>muted</Tag>
  </Stage>
);

export const InsideCard = () => (
  <Stage w={420} h={270}>
    <Card x={30} y={30} w={360} h={210} label="QUYỀN TRUY CẬP" lines={['TỆP BẢNG ĐIỂM', 'chỉ giảng viên']} />
    <Chip x={60} y={180} label="ĐỌC" />
    <Chip x={140} y={180} label="GHI" tone="red" />
  </Stage>
);
