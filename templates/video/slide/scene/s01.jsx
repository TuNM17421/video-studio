import React from 'react';
import { SvgText } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

/*
 * Câu 01 — placeholder. Thay bằng bố cục thật: nội dung trong y 250–960, caption ≤ 78 ký tự
 * (`lib/captions.js`), màu chỉ lấy từ `styles/<style>.json` và `lib/tokens.js`.
 */
const N = 1;
const T = { text: 20 };

export default function S01() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <SvgText x={960} y={540} size={40} weight={700} color={C.text} opacity={appear(frame, T.text)}>
        (placeholder — thay bằng nội dung thật của câu 1)
      </SvgText>
    </Scene>
  );
}
