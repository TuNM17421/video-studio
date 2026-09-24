import React from 'react';
import { Card, Flow, SvgText } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

/* Câu 02 — mở hộp mô hình: chuỗi vào, một vòng lặp, một mảnh ra. Khung của cả video. */
const N = 2;
const IN = { x: 190, y: 480, w: 380, h: 150 };
const BOX = { x: 730, y: 430, w: 440, h: 250 };
const OUT = { x: 1330, y: 480, w: 380, h: 150 };
export default function S02() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <Card {...IN} lines={['Phần câu đã có']} size={30} opacity={appear(frame, 8)} />
      <Card {...BOX} lines={['Mô hình']} size={40} accent={C.accentStrong} opacity={appear(frame, 26)} />
      <Card {...OUT} lines={['Mảnh tiếp theo']} size={30} accent={C.red} opacity={appear(frame, 74)} />
      <Flow points={[{ x: IN.x + IN.w, y: 555 }, { x: BOX.x, y: 555 }]} frame={frame} start={40} end={62} />
      <Flow points={[{ x: BOX.x + BOX.w, y: 555 }, { x: OUT.x, y: 555 }]} frame={frame} start={66} end={88} color={C.red} />
      <Flow
        points={[{ x: OUT.x + OUT.w / 2, y: OUT.y + OUT.h }, { x: 960, y: 800 }, { x: IN.x + IN.w / 2, y: IN.y + IN.h }]}
        frame={frame} start={96} end={130} dashed
      />
      <SvgText x={960} y={848} size={28} weight={700} color={C.textMuted} opacity={appear(frame, 110)}>
        rồi lặp lại
      </SvgText>
    </Scene>
  );
}
