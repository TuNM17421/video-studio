import React from 'react';
import { SvgText } from '../../../../components/index.js';
import { C, appear, pulse, useFrame } from '../../../../lib/index.js';
import { Note, Row, Scene, cells } from './shared.jsx';

/* Câu 11 — câu hỏi cho người xem: ô trống sau "trời" nối tiếp bằng gì? Giữ hình cho người xem đoán. */
const N = 11;
export default function S11() {
  const frame = useFrame();
  const cs = cells();
  const last = cs[cs.length - 1];
  const blink = 0.4 + 0.6 * pulse(frame, 30, 44);
  return (
    <Scene n={N} frame={frame}>
      <Row />
      <rect x={last.x + last.w + 20} y={last.y} width={190} height={last.h} rx={8} fill={C.bgAlt} stroke={C.red} strokeWidth={4} strokeDasharray="12 10" opacity={appear(frame, 14) * blink} />
      <SvgText x={last.x + last.w + 115} y={last.y + last.h / 2 + 20} size={54} weight={700} color={C.red} opacity={appear(frame, 30)}>?</SvgText>
      <Note y={760} opacity={appear(frame, 60)}>Cách nối tiếp nào nghe hợp lý?</Note>
    </Scene>
  );
}
