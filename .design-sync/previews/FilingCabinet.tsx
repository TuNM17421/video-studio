import React from 'react';
import { FilingCabinet, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>;

const DRAWERS = ['Quy chế học vụ', 'Lịch học kỳ', 'Học phí & hoàn phí', 'Biên bản họp', 'Email cũ'];

export const DrawerThreeOpen = () => (
  <Stage w={760} h={480}>
    <FilingCabinet x={40} y={30} w={400} h={430} drawers={DRAWERS} selected={2} docLabel="Điều 12" />
  </Stage>
);

export const Closed = () => (
  <Stage w={640} h={470}>
    <FilingCabinet x={120} y={20} w={400} h={430} label="BỘ NHỚ NGOÀI" icon="database" drawers={DRAWERS} />
  </Stage>
);

export const Rising = () => (
  <Stage w={760} h={480}>
    <FilingCabinet x={40} y={30} w={400} h={430} drawers={DRAWERS} selected={2} frame={26} at={0} docLabel="Điều 12" />
  </Stage>
);
