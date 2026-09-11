import React from 'react';
import { appear, pulse, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Board } from './p6-shared.jsx';
import { Scene } from './shared.jsx';

/*
 * Câu 43 — the same board: the first three questions are filled with what the team must know, each as
 * it is spoken; the proposal zone is renamed GIẢI PHÁP · CHƯA CHỌN (still not chosen).
 */
const N = 43;
const T = {
  rename: [6, 30],
  fill: [spokenAt(N, 'ai gặp vấn đề') - 6, spokenAt(N, 'khó khăn ở bước nào') - 6, spokenAt(N, 'có bằng chứng gì') - 6],
};

export default function S43() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <Board
        frame={frame}
        zoneLabel="ĐỀ NGHỊ"
        zoneLabel2="GIẢI PHÁP · CHƯA CHỌN"
        zoneMix={smooth(frame, T.rename[0], T.rename[1])}
        fills={[...T.fill.map((t) => appear(frame, t)), 0]}
        hots={[...T.fill.map((t) => pulse(frame, t + 4)), 0]}
      />
    </Scene>
  );
}
