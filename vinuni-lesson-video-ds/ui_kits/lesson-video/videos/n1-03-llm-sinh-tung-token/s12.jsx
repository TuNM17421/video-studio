import React from 'react';
import { ProbabilityBars } from '../../../../components/index.js';
import { linearProgress, useFrame } from '../../../../lib/index.js';
import { Row, Scene } from './shared.jsx';

/* Câu 12 — từ phần câu đã có, mô hình tính khả năng của từng mảnh nối tiếp. */
const N = 12;
const ITEMS = [
  { label: 'mưa', value: 60, highlight: true },
  { label: 'nắng', value: 20 },
  { label: 'lạnh', value: 10 },
  { label: 'khác', value: 10 },
];
const BARS = { x: 430, y: 520, max: 100, barW: 520, barH: 44, rowGap: 78, labelW: 170, size: 32, showValues: true };
export default function S12() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <Row over={{ y: 300, size: 40, padX: 22, gap: 16 }} />
      <ProbabilityBars {...BARS} items={ITEMS} title="Khả năng của mảnh nối tiếp" reveal={linearProgress(frame, 40, 150)} />
    </Scene>
  );
}
