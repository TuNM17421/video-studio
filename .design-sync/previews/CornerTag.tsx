import React from 'react';
import { CornerTag, CenterHeader, C } from 'vinuni-lesson-video-ds';

// CornerTag is SVG, right-aligned at x 1792 under the divider (y 228) — crop the top-right region.
const Stage = ({ x, y, w, h, children }: { x: number; y: number; w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`${x} ${y} ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const UnderDivider = () => (
  <Stage x={1000} y={120} w={900} h={190}>
    <CenterHeader />
    <CornerTag label="MINH HỌA" />
  </Stage>
);

export const LongLabel = () => (
  <Stage x={1000} y={120} w={900} h={190}>
    <CenterHeader />
    <CornerTag label="GLASSBOX · BÊN TRONG MÔ HÌNH" />
  </Stage>
);

export const CustomPosition = () => (
  <Stage x={0} y={0} w={900} h={190}>
    <CornerTag label="SO SÁNH" right={300} y={40} />
    <CornerTag label="ĐANG MỜ DẦN" right={600} y={40} opacity={0.45} />
    <CornerTag label="BƯỚC 2" right={860} y={40} />
    <CornerTag label="MINH HỌA" right={300} y={110} />
  </Stage>
);
