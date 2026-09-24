import React from 'react';
import { ProbabilityBars } from '../../../../components/index.js';
import { appear, linearProgress, useFrame } from '../../../../lib/index.js';
import { MUA, Note, Row, Scene, TEXTS } from './shared.jsx';

/* Câu 20 — chọn mưa: viên ␣m nối vào cuối câu đang viết. Hàng token DÀI THÊM, không vẽ lại. */
const N = 20;
const ITEMS = [
  { label: 'mưa', value: 60, highlight: true },
  { label: 'nắng', value: 20 },
  { label: 'lạnh', value: 10 },
  { label: 'khác', value: 10 },
];
const BARS = { x: 430, y: 560, max: 100, barW: 480, barH: 40, rowGap: 70, labelW: 160, size: 30, showValues: true };
const NEXT = TEXTS.concat([MUA[0].text]);
export default function S20() {
  const frame = useFrame();
  const add = linearProgress(frame, 70, 130);
  return (
    <Scene n={N} frame={frame}>
      <Row over={{ y: 300, tokens: NEXT, size: 40, padX: 22, gap: 16 }} shown={6} enter={add} highlight={add > 0.5 ? 6 : -1} />
      <ProbabilityBars {...BARS} items={ITEMS} title="Khả năng của mảnh nối tiếp" reveal={1} />
      <Note y={940} opacity={appear(frame, 120)}>Mảnh được chọn nối vào cuối câu</Note>
    </Scene>
  );
}
