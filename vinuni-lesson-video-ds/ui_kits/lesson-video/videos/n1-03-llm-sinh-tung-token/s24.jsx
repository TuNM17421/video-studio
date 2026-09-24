import React from 'react';
import { Card } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { Note, Scene } from './shared.jsx';

/* Câu 24 — hai điều kiện dừng: có tín hiệu kết thúc, hoặc chạm mức độ dài cho phép. */
const N = 24;
export default function S24() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <Note y={340} color={C.textMuted} size={32}>Dừng khi nào?</Note>
      <Card x={250} y={420} w={620} h={240} label="CÁCH MỘT" lines={['Có tín hiệu', 'kết thúc']} size={36} opacity={appear(frame, 14)} />
      <Card x={1050} y={420} w={620} h={240} label="CÁCH HAI" lines={['Chạm mức', 'độ dài cho phép']} size={36} accent={C.red} opacity={appear(frame, 60)} />
    </Scene>
  );
}
