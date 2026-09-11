import React from 'react';
import { EditIcon, Card, C, SvgText } from 'vinuni-lesson-video-ds';

// EditIcon is a standalone 64×64 <svg> (stroke = currentColor). Inside a scene SVG it nests
// as a child <svg> positioned with x / y / width / height; set the stroke via `color`.
const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);
const Tag = ({ x, y, children }: { x: number; y: number; children: string }) => (
  <SvgText x={x} y={y} size={17} weight={700} color={C.textMuted}>{children}</SvgText>
);

export const Accent = () => (
  <Stage w={360} h={200}>
    <EditIcon x={40} y={40} width={96} height={96} color={C.accent} />
    <Tag x={88} y={170}>96 px</Tag>
    <EditIcon x={200} y={64} width={48} height={48} color={C.accent} />
    <Tag x={224} y={170}>48 px</Tag>
    <EditIcon x={284} y={76} width={30} height={30} color={C.accent} />
    <Tag x={299} y={170}>30</Tag>
  </Stage>
);

export const Red = () => (
  <Stage w={360} h={200}>
    <EditIcon x={40} y={40} width={96} height={96} color={C.red} />
    <Tag x={88} y={170}>C.red</Tag>
    <circle cx={260} cy={88} r={56} fill={C.red} />
    <EditIcon x={231} y={59} width={58} height={58} color="#fff" />
    <Tag x={260} y={170}>trắng / nền đặc</Tag>
  </Stage>
);

export const InContext = () => (
  <Stage w={400} h={220}>
    <Card x={30} y={30} w={340} h={150} label="CHỈNH SỬA" icon="edit" lines={['bản nháp']} />
  </Stage>
);
