import React from 'react';
import { appear, useFrame } from '../../../../lib/index.js';
import { C } from '../../../../lib/index.js';
import { Note, Row, Scene, TokenizerTag } from './shared.jsx';

/* Câu 06 — "Tôi" chẻ làm đôi: T + ôi. Ví dụ thật của bộ tách, không phải minh hoạ. */
const N = 6;
export default function S06() {
  const frame = useFrame();
  const hi = frame < 60 ? -1 : frame < 130 ? 0 : 1;
  return (
    <Scene n={N} frame={frame}>
      <TokenizerTag />
      <Row highlight={hi} />
      <Note y={310} color={C.red} opacity={appear(frame, 62)}>Một từ, hai mảnh</Note>
      <Note opacity={appear(frame, 150)}>Token không cố định bằng một từ</Note>
    </Scene>
  );
}
