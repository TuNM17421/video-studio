import React from 'react';
import { Pill, C, SvgText } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);
const Tag = ({ x, y, children }: { x: number; y: number; children: string }) => (
  <SvgText x={x} y={y} size={17} weight={700} anchor="start" color={C.textMuted}>{children}</SvgText>
);

export const Default = () => (
  <Stage w={280} h={100}>
    <Pill x={30} y={25} label="ĐÚNG Ý" />
  </Stage>
);

export const Variants = () => (
  <Stage w={900} h={130}>
    <Pill x={30} y={25} label="BẬT" />
    <Tag x={30} y={110}>outline</Tag>
    <Pill x={170} y={25} label="THAO TÁC RÕ" active />
    <Tag x={170} y={110}>active</Tag>
    <Pill x={400} y={25} label="CHẶN" variant="solid" />
    <Tag x={400} y={110}>solid</Tag>
    <Pill x={560} y={25} label="CHẶN" variant="solid" active />
    <Tag x={560} y={110}>solid · active</Tag>
    <Pill x={740} y={25} label="MINH HỌA" variant="muted" />
    <Tag x={740} y={110}>muted</Tag>
  </Stage>
);

export const LargeFixedWidth = () => (
  <Stage w={440} h={120}>
    <Pill x={30} y={25} w={380} h={64} size={24} label="ĐẦU RA NGÔN NGỮ" active />
  </Stage>
);
