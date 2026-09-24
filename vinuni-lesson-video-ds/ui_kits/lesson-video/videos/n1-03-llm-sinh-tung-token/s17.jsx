import React from 'react';
import { Card, Flow, ProbabilityBars } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

/* Câu 17 — có bảng khả năng rồi, còn cần một QUY TẮC để chọn ra một mảnh. */
const N = 17;
const ITEMS = [
  { label: 'mưa', value: 60, highlight: true },
  { label: 'nắng', value: 20 },
  { label: 'lạnh', value: 10 },
  { label: 'khác', value: 10 },
];
const BARS = { x: 430, y: 520, max: 100, barW: 520, barH: 44, rowGap: 78, labelW: 170, size: 32, showValues: true };
export default function S17() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <ProbabilityBars {...BARS} x={280} y={400} barW={420} labelW={150} items={ITEMS} title="Bảng khả năng" reveal={1} />
      <Flow points={[{ x: 950, y: 600 }, { x: 1180, y: 600 }]} frame={frame} start={30} end={56} />
      <Card x={1210} y={500} w={460} h={200} label="BƯỚC TIẾP" lines={['Quy tắc chọn']} size={38} accent={C.red} opacity={appear(frame, 50)} />
    </Scene>
  );
}
