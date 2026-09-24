import React from 'react';
import { VectorStrip } from '../../../../components/index.js';
import { linearProgress, useFrame } from '../../../../lib/index.js';
import { Row, Scene, TokenIds } from './shared.jsx';

/* Câu 09 — mỗi mảnh thành một mã số (số THẬT của bộ tách GPT-5), rồi mã số thành một dãy số. */
const N = 9;
const VEC = [0.8, -0.35, 0.15, 0.62, -0.9, 0.4, 0.25, -0.55];
export default function S09() {
  const frame = useFrame();
  const p = linearProgress(frame, 16, 120) * 6;
  return (
    <Scene n={N} frame={frame}>
      <Row highlight={5} />
      <TokenIds upto={Math.floor(p)} enter={p % 1} />
      <VectorStrip
        x={600} y={720} values={VEC} cell={88} h={96} gap={6}
        label="Dãy số của một mảnh" reveal={linearProgress(frame, 130, 220)}
      />
    </Scene>
  );
}
