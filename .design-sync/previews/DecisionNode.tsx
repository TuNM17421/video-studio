import React from 'react';
import { DecisionNode, decisionPorts, Card, Flow, C, SvgText, anchor } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);
const Note = ({ x, y, children }: { x: number; y: number; children: string }) => (
  <SvgText x={x} y={y} size={19} weight={600} color={C.textMuted}>{children}</SvgText>
);

export const States = () => (
  <Stage w={1100} h={380}>
    <DecisionNode x={180} y={170} label={['ĐỦ', 'THÔNG TIN?']} />
    <Note x={180} y={350}>idle</Note>
    <DecisionNode x={550} y={170} label={['ĐỦ', 'THÔNG TIN?']} state="active" frame={17} at={0} />
    <Note x={550} y={350}>active · đang cân nhắc</Note>
    <DecisionNode x={820} y={170} label={['ĐỦ', 'THÔNG TIN?']} state="resolved" answer="CHƯA ĐỦ" answerSide="right" />
    <Note x={820} y={350}>resolved · đã chọn nhánh</Note>
  </Stage>
);

// "Trả lời ngay hay gọi tool?" — the decision with its two exits.
const D = { x: 520, y: 250, size: 220 };
const P = decisionPorts(D);
const Q = { x: 40, y: 185, w: 270, h: 130 };
const NOW = { x: 820, y: 40, w: 330, h: 140 };
const TOOL = { x: 820, y: 320, w: 330, h: 140 };
export const AnswerOrCallTool = () => (
  <Stage w={1200} h={500}>
    <Card {...Q} label="CÂU HỎI" size={21} lines={['HẠN NỘP AI101?', 'của em Minh']} />
    <Flow points={[anchor(Q, 'right'), P.left]} progress={1} />
    <DecisionNode {...D} label={['CẦN', 'GỌI TOOL?']} state="resolved" answer="CÓ" answerSide="bottom" />
    <Flow points={[P.top, { x: P.top.x, y: anchor(NOW, 'left').y }, anchor(NOW, 'left')]} progress={1} />
    <Flow points={[P.bottom, { x: P.bottom.x, y: anchor(TOOL, 'left').y }, anchor(TOOL, 'left')]} progress={1} color={C.red} />
    <Card {...NOW} label="KHÔNG" size={21} lines={['TRẢ LỜI NGAY', 'từ kiến thức sẵn có']} muted={1} />
    <Card {...TOOL} label="CÓ" accent={C.red} size={21} lines={['GỌI tra_han_nop', 'ma_lop · ma_hs']} />
  </Stage>
);

export const LabelBelow = () => (
  <Stage w={700} h={380}>
    <DecisionNode x={350} y={150} size={180} labelPos="below" label="DỮ LIỆU CÓ HỢP LỆ?" tone="check" />
  </Stage>
);
