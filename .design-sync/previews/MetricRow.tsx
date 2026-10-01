import React from 'react';
import { MetricRow, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

const STAGE = { w: 1200, h: 480 };

// The two cases of one comparison: SAME labels, same order — the reader compares by column.
// `lead` marks the case the lesson lands on; only one row in a pair may carry it.
export const PairOfCases = () => (
  <Stage {...STAGE}>
    <MetricRow x={110} y={90} w={980} h={150} size={54}
      items={[{ label: 'Nóng nhất', value: '47,2 °C' }, { label: 'FPS', value: '48' }]} />
    <MetricRow x={110} y={290} w={980} h={150} size={54} lead
      items={[{ label: 'Nóng nhất', value: '39,0 °C' }, { label: 'FPS', value: '60', accent: true }]} />
  </Stage>
);

// `delta` is only for a ratio the script states out loud.
export const WithDelta = () => (
  <Stage {...STAGE}>
    <MetricRow x={110} y={90} w={980} h={150} size={54} lead
      items={[{ label: 'Quay 8K', value: '60 fps', accent: true, delta: '×2' }]} />
    <MetricRow x={110} y={290} w={980} h={150} size={54}
      items={[{ label: 'Slow-motion 4K', value: '240 fps', delta: '×2' }]} />
  </Stage>
);

// Three readings is the ceiling — a fourth turns a reading into a spec sheet.
export const ThreeReadings = () => (
  <Stage {...STAGE}>
    <MetricRow x={110} y={160} w={980} h={170} size={52}
      items={[{ label: 'Câu', value: '47' }, { label: 'Thời lượng', value: '5:16' }, { label: 'Dung lượng', value: '11,9 MB' }]} />
  </Stage>
);
