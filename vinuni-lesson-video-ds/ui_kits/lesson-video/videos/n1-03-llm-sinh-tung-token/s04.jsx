import React from 'react';
import { Card } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { Note, Scene } from './shared.jsx';

/* Câu 04 — hai việc khác nhau, đặt cạnh nhau: tạo câu ≠ kiểm chứng. */
const N = 4;
export default function S04() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <Card x={260} y={420} w={580} h={260} label="VIỆC CỦA MÔ HÌNH" lines={['Tạo câu', 'nghe hợp lý']} size={40} opacity={appear(frame, 10)} />
      <Card x={1080} y={420} w={580} h={260} label="VIỆC CÒN LẠI" lines={['Kiểm chứng', 'đúng hay sai']} size={40} accent={C.red} opacity={appear(frame, 48)} />
      <Note y={800} color={C.red} opacity={appear(frame, 86)}>Hợp lý chưa chắc đúng</Note>
    </Scene>
  );
}
