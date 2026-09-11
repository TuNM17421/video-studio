import React from 'react';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';
import { MidSymbol, PAIR_L, PAIR_R } from './v2-pA.jsx';

/* Câu 03 — a solution is not the need: purple GIẢI PHÁP first, green NHU CẦU later, a red ≠ between. */
const N = 3;
const T = {
  solution: spokenAt(N, 'một giải pháp') - 8,
  need: spokenAt(N, 'nhu cầu') - 6,
  neq: spokenAt(N, 'nhu cầu') + 18,
};

export default function S03() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <RoleCard {...PAIR_L} tone="solution" label="NHÌN THẤY" lines={['GIẢI PHÁP']} size={46} opacity={appear(frame, T.solution)} hot={pulse(frame, T.solution + 6)} />
      <RoleCard {...PAIR_R} tone="job" label="CHƯA CHẮC ĐÃ THẤY" lines={['NHU CẦU', 'cần giải quyết']} size={42} opacity={appear(frame, T.need)} hot={pulse(frame, T.need + 6)} />
      <MidSymbol ch="≠" opacity={appear(frame, T.neq)} />
    </Scene>
  );
}
