import React from 'react';
import { Check, Card, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const Default = () => (
  <Stage w={260} h={130}>
    <Check x={70} y={65} />
    <Check x={190} y={65} color={C.accent} />
  </Stage>
);

export const BesideCard = () => (
  <Stage w={500} h={210}>
    <Card x={30} y={30} w={340} h={150} label="TIÊU CHÍ 1" lines={['CÓ NGUỒN', 'trích dẫn rõ']} />
    <Check x={420} y={105} />
  </Stage>
);

export const Checklist = () => (
  <Stage w={500} h={390}>
    <Card x={30} y={20} w={340} h={110} label="ĐÚNG ĐỊNH DẠNG" lines={['bảng 3 cột']} />
    <Check x={420} y={75} />
    <Card x={30} y={150} w={340} h={110} label="ĐỦ Ý" lines={['4 / 4 mục']} />
    <Check x={420} y={205} />
    <Card x={30} y={280} w={340} h={110} label="GIỌNG VĂN" lines={['chưa đánh giá']} muted={1} />
    <Check x={420} y={335} color={C.accent} opacity={0.35} />
  </Stage>
);
