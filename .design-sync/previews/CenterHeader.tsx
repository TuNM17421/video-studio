import React from 'react';
import { CenterHeader, Card, C } from 'vinuni-lesson-video-ds';

// CenterHeader is SVG in 1920×1080 scene px (title baseline 176, divider y 220, tag at 228) — crop the top band.
const Stage = ({ h = 380, children }: { h?: number; children: React.ReactNode }) => (
  <svg viewBox={`0 60 1920 ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const WithTag = () => (
  <Stage>
    <CenterHeader title="Máy đoán chữ tiếp theo thế nào?" tag="MINH HỌA" />
    <Card x={760} y={300} w={400} h={120} label="ĐẦU VÀO" lines={['CÂU HỎI', 'của người học']} />
  </Stage>
);

export const TitleOnly = () => (
  <Stage h={200}>
    <CenterHeader title="Agent gồm những khối nào?" />
  </Stage>
);

export const SmallTitle = () => (
  <Stage h={240}>
    <CenterHeader title="So sánh hai cách chia nhỏ văn bản thành token" titleSize={40} tag="SO SÁNH" />
  </Stage>
);
