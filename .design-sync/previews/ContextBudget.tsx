import React from 'react';
import { ContextBudget, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>;

const SEGS = [
  { label: 'HỆ THỐNG', tokens: 800, tone: 'system' },
  { label: 'LỊCH SỬ', tokens: 3200, tone: 'accent' },
  { label: 'TÀI LIỆU', tokens: 3500, tone: 'amber' },
  { label: 'ĐẦU RA', tokens: 1000, tone: 'green' },
];

export const Overflow500 = () => (
  <Stage w={1100} h={330}>
    <ContextBudget x={30} y={110} w={760} segments={SEGS} limit={8000} title="KHUNG NGỮ CẢNH · token" showSum />
  </Stage>
);

export const NoNumbers = () => (
  <Stage w={1100} h={260}>
    <ContextBudget x={30} y={110} w={760} segments={SEGS} limit={8000} showNumbers={false} illustrative="GIỚI HẠN MINH HỌA" title="THƯỚC GIỚI HẠN" />
  </Stage>
);

export const Filling = () => (
  <Stage w={1100} h={260}>
    <ContextBudget x={30} y={110} w={760} segments={SEGS} limit={8000} frame={50} start={0} per={18} title="ĐANG NẠP NGỮ CẢNH" />
  </Stage>
);

export const WithinLimit = () => (
  <Stage w={1100} h={260}>
    <ContextBudget x={30} y={110} w={760} limit={8000} title="SAU KHI TÓM TẮT LỊCH SỬ"
      segments={[{ label: 'HỆ THỐNG', tokens: 800, tone: 'system' }, { label: 'TÓM TẮT', tokens: 1200, tone: 'purple' }, { label: 'TÀI LIỆU', tokens: 3500, tone: 'amber' }, { label: 'ĐẦU RA', tokens: 1000, tone: 'green' }]} />
  </Stage>
);
