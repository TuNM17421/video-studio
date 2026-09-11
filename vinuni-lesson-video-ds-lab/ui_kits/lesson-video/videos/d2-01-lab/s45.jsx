import React from 'react';
import { appear, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Board } from './p6-shared.jsx';
import { Scene } from './shared.jsx';

/*
 * Câu 45 — the verdict. A red "?" marks the solution name (it tells none of those things); the question
 * set moves in front of the proposal; the gate closes: CHƯA ĐỦ CƠ SỞ.
 */
const N = 45;
const T = {
  qmark: spokenAt(N, 'Tên giải pháp') + 2,
  swap: [spokenAt(N, 'những điều đó') - 4, spokenAt(N, 'những điều đó') + 40],
  block: spokenAt(N, 'chưa đủ cơ sở') - 4,
};

export default function S45() {
  const frame = useFrame();
  const blocked = frame >= T.block;
  return (
    <Scene n={N} frame={frame}>
      <Board
        frame={frame}
        zoneLabel="GIẢI PHÁP · CHƯA CHỌN"
        fills={[1, 1, 1, 1]}
        conseqIn={1}
        emailIn={[1, 1, 1]}
        qmark={appear(frame, T.qmark)}
        qmarkAt={T.qmark}
        swap={smooth(frame, T.swap[0], T.swap[1])}
        gateState={blocked ? 'blocked' : 'pending'}
        gateLabel={blocked ? 'CHƯA ĐỦ CƠ SỞ' : 'QUYẾT ĐỊNH XÂY?'}
        gateAt={T.block}
      />
    </Scene>
  );
}
