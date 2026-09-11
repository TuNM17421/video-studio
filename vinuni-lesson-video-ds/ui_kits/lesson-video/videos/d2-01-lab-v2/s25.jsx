import React from 'react';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene } from './shared.jsx';
import { BotB, Lanes, placeFlows } from './v2-pC.jsx';

/* Câu 25 — the two groups get their names, each on its words: khách hàng bên ngoài · nhân sự nội bộ. */
const N = 25;
const T = { labels: [spokenAt(N, 'khách hàng bên ngoài') - 6, spokenAt(N, 'nhân sự nội bộ') - 6] };

export default function S25() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <Lanes labels={T.labels.map((t) => appear(frame, t))} hot={T.labels.map((t) => pulse(frame, t + 4))} />
      {placeFlows(frame, -60, -30)}
      <BotB />
    </Scene>
  );
}
