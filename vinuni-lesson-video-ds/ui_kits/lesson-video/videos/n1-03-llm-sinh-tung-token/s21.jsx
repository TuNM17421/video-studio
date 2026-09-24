import React from 'react';
import { appear, useFrame } from '../../../../lib/index.js';
import { C } from '../../../../lib/index.js';
import { MUA, Note, Row, Scene, TEXTS } from './shared.jsx';

/* Câu 21 — lần dự đoán sau dùng cả viên vừa thêm: nó đã là một phần của câu. */
const N = 21;
const NEXT = TEXTS.concat([MUA[0].text]);
export default function S21() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <Row over={{ y: 420, tokens: NEXT }} highlight={6} />
      <Note y={320} color={C.textMuted} size={30} opacity={appear(frame, 20)}>Phần câu làm căn cứ cho bước sau</Note>
      <Note y={720} opacity={appear(frame, 70)}>Mảnh vừa thêm cũng được tính vào</Note>
    </Scene>
  );
}
