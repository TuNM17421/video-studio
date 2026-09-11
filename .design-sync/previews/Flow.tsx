import React from 'react';
import { Flow, Card, SvgText, C, anchor, sampleQuadratic } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);
const Note = ({ x, y, children }: { x: number; y: number; children: string }) => (
  <SvgText x={x} y={y} size={19} weight={600} anchor="start" color={C.textMuted}>{children}</SvgText>
);

const line = [{ x: 60, y: 90 }, { x: 640, y: 90 }];

export const Settled = () => (
  <Stage w={700} h={160}>
    <Flow points={line} progress={1} />
    <Note x={60} y={140}>progress = 1 · nét đầy, có mũi tên</Note>
  </Stage>
);

export const MidTravel = () => (
  <Stage w={700} h={160}>
    <Flow points={line} progress={0.55} />
    <Note x={60} y={140}>progress = 0.55 · hạt dữ liệu đang chạy</Note>
  </Stage>
);

export const ChosenRed = () => (
  <Stage w={700} h={240}>
    <Flow points={[{ x: 60, y: 60 }, { x: 640, y: 60 }]} progress={1} />
    <Flow points={[{ x: 60, y: 140 }, { x: 640, y: 140 }]} progress={1} color={C.red} />
    <Note x={60} y={200}>xanh: đường thường · đỏ: đường được chọn</Note>
  </Stage>
);

const curve = sampleQuadratic({ x: 60, y: 220 }, { x: 350, y: -20 }, { x: 640, y: 220 });
export const Curved = () => (
  <Stage w={700} h={280}>
    <Flow points={curve} progress={0.6} />
    <Note x={60} y={262}>sampleQuadratic() · nét và hạt cùng một polyline</Note>
  </Stage>
);

const A = { x: 30, y: 40, w: 300, h: 140 };
const B = { x: 530, y: 40, w: 300, h: 140 };
export const BetweenCards = () => (
  <Stage w={860} h={220}>
    <Card x={A.x} y={A.y} w={A.w} h={A.h} label="NGUỒN" lines={['DỮ LIỆU', 'email · PDF']} />
    <Flow points={[anchor(A, 'right'), anchor(B, 'left')]} progress={1} color={C.red} hideIn={[A, B]} />
    <Card x={B.x} y={B.y} w={B.w} h={B.h} accent={C.red} label="ĐẦU RA" lines={['BẢN TÓM TẮT', 'đã chọn']} active={0.6} />
  </Stage>
);
