import React from 'react';
import { SvgText, C, MONO } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const Weights = () => (
  <Stage w={640} h={200}>
    <SvgText x={40} y={60} anchor="start" weight={700} size={30}>NHẬN THỨC · 700</SvgText>
    <SvgText x={40} y={112} anchor="start" weight={600}>nhận câu hỏi và tài liệu · 600</SvgText>
    <SvgText x={40} y={160} anchor="start" weight={500} color={C.textMuted}>ghi chú phụ, màu textMuted · 500</SvgText>
  </Stage>
);

export const Anchors = () => (
  <Stage w={640} h={200}>
    <path d="M 320 20 V 180" stroke={C.dotInactive} strokeDasharray="6 6" strokeWidth={1} />
    <SvgText x={320} y={60} anchor="end">căn phải</SvgText>
    <SvgText x={320} y={108} color={C.accent} weight={700}>CĂN GIỮA</SvgText>
    <SvgText x={320} y={156} anchor="start" color={C.red}>căn trái</SvgText>
  </Stage>
);

export const MonoAndSpaced = () => (
  <Stage w={640} h={200}>
    <SvgText x={320} y={70} size={17} weight={700} color={C.red} letterSpacing={3}>NGÀY 05 · MINH HỌA</SvgText>
    <SvgText x={320} y={132} size={26} family={MONO} color={C.text}>kubectl get pods</SvgText>
  </Stage>
);
