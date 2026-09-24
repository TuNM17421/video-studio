import React from 'react';
import { SvgText, TokenRow } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { Note, ROW, Row, Scene, TIENG } from './shared.jsx';

/* Câu 08 — đếm khoảng trắng ra năm, token thật là sáu. Hai hàng chồng nhau, so trực tiếp. */
const N = 8;
export default function S08() {
  const frame = useFrame();
  const late = appear(frame, 90);
  return (
    <Scene n={N} frame={frame}>
      <TokenRow x={ROW.x} y={300} tokens={TIENG} size={48} padX={26} gap={20} color={C.textMuted} />
      <SvgText x={1690} y={358} size={38} weight={700} anchor="end" color={C.textMuted}>đếm tiếng: 5</SvgText>
      <Row over={{ y: 520 }} />
      <SvgText x={1690} y={578} size={38} weight={700} anchor="end" color={C.red} opacity={late}>token thật: 6</SvgText>
      <Note y={800} color={C.red} opacity={late}>Đừng đếm khoảng trắng</Note>
      <Note y={868} color={C.textMuted} size={28} opacity={appear(frame, 130)}>Khoảng trắng nằm trong token, không nằm giữa</Note>
    </Scene>
  );
}
