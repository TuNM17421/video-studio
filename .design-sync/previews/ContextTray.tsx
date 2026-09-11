import React from 'react';
import { ContextTray, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>;

const ITEMS = [
  { label: 'Quy chế học vụ 2026' },
  { label: 'Tóm tắt hội thoại', tone: 'memory' },
  { label: 'Lịch học kỳ 1' },
  { label: 'Biên bản họp khoa' },
  { label: 'Email tháng trước' },
];

export const FullWithQueue = () => (
  <Stage w={900} h={340}>
    <ContextTray x={30} y={30} w={400} h={290} items={ITEMS} capacity={3} />
  </Stage>
);

export const SlidingIn = () => (
  <Stage w={900} h={340}>
    <ContextTray x={30} y={30} w={400} h={290} items={ITEMS} capacity={3} frame={30} start={0} per={12} />
  </Stage>
);

export const RoomLeft = () => (
  <Stage w={560} h={400}>
    <ContextTray x={80} y={30} w={400} h={350} label="KHUNG NGỮ CẢNH" capacity={4}
      items={[{ label: 'Câu hỏi của học viên', icon: 'mail' }, { label: 'Điều 12 · hoàn học phí', tone: 'red' }]} />
  </Stage>
);
