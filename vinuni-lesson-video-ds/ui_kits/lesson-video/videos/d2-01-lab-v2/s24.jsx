import React from 'react';
import { pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene } from './shared.jsx';
import { BotB, Lanes, placeFlows } from './v2-pC.jsx';

/*
 * Câu 24 — the running example: the same chatbot request sits between two lanes (the geometry of the
 * câu 28+ board, headers still unnamed); on "hai nhóm người dùng" the lanes open and the request is
 * placed into each of them.
 */
const N = 24;
const T = {
  glow: spokenAt(N, 'cùng một yêu cầu') - 4,
  lanes: spokenAt(N, 'hai nhóm người dùng') - 20,
  place: [spokenAt(N, 'hai nhóm người dùng'), spokenAt(N, 'hai nhóm người dùng') + 30],
};

export default function S24() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      {frame >= T.lanes ? <Lanes frame={frame} start={T.lanes} /> : null}
      {frame >= T.place[0] ? placeFlows(frame, T.place[0], T.place[1]) : null}
      <BotB hot={pulse(frame, T.glow)} />
    </Scene>
  );
}
