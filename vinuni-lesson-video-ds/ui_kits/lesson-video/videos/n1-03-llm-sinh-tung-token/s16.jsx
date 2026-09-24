import React from 'react';
import { SvgText, TokenRow } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { MUA, Note, Scene } from './shared.jsx';

/* Câu 16 — thẻ ghi "mưa" một chữ, nhưng bộ tách cần HAI mảnh: ␣m + ưa. Số thật của GPT-5. */
const N = 16;
export default function S16() {
  const frame = useFrame();
  const show = appear(frame, 60);
  return (
    <Scene n={N} frame={frame}>
      <SvgText x={560} y={360} size={32} weight={700} color={C.textMuted} opacity={appear(frame, 10)}>Trên thẻ ứng viên</SvgText>
      <TokenRow x={430} y={410} tokens={['mưa']} size={60} padX={38} color={C.textMuted} opacity={appear(frame, 16)} />
      <SvgText x={1360} y={360} size={32} weight={700} color={C.red} opacity={show}>Với mô hình</SvgText>
      <TokenRow x={1140} y={410} tokens={MUA.map((t) => t.text)} size={60} padX={38} highlight={1} opacity={show} />
      {MUA.map((t, i) => (
        <SvgText key={i} x={1238 + i * 214} y={600} size={28} weight={700} color={C.accentStrong} opacity={appear(frame, 90 + i * 14)}>
          {String(t.id)}
        </SvgText>
      ))}
      <Note y={800} opacity={appear(frame, 120)}>Một chữ trên thẻ có thể là nhiều mảnh</Note>
    </Scene>
  );
}
