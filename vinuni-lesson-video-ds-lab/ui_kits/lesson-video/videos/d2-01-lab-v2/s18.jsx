import React from 'react';
import { SceneFrame, SvgText } from '../../../../components/index.js';
import { C, appear, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, captionsFor, footerFor } from './shared.jsx';

/*
 * Câu 18 — Module 1 title card (no header chrome). The motif of câu 17 stays below, small: GIẢI PHÁP in
 * front, BÀI TOÁN behind.
 */
const N = 18;
const T = { num: 4, title: spokenAt(N, 'Nhìn thấy') - 8, motif: 20 };

export default function S18() {
  const frame = useFrame();
  const on = appear(frame, T.num);
  const ot = appear(frame, T.title);
  const om = appear(frame, T.motif);
  const lift = 20 * (1 - smooth(frame, T.num, T.num + 24));
  return (
    <SceneFrame frame={frame} header={false} footer={footerFor(N)} captions={captionsFor(N)}>
      <SvgText x={960} y={250 + lift} size={26} weight={700} color={C.red} letterSpacing={5} opacity={on}>
        NGÀY 02
      </SvgText>
      <SvgText x={960} y={370 + lift} size={92} weight={700} color={C.red} opacity={on}>
        MODULE 1
      </SvgText>
      <SvgText x={960} y={470} size={54} weight={700} color={C.text} opacity={ot}>
        Nhìn thấy giải pháp
      </SvgText>
      <SvgText x={960} y={540} size={54} weight={700} color={C.text} opacity={ot}>
        trước khi thấy bài toán
      </SvgText>
      <rect x={868} y={580} width={184} height={6} rx={3} fill={C.red} opacity={ot} />
      <RoleCard x={990} y={650} w={340} h={180} tone="user" label="BÀI TOÁN" lines={['?']} size={48} opacity={om * 0.9} />
      <RoleCard x={700} y={720} w={380} h={180} tone="solution" label="GIẢI PHÁP" lines={['Giải pháp']} size={32} opacity={om} />
    </SceneFrame>
  );
}
