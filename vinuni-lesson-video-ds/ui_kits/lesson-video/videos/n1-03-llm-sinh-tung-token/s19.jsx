import React from 'react';
import { ProbabilityBars, SvgText } from '../../../../components/index.js';
import { C, appear, interpolate, CLAMP, useFrame } from '../../../../lib/index.js';
import { Note, Scene } from './shared.jsx';

/*
 * Câu 19 — cách hai: chọn THEO các mức khả năng ấy. Bảng không đổi (kịch bản không đưa bảng khác);
 * cái đổi là mảnh được chọn — kim trượt xuống dừng ở "nắng", tức mảnh ít khả năng hơn vẫn có cửa.
 */
const N = 19;
const ITEMS = [
  { label: 'mưa', value: 60, highlight: true },
  { label: 'nắng', value: 20 },
  { label: 'lạnh', value: 10 },
  { label: 'khác', value: 10 },
];
const BARS = { x: 400, y: 460, max: 100, barW: 500, barH: 44, rowGap: 78, labelW: 170, size: 32, showValues: true };
const ROW_Y = (i) => BARS.y + i * BARS.rowGap + BARS.barH / 2;
export default function S19() {
  const frame = useFrame();
  const t = interpolate(frame, [40, 100], [0, 1], CLAMP);
  const y = interpolate(t, [0, 1], [ROW_Y(0), ROW_Y(1)]);
  const land = appear(frame, 100);
  return (
    <Scene n={N} frame={frame}>
      <ProbabilityBars {...BARS} items={ITEMS} reveal={1} />
      <g opacity={appear(frame, 30)}>
        <SvgText x={1230} y={y + 12} size={40} weight={700} anchor="start" color={C.red}>◀</SvgText>
        <SvgText x={1285} y={y + 12} size={30} weight={700} anchor="start" color={C.red} opacity={land}>được chọn lần này</SvgText>
      </g>
      <Note y={880} opacity={land}>Mảnh ít khả năng hơn vẫn có thể được chọn</Note>
    </Scene>
  );
}
