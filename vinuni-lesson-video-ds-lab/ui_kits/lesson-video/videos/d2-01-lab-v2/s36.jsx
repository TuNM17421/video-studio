import React from 'react';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene } from './shared.jsx';
import { Chain, Situation3, ZoneFrame } from './v2-pE.jsx';

/*
 * Câu 36 — tình huống 3: a complex or high-risk question. The path into the chatbot stops at a
 * StopGate "CẦN NGƯỜI" and the handling turns to a support person (green) instead.
 */
const N = 36;
const CARD = spokenAt(N, 'câu hỏi phức tạp') - 8;
const HUMAN = spokenAt(N, 'được chuyển') - 4;
const T = {
  title: spokenAt(N, 'Tình huống thứ ba') + 4,
  card: CARD,
  chip: CARD + 16,
  a: [CARD + 20, CARD + 46],
  human: HUMAN,
  b: [HUMAN + 2, HUMAN + 30],
  gate: spokenAt(N, 'thay vì') - 6,
};

export default function S36() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <ZoneFrame z={0} title={1} />
      <ZoneFrame z={1} title={1} />
      <ZoneFrame z={2} title={appear(frame, T.title)} hot={pulse(frame, T.title)} />
      <Chain z={0} />
      <Chain z={1} />
      <Situation3
        frame={frame}
        vis={{ card: appear(frame, T.card), chip: appear(frame, T.chip), gate: appear(frame, T.a[1] - 6), human: appear(frame, T.human) }}
        flows={{ a: T.a, b: T.b }}
        gateAt={T.gate}
        hot={{ human: pulse(frame, T.b[1]) }}
      />
    </Scene>
  );
}
