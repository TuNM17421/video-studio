import React from 'react';
import { Card } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { Note, Row, Scene, TokenizerTag } from './shared.jsx';

/* Câu 07 — tên gọi là để dễ hình dung; chỗ cắt là do BỘ TÁCH quyết định, nên phải ghi tên nó ra. */
const N = 7;
export default function S07() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <Row />
      <TokenizerTag opacity={appear(frame, 70)} />
      <Card x={250} y={620} w={620} h={150} lines={['“Mảnh chữ”', 'cách gọi cho dễ hình dung']} size={28} opacity={appear(frame, 12)} />
      <Card x={1050} y={620} w={620} h={150} label="AI QUYẾT ĐỊNH" lines={['Bộ tách của mô hình']} size={30} accent={C.red} opacity={appear(frame, 70)} />
      <Note y={880} color={C.textMuted} size={30} opacity={appear(frame, 110)}>Đổi bộ tách thì hàng ô này đổi theo</Note>
    </Scene>
  );
}
