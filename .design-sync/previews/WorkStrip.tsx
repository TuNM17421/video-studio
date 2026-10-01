import React from 'react';
import { WorkStrip, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

const STAGE = { w: 1400, h: 420 };
const FRAMES = Array.from({ length: 12 }, (_, i) => ({ state: (i % 2 ? 'skip' : 'done') as const, label: i % 2 ? 'AI' : 'GPU' }));

// One cell per frame: solid = the GPU really drew it, dashed = it was skipped and filled in.
// "GPU chỉ vẽ một khung hình trên hai" is a sentence; this is the same thing, checkable by eye.
export const EveryOtherFrame = () => (
  <Stage {...STAGE}>
    <WorkStrip x={90} y={140} w={1220} cells={FRAMES} cellH={110} size={30} caption="Mỗi ô là một khung hình" />
  </Stage>
);

// The three states in order: already run · skipped · still waiting.
export const StepsOfARun = () => (
  <Stage {...STAGE}>
    <WorkStrip x={90} y={140} w={1220} cellH={120} size={32} caption="Một lượt chạy: đã chạy · bỏ qua · còn chờ"
      cells={[
        { state: 'done', label: 'B1' }, { state: 'done', label: 'B2' }, { state: 'done', label: 'B3' },
        { state: 'skip', label: 'B4' }, { state: 'pending', label: 'B5' }, { state: 'pending', label: 'B6' },
      ]} />
  </Stage>
);

// `reveal` fills the row left to right on the spoken phrase.
export const FillingIn = () => (
  <Stage {...STAGE}>
    <WorkStrip x={90} y={140} w={1220} cells={FRAMES} cellH={110} size={30} reveal={0.55} caption="Đang điền" />
  </Stage>
);
