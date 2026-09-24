import React from 'react';
import { Card, ProbabilityBars } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

/* Câu 15 — phần trăm nói về MẢNH VĂN BẢN nối tiếp, không đo thời tiết. Hai thứ dễ lẫn, tách hẳn ra. */
const N = 15;
const ITEMS = [
  { label: 'mưa', value: 60, highlight: true },
  { label: 'nắng', value: 20 },
  { label: 'lạnh', value: 10 },
  { label: 'khác', value: 10 },
];
const BARS = { x: 430, y: 520, max: 100, barW: 520, barH: 44, rowGap: 78, labelW: 170, size: 32, showValues: true };
export default function S15() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <ProbabilityBars {...BARS} y={380} items={ITEMS} title="Khả năng của mảnh nối tiếp" reveal={1} />
      <Card x={1160} y={380} w={520} h={190} label="ĐANG NÓI VỀ" lines={['Mảnh văn bản', 'nối tiếp']} size={30} opacity={appear(frame, 30)} />
      <Card x={1160} y={620} w={520} h={190} label="KHÔNG NÓI VỀ" lines={['Trời ngoài kia', 'có mưa hay không']} size={30} accent={C.red} dashed opacity={appear(frame, 80)} />
    </Scene>
  );
}
