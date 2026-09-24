import React from 'react';
import { SvgText } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { MUA, Note, Row, Scene, TEXTS, cells } from './shared.jsx';

/* Câu 25 — hết phần độ dài được cấp thì câu bị cắt giữa chừng, dù chưa viết xong. */
const N = 25;
const FULL = TEXTS.concat([MUA[0].text, MUA[1].text]);
export default function S25() {
  const frame = useFrame();
  const cs = cells({ y: 440, tokens: FULL });
  const cut = cs[6];
  const show = appear(frame, 50);
  return (
    <Scene n={N} frame={frame}>
      <Row over={{ y: 440, tokens: FULL }} shown={6} enter={1} />
      <g opacity={show}>
        <rect x={cut.x - 14} y={cut.y - 30} width={4} height={cut.h + 60} fill={C.red} />
        <SvgText x={cut.x + 150} y={cut.y + cut.h / 2 + 16} size={36} weight={700} color={C.red}>hết độ dài</SvgText>
      </g>
      <Note y={760} color={C.red} opacity={appear(frame, 95)}>Câu trả lời có thể bị cắt giữa chừng</Note>
    </Scene>
  );
}
