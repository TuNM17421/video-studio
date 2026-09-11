import React from 'react';
import { Particle, StaticPath, SvgText, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const Dots = () => (
  <Stage w={560} h={140}>
    <Particle x={80} y={60} />
    <Particle x={200} y={60} color={C.red} />
    <Particle x={320} y={60} r={14} />
    <Particle x={440} y={60} halo={false} color={C.red} opacity={0.5} />
    <SvgText x={260} y={120} size={17} weight={600} color={C.textMuted}>accent · red · r 14 · không halo, mờ</SvgText>
  </Stage>
);

export const OnTrack = () => (
  <Stage w={560} h={140}>
    <StaticPath points={[{ x: 40, y: 70 }, { x: 520, y: 70 }]} color={C.dotInactive} />
    <Particle x={220} y={70} />
  </Stage>
);

export const Labelled = () => (
  <Stage w={560} h={140}>
    <StaticPath points={[{ x: 40, y: 70 }, { x: 520, y: 70 }]} color={C.dotInactive} />
    <Particle x={150} y={70} color={C.red} label="v-new" />
    <Particle x={380} y={70} label="token" />
  </Stage>
);
