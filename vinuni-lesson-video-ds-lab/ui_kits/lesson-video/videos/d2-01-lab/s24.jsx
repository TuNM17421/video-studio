import React from 'react';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { ProblemSlots, Scene } from './shared.jsx';
import { BeforeArrow, BeforeCard, ColumnHeads, SLOT_BOX } from './p4-shared.jsx';

/*
 * Câu 24 — part 4 opens on its stable layout: the original request (verbatim, purple = a solution) on
 * the left, and the empty three-slot problem sentence it has to be rewritten into on the right.
 */
const N = 24;
const T = {
  heads: 4,
  before: spokenAt(N, 'Yêu cầu ban đầu') + 2,
  hot: spokenAt(N, 'làm trợ lý hội thoại') - 4,
  arrow: [spokenAt(N, 'viết lại') - 14, spokenAt(N, 'viết lại') + 16],
};
T.slots = [T.arrow[1] - 6, T.arrow[1] + 4, T.arrow[1] + 14];

export default function S24() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <ColumnHeads opacity={appear(frame, T.heads)} />
      <BeforeCard opacity={appear(frame, T.before)} hot={pulse(frame, T.hot)} />
      {frame >= T.arrow[0] ? <BeforeArrow frame={frame} start={T.arrow[0]} end={T.arrow[1]} /> : null}
      <ProblemSlots box={SLOT_BOX} show={T.slots.map((t) => appear(frame, t))} fill={[0, 0, 0]} hot={[pulse(frame, T.arrow[1]), 0, 0]} />
    </Scene>
  );
}
