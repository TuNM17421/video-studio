import React from 'react';
import { ProbabilityBars, SvgText } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { Note, Scene } from './shared.jsx';

/* Câu 18 — cách một: luôn lấy mảnh khả năng cao nhất. Kim luôn chỉ vào hàng đầu. */
const N = 18;
const ITEMS = [
  { label: 'mưa', value: 60, highlight: true },
  { label: 'nắng', value: 20 },
  { label: 'lạnh', value: 10 },
  { label: 'khác', value: 10 },
];
const BARS = { x: 400, y: 460, max: 100, barW: 500, barH: 44, rowGap: 78, labelW: 170, size: 32, showValues: true };
export default function S18() {
  const frame = useFrame();
  const y = BARS.y + BARS.barH / 2;
  return (
    <Scene n={N} frame={frame}>
      <ProbabilityBars {...BARS} items={ITEMS} reveal={1} />
      <g opacity={appear(frame, 36)}>
        <SvgText x={1230} y={y + 12} size={40} weight={700} anchor="start" color={C.red}>◀</SvgText>
        <SvgText x={1285} y={y + 12} size={30} weight={700} anchor="start" color={C.red}>luôn là mảnh này</SvgText>
      </g>
      <Note y={880} opacity={appear(frame, 90)}>Lần nào cũng ra cùng một kết quả</Note>
    </Scene>
  );
}
