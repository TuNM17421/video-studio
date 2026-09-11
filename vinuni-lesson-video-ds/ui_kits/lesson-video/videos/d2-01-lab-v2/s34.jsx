import React from 'react';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene } from './shared.jsx';
import { Chain, ZoneFrame } from './v2-pE.jsx';

/*
 * Câu 34 — tình huống 1: a customer-facing chatbot. Frequently asked questions about products and
 * policies → the chatbot answers → purchase advice. Zones 2 and 3 wait as empty frames.
 */
const N = 34;
const CARD = spokenAt(N, 'câu hỏi thường gặp') - 8;
const ADVICE = spokenAt(N, 'tư vấn mua hàng') - 10;
const T = {
  title: spokenAt(N, 'một chatbot') - 6,
  card: CARD,
  chip: CARD + 14,
  f1: [CARD + 18, CARD + 44],
  advice: ADVICE,
  f2: [ADVICE + 2, ADVICE + 28],
};

export default function S34() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <ZoneFrame z={0} title={appear(frame, T.title)} hot={pulse(frame, T.title)} />
      <ZoneFrame z={1} />
      <ZoneFrame z={2} />
      <Chain
        z={0}
        frame={frame}
        vis={[appear(frame, T.card), appear(frame, T.chip), appear(frame, T.advice)]}
        flows={[T.f1, T.f2]}
        hot={[0, pulse(frame, T.f1[1]), pulse(frame, T.f2[1])]}
      />
    </Scene>
  );
}
