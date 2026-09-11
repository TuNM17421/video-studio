import React from 'react';
import { BranchRouter, Card, Flow, IllustrativeStamp, C, anchor } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

// Day 4 · route an AI answer by confidence: high → automatic, medium → human review, low → reject.
const CONF = [
  { label: 'CAO ≥ 0,9', dest: 'TỰ ĐỘNG GỬI', tone: 'output' },
  { label: 'TRUNG BÌNH', dest: 'NGƯỜI DUYỆT', tone: 'memory' },
  { label: 'THẤP < 0,6', dest: 'TỪ CHỐI', tone: 'red' },
];
const SRC = { x: 30, y: 180, w: 250, h: 140 };

export const ConfidenceRouter = () => (
  <Stage w={1200} h={500}>
    <Card {...SRC} label="MÔ HÌNH" size={21} lines={['ĐỘ TIN CẬY', '0,94']} />
    <Flow points={[anchor(SRC, 'right'), { x: 380, y: 250 }]} progress={1} arrow={false} />
    <BranchRouter x={380} y={250} branches={CONF} spread={150} length={480} destW={270} active={0} />
    <IllustrativeStamp x={1170} y={450} anchor="top-right" />
  </Stage>
);

export const Traveling = () => (
  <Stage w={1200} h={500}>
    <Card {...SRC} label="MÔ HÌNH" size={21} lines={['ĐỘ TIN CẬY', '0,72']} />
    <Flow points={[anchor(SRC, 'right'), { x: 380, y: 250 }]} progress={1} arrow={false} />
    <BranchRouter x={380} y={250} branches={CONF} spread={150} length={480} destW={270} active={1} frame={24} start={0} end={45} />
    <IllustrativeStamp x={1170} y={450} anchor="top-right" />
  </Stage>
);

// "Ngã tư đường với 4 biển chỉ dẫn" — four test-case branches, none chosen yet.
export const FourBranches = () => (
  <Stage w={1200} h={560}>
    <BranchRouter
      x={260} y={280} spread={125} length={500} destW={330} sourceLabel="CA KIỂM THỬ"
      branches={[
        { label: 'BÌNH THƯỜNG', dest: 'đúng như mong đợi', tone: 'output' },
        { label: 'CA BIÊN', dest: 'câu hỏi mơ hồ', tone: 'memory' },
        { label: 'LỖI', dest: 'tool trả về lỗi', tone: 'red' },
        { label: 'DỰ PHÒNG', dest: 'chuyển người thật', tone: 'check' },
      ]}
    />
  </Stage>
);
