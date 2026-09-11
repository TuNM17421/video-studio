import React from 'react';
import { Enclosure, Card, GlassNode, Flow, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const AroundCards = () => (
  <Stage w={840} h={300}>
    <Enclosure x={20} y={45} w={800} h={235} label="ĐẦU RA NGÔN NGỮ" labelW={250} />
    <Card x={60} y={90} w={340} h={150} label="CÂU TRẢ LỜI" lines={['VĂN BẢN', 'tiếng Việt']} />
    <Card x={440} y={90} w={340} h={150} label="GIẢI THÍCH" lines={['LÝ DO', 'từng bước']} />
  </Stage>
);

export const NeutralAccent = () => (
  <Stage w={760} h={290}>
    <Enclosure x={20} y={45} w={720} h={225} label="HẠ TẦNG" color={C.accent} />
    <GlassNode x={200} y={160} label="MÁY CHỦ" subtitle="chạy mô hình" icon="gear" />
    <Flow points={[{ x: 320, y: 160 }, { x: 440, y: 160 }]} progress={1} />
    <GlassNode x={560} y={160} label="LƯU TRỮ" subtitle="nhật ký · dữ liệu" icon="database" />
  </Stage>
);

export const Unlabeled = () => (
  <Stage w={440} h={240}>
    <Enclosure x={20} y={20} w={400} h={200} />
    <Card x={50} y={45} w={340} h={150} label="PHẦN ĐANG BÀN" lines={['BỘ LỌC', 'chặn nội dung xấu']} />
  </Stage>
);
