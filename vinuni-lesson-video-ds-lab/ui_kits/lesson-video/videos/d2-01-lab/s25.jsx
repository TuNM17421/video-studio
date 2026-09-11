import React from 'react';
import { Flow } from '../../../../components/index.js';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { ProblemSlots, Scene } from './shared.jsx';
import { AnnexLan, BeforeArrow, BeforeCard, ColumnHeads, LAN_AT, SLOT_BOX, SLOTS, slotBottom } from './p4-shared.jsx';

/* Câu 25 — slot 1 is written: Lan (học viên mới) sends her role up into the NGƯỜI DÙNG slot. */
const N = 25;
const T = {
  lan: spokenAt(N, 'người đang gặp') - 8,
  flow: [spokenAt(N, 'học viên mới') - 16, spokenAt(N, 'học viên mới') + 6],
};

export default function S25() {
  const frame = useFrame();
  const arrive = T.flow[1];
  const top = { x: LAN_AT.x, y: LAN_AT.y - LAN_AT.r - 12 };
  return (
    <Scene n={N} frame={frame}>
      <ColumnHeads />
      <BeforeCard muted={0.5} />
      <BeforeArrow />
      <ProblemSlots box={SLOT_BOX} fill={[appear(frame, arrive - 4), 0, 0]} hot={[pulse(frame, arrive), 0, 0]} />
      <AnnexLan opacity={appear(frame, T.lan)} />
      {frame >= T.flow[0] ? (
        <Flow points={[top, slotBottom(0)]} frame={frame} start={T.flow[0]} end={T.flow[1]} hideIn={[SLOTS[0]]} />
      ) : null}
    </Scene>
  );
}
