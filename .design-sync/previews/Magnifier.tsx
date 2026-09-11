import React from 'react';
import { Magnifier, DocumentSheet, Card, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>;

const POLICY = ['QUY CHẾ HỌC VỤ 2026', 'Hoàn 100% học phí trong 14 ngày.', 'Sau 14 ngày: không hoàn.', 'Liên hệ phòng đào tạo.'];
const doc = <DocumentSheet x={40} y={30} w={500} lines={POLICY} highlight={[{ line: 1, tone: 'amber' }]} />;
const PATH = [
  { x: 150, y: 110, at: 0 },
  { x: 330, y: 115, at: 40 },
  { x: 300, y: 112, at: 70 },
];

export const ScanningDocument = () => (
  <Stage w={640} h={300}>
    {doc}
    <Magnifier path={PATH} frame={70} r={80} zoom={1.6}>{doc}</Magnifier>
  </Stage>
);

const CARDS = [
  { x: 30, y: 60, w: 250, h: 130, label: 'THẺ 1', lines: ['LIU ET AL.', 'ngữ cảnh dài'] },
  { x: 310, y: 60, w: 250, h: 130, label: 'THẺ 2', lines: ['ĐIỀU 12', 'hoàn học phí'] },
  { x: 590, y: 60, w: 250, h: 130, label: 'THẺ 3', lines: ['LỊCH HỌC', 'học kỳ 1'] },
];
const cards = <>{CARDS.map((c) => <Card key={c.label} {...c} />)}</>;

export const OverThreeCards = () => (
  <Stage w={880} h={280}>
    {cards}
    <Magnifier path={[{ x: 155, y: 125, at: 0 }, { x: 435, y: 125, at: 30 }, { x: 715, y: 125, at: 60 }]} frame={30} r={78} zoom={1.35} color={C.red}>{cards}</Magnifier>
  </Stage>
);

export const PlainLens = () => (
  <Stage w={400} h={260}>
    <Magnifier x={170} y={110} r={80} />
  </Stage>
);
