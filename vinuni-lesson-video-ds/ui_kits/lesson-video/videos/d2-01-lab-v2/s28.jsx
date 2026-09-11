import React from 'react';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene } from './shared.jsx';
import { Board } from './v2-pD.jsx';

/*
 * Câu 28 (n 28) — the external-customer workflow builds step by step in lane 0 as each step is
 * named; the lane-1 row (internal staff) stays empty until câu 29. Links run step → step with a
 * particle; each step appears before its link arrives and pulses once on arrival.
 */
const N = 28;
const SAY = [
  spokenAt(N, 'một câu hỏi của khách'),
  spokenAt(N, 'giải đáp'),
  spokenAt(N, 'tư vấn mua hàng'),
  spokenAt(N, 'chăm sóc sau mua'),
];
const T = {
  lanes: 0,
  steps: SAY.map((t) => t - 8),
  links: SAY.slice(1).map((t) => ({ start: t - 10, end: t + 6 })),
  upsell: spokenAt(N, 'bán thêm') - 6,
};

export default function S28() {
  const frame = useFrame();
  const lane0 = {
    steps: T.steps.map((t, i) => ({ o: appear(frame, t), hot: i === 0 ? 0 : pulse(frame, T.links[i - 1].end) })),
    links: T.links.map((lk) => (frame >= lk.start ? lk : undefined)),
  };
  return (
    <Scene n={N} frame={frame}>
      <Board frame={frame} laneStart={T.lanes} lanes={[lane0, { steps: [] }]} extras={{ upsell: appear(frame, T.upsell) }} />
    </Scene>
  );
}
