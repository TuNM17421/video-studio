import React from 'react';
import { Envelope, envelopeSlot, Flow, Card, anchor, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>;

const SLOTS = [
  { label: 'Vai trò: trợ lý học vụ', kind: 'system' },
  { label: 'Câu hỏi: hoàn học phí?', kind: 'user' },
  { label: 'Kết quả tra cứu mã lớp', kind: 'tool' },
  { label: 'Quy chế 2026 · Điều 12', kind: 'doc' },
];

export const SentAndNotSent = () => (
  <Stage w={980} h={500}>
    <Envelope x={30} y={80} w={540} h={400} slots={SLOTS}
      outside={[{ label: 'Lịch sử chat tháng trước' }, { label: 'Toàn bộ kho tài liệu' }]} outsideW={360} />
  </Stage>
);

export const Sealed = () => (
  <Stage w={980} h={440}>
    <Envelope x={30} y={30} w={540} h={390} slots={SLOTS} sealed illustrative />
    <Card x={680} y={150} w={260} h={150} label="MÔ HÌNH" lines={['NHẬN GÓI', 'một lần gửi']} />
    <Flow points={[anchor({ x: 30, y: 30, w: 540, h: 390 }, 'right'), anchor({ x: 680, y: 150, w: 260, h: 150 }, 'left')]} frame={120} start={40} end={90} />
  </Stage>
);

const B = { x: 30, y: 80, w: 460, h: 230, slots: [{ label: 'Hãy tóm tắt email này', kind: 'user' }] };
export const OnlyUserBlock = () => (
  <Stage w={900} h={340}>
    <Envelope {...B} label="PHONG BÌ B" />
    <Card x={600} y={140} w={270} h={120} label="MÔ HÌNH" lines={['CHỈ THẤY', 'một khối user']} />
    <Flow points={[anchor(envelopeSlot(B, 0), 'right'), anchor({ x: 600, y: 140, w: 270, h: 120 }, 'left')]} frame={120} start={20} end={70} color={C.red} />
  </Stage>
);

export const SendPulse = () => (
  <Stage w={700} h={440}>
    <Envelope x={80} y={80} w={540} h={340} slots={SLOTS.slice(0, 3)} sealed frame={62} at={30} />
  </Stage>
);
