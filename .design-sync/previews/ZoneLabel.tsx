import React from 'react';
import { ZoneLabel, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const Default = () => (
  <Stage w={300} h={80}>
    <ZoneLabel x={150} y={40} label="OPERATIONS" />
  </Stage>
);

export const OnLanes = () => (
  <Stage w={600} h={200}>
    {[50, 100, 150].map((y) => (
      <line key={y} x1={20} x2={580} y1={y} y2={y} stroke={C.dotInactive} strokeWidth={3} />
    ))}
    <ZoneLabel x={120} y={50} size={20} label="BUILD" />
    <ZoneLabel x={300} y={100} size={20} label="DEPLOY" />
    <ZoneLabel x={450} y={150} size={20} label="GOVERNANCE" color={C.red} />
  </Stage>
);

export const Large = () => (
  <Stage w={400} h={100}>
    <ZoneLabel x={200} y={50} label="TELEMETRY" size={24} />
  </Stage>
);
