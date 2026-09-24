import React from 'react';
import { SvgText } from '../../../../components/index.js';
import { C, appear, pulse, useFrame } from '../../../../lib/index.js';
import { Note, Scene } from './shared.jsx';

/* Câu 03 — câu xuyên suốt xuất hiện lần đầu, còn là CHỮ, chưa phải token. Ô trống cuối nhấp nháy. */
const N = 3;
export default function S03() {
  const frame = useFrame();
  const blink = 0.35 + 0.65 * pulse(frame, 40, 40);
  return (
    <Scene n={N} frame={frame}>
      <SvgText x={860} y={560} size={86} weight={700} anchor="end" color={C.text} opacity={appear(frame, 10)}>
        Tôi mang ô vì trời
      </SvgText>
      <rect x={890} y={498} width={190} height={78} rx={10} fill={C.bgAlt} stroke={C.red} strokeWidth={4} opacity={appear(frame, 46) * blink} />
      <Note y={760} opacity={appear(frame, 60)}>Còn thiếu mảnh cuối</Note>
    </Scene>
  );
}
