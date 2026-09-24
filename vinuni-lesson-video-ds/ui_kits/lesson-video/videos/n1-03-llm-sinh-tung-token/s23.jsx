import React from 'react';
import { Card, Flow } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

/* Câu 23 — ba bước lặp cho tới khi gặp điều kiện dừng. Vòng khép lại. */
const N = 23;
const A = { x: 260, y: 440, w: 380, h: 150 };
const B = { x: 770, y: 440, w: 380, h: 150 };
const Cc = { x: 1280, y: 440, w: 380, h: 150 };
export default function S23() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <Card {...A} lines={['Dự đoán']} size={36} opacity={appear(frame, 8)} />
      <Card {...B} lines={['Chọn']} size={36} opacity={appear(frame, 30)} />
      <Card {...Cc} lines={['Nối']} size={36} opacity={appear(frame, 52)} />
      <Flow points={[{ x: A.x + A.w, y: 515 }, { x: B.x, y: 515 }]} frame={frame} start={26} end={44} />
      <Flow points={[{ x: B.x + B.w, y: 515 }, { x: Cc.x, y: 515 }]} frame={frame} start={48} end={66} />
      <Flow points={[{ x: Cc.x + Cc.w / 2, y: Cc.y + Cc.h }, { x: 960, y: 760 }, { x: A.x + A.w / 2, y: A.y + A.h }]} frame={frame} start={74} end={120} dashed color={C.red} />
    </Scene>
  );
}
