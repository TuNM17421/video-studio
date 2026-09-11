import React from 'react';
import { Person, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const Default = () => (
  <Stage w={420} h={250}>
    <Person x={210} y={86} name="Học viên" role="tìm hướng dẫn" />
  </Stage>
);

export const Active = () => (
  <Stage w={420} h={250}>
    <Person x={210} y={86} name="Người quan sát" role="ghi chú lại" active />
  </Stage>
);

export const Sizes = () => (
  <Stage w={520} h={220}>
    <Person x={90} y={80} r={56} name="Giảng viên" color={C.accentStrong} />
    <Person x={260} y={80} r={56} name="Trợ giảng" />
    <Person x={430} y={80} r={56} name="Học viên" active />
  </Stage>
);
