import React from 'react';
import { SvgText } from '../../../../components/index.js';
import { C, appear, linearProgress, useFrame } from '../../../../lib/index.js';
import { Note, Row, Scene, TokenizerTag } from './shared.jsx';

/* Câu 05 — câu chữ trượt lên, hàng token hiện từng viên. Vật liệu của cả video bắt đầu từ đây. */
const N = 5;
export default function S05() {
  const frame = useFrame();
  const p = linearProgress(frame, 40, 150);
  const n = Math.min(6, Math.floor(p * 6) + (p > 0 ? 1 : 0));
  return (
    <Scene n={N} frame={frame}>
      <SvgText x={960} y={300} size={44} weight={600} color={C.textMuted} opacity={appear(frame, 6)}>
        Tôi mang ô vì trời…
      </SvgText>
      <TokenizerTag opacity={appear(frame, 36)} />
      <Row shown={n} enter={1} />
      <Note opacity={appear(frame, 150)}>Token: mảnh văn bản để xử lý</Note>
    </Scene>
  );
}
