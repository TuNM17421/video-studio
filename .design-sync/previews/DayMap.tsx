import React from 'react';
import { DayMap, SceneFrame, Player, C, useFrame } from 'vinuni-lesson-video-ds';

// DayMap is an SVG group in 1920×1080 scene px. Crop regions with a translated <g>
// (as the DS card does), and show the full-scene persistence inside SceneFrame.
const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);
const Frame = ({ scene }: { scene: React.ComponentType }) => (
  <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden' }}>
    <Player scene={scene} duration={1} frame={0} controls={false} />
  </div>
);

const ZONES = [
  { title: 'XÁC ĐỊNH VIỆC', question: ['Cần cải thiện gì?'], parts: [{ n: 1, label: 'Tìm khó khăn' }, { n: 2, label: 'Mô tả và đo' }] },
  { title: 'CHỌN CÁCH', question: ['Làm thế nào?'], parts: [{ n: 3, label: 'AI có giúp?' }, { n: 4, label: 'Tổ chức việc' }] },
  { title: 'KIỂM TRA ĐIỀU KIỆN', question: ['Đã sẵn sàng chưa?'], parts: [{ n: 5, label: 'Kết quả và lỗi' }, { n: 6, label: 'Quyết định' }] },
];

export const Full = () => (
  <Stage w={1640} h={340}>
    <g transform="translate(-140 -400)">
      <DayMap zones={ZONES} dock={0} />
    </g>
  </Stage>
);

export const StripActive = () => (
  <Stage w={1720} h={130}>
    <g transform="translate(-100 -276)">
      <DayMap zones={ZONES} dock={1} activePart={2} activeGlow={0.6} />
    </g>
  </Stage>
);

export const ClosingPulse = () => (
  <Stage w={1640} h={340}>
    <g transform="translate(-140 -400)">
      <DayMap zones={ZONES} dock={0} pulses={[0, 1, 0]} />
    </g>
  </Stage>
);

function OpeningScene() {
  const frame = useFrame();
  return (
    <SceneFrame frame={frame} eyebrow="NGÀY 02 · CẢI THIỆN CÔNG VIỆC VỚI AI" title="Ba câu hỏi của hôm nay" caption="Mỗi phần của ngày học trả lời một câu hỏi.">
      <DayMap zones={ZONES} dock={0} reveal={[1, 1, 0.4]} arrows={[1, 0.3]} />
    </SceneFrame>
  );
}

export const InScene = () => <Frame scene={OpeningScene} />;
