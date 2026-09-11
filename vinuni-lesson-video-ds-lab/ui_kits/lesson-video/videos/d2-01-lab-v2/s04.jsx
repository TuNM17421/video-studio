import React from 'react';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';
import { MidSymbol, PAIR_L, PAIR_R } from './v2-pA.jsx';

/*
 * Câu 04 — same contrast as câu 03: the left card becomes "AI", the need stays; the ≠ turns into a red ?
 * on "thật sự cần AI".
 */
const N = 4;
const T = {
  swap: spokenAt(N, 'đưa AI vào') - 8,
  ask: spokenAt(N, 'thật sự cần AI') - 4,
};

export default function S04() {
  const frame = useFrame();
  const out = appear(frame, T.swap, 10);
  const ai = appear(frame, T.swap + 10, 16);
  const q = appear(frame, T.ask, 18);
  return (
    <Scene n={N} frame={frame}>
      <RoleCard {...PAIR_L} tone="solution" label="NHÌN THẤY" lines={['GIẢI PHÁP']} size={46} opacity={1 - out} />
      <RoleCard {...PAIR_L} tone="solution" label="CÓ THỂ ĐƯA VÀO" lines={['AI']} size={64} opacity={ai} hot={pulse(frame, T.swap + 26)} />
      <RoleCard {...PAIR_R} tone="job" label="CHƯA CHẮC ĐÃ THẤY" lines={['NHU CẦU', 'cần giải quyết']} size={42} />
      <MidSymbol ch="≠" opacity={1 - q} />
      <MidSymbol ch="?" opacity={q} />
    </Scene>
  );
}
