import React from 'react';
import { ProbabilityBars, SvgText } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { MUA, Note, Row, Scene, TEXTS } from './shared.jsx';

/*
 * Câu 22 — căn cứ đổi thì bảng phải tính lại ở MỖI bước. Kịch bản không đưa bảng của bước sau, nên
 * bảng bên phải để trống có dấu hỏi — nói "phải tính lại", không bịa ra con số nào.
 */
const N = 22;
const OLD = [
  { label: 'mưa', value: 60, highlight: true }, { label: 'nắng', value: 20 },
  { label: 'lạnh', value: 10 }, { label: 'khác', value: 10 },
];
const EMPTY = OLD.map((i) => ({ label: '', value: 0 }));
const B = { max: 100, barW: 380, barH: 36, rowGap: 64, labelW: 140, size: 27 };
export default function S22() {
  const frame = useFrame();
  const later = appear(frame, 70);
  return (
    <Scene n={N} frame={frame}>
      <Row over={{ y: 300, tokens: TEXTS.concat([MUA[0].text]), size: 34, padX: 18, gap: 12 }} highlight={6} />
      <ProbabilityBars {...B} x={210} y={540} items={OLD} title="Bảng ở bước trước" showValues reveal={1} opacity={0.4} />
      <SvgText x={960} y={660} size={46} weight={700} color={C.textMuted} opacity={later}>→</SvgText>
      <ProbabilityBars {...B} x={1090} y={540} items={EMPTY} title="Bảng của bước sau" showValues={false} reveal={later} opacity={later} />
      <SvgText x={1330} y={690} size={72} weight={700} color={C.red} opacity={appear(frame, 100)}>?</SvgText>
      <Note y={930} color={C.red} opacity={appear(frame, 120)}>Phải tính lại, không dùng lại bảng cũ</Note>
    </Scene>
  );
}
