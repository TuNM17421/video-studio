import React from 'react';
import { ProbabilityBars } from '../../../../components/index.js';
import { appear, useFrame } from '../../../../lib/index.js';
import { Note, Row, Scene } from './shared.jsx';

/* Câu 13 — bốn lựa chọn trên bảng; "khác" là nhóm gom mọi cách nối còn lại. */
const N = 13;
const ITEMS = [
  { label: 'mưa', value: 60, highlight: true },
  { label: 'nắng', value: 20 },
  { label: 'lạnh', value: 10 },
  { label: 'khác', value: 10 },
];
const BARS = { x: 430, y: 520, max: 100, barW: 520, barH: 44, rowGap: 78, labelW: 170, size: 32, showValues: true };
export default function S13() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <Row over={{ y: 300, size: 40, padX: 22, gap: 16 }} />
      <ProbabilityBars {...BARS} items={ITEMS} title="Khả năng của mảnh nối tiếp" reveal={1} />
      <Note y={900} size={30} opacity={appear(frame, 90)}>“khác” gom mọi cách nối còn lại</Note>
    </Scene>
  );
}
