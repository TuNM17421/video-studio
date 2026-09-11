import React from 'react';
import { Cross, Check, Card, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const Default = () => (
  <Stage w={260} h={130}>
    <Cross x={70} y={65} />
    <Cross x={190} y={65} color={C.accent} />
  </Stage>
);

export const RejectedOption = () => (
  <Stage w={500} h={210}>
    <Card x={30} y={30} w={340} h={150} label="PHƯƠNG ÁN A" lines={['ĐOÁN BỪA', 'không có căn cứ']} muted={1} />
    <Cross x={420} y={105} />
  </Stage>
);

export const CheckVersusCross = () => (
  <Stage w={900} h={210}>
    <Card x={30} y={30} w={330} h={150} label="PHƯƠNG ÁN A" lines={['TRẢ LỜI NGAY', 'bỏ qua dữ kiện']} />
    <Cross x={405} y={105} />
    <Card x={470} y={30} w={330} h={150} accent={C.red} label="PHƯƠNG ÁN B" lines={['HỎI LẠI', 'xin mã lớp']} active={1} />
    <Check x={845} y={105} />
  </Stage>
);
