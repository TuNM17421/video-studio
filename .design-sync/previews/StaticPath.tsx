import React from 'react';
import { StaticPath, SvgText, C, sampleQuadratic } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);
const Note = ({ x, y, children }: { x: number; y: number; children: string }) => (
  <SvgText x={x} y={y} size={17} weight={600} anchor="start" color={C.textMuted}>{children}</SvgText>
);

export const Colors = () => (
  <Stage w={600} h={220}>
    <StaticPath points={[{ x: 40, y: 40 }, { x: 560, y: 40 }]} />
    <StaticPath points={[{ x: 40, y: 100 }, { x: 560, y: 100 }]} color={C.red} />
    <StaticPath points={[{ x: 40, y: 160 }, { x: 560, y: 160 }]} color={C.dotInactive} />
    <Note x={40} y={205}>accent · red · dotInactive (đường nền)</Note>
  </Stage>
);

export const Dashed = () => (
  <Stage w={600} h={160}>
    <StaticPath points={[{ x: 40, y: 60 }, { x: 560, y: 60 }]} dashed />
    <StaticPath points={[{ x: 40, y: 110 }, { x: 560, y: 110 }]} dashed color={C.red} opacity={0.5} />
  </Stage>
);

export const Elbow = () => (
  <Stage w={600} h={220}>
    <StaticPath points={[{ x: 40, y: 40 }, { x: 260, y: 40 }, { x: 260, y: 180 }, { x: 560, y: 180 }]} strokeWidth={6} />
    <StaticPath points={sampleQuadratic({ x: 300, y: 40 }, { x: 560, y: 40 }, { x: 560, y: 140 })} color={C.red} />
  </Stage>
);
