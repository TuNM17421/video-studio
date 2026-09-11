import React from 'react';
import { appear, fade, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { ProblemSlots, RoleCard, Scene } from './shared.jsx';
import { AnnexImpact, AnnexLan, AnnexPages, BeforeArrow, BeforeCard, ColumnHeads, SLOT_BOX, Sentence } from './p4-shared.jsx';

/*
 * Câu 28 — the narration reads the finished problem sentence. The annex clears; the sentence is written
 * out in full and its three chunks light as they are spoken, each with the slot it came from.
 */
const N = 28;
const T = {
  annexOut: 0,
  card: 10,
  lit: [spokenAt(N, 'Học viên mới') + 2, spokenAt(N, 'khó tìm') - 2, spokenAt(N, 'nên phải chờ') - 2],
};
const BOX = { x: 110, y: 670, w: 1710, h: 250 };

export default function S28() {
  const frame = useFrame();
  const annex = 1 - fade(frame, T.annexOut, 14);
  const lit = T.lit.map((t) => appear(frame, t, 18));
  return (
    <Scene n={N} frame={frame}>
      <ColumnHeads />
      <BeforeCard muted={0.5} />
      <BeforeArrow />
      <ProblemSlots box={SLOT_BOX} fill={[1, 1, 1]} hot={T.lit.map((t) => pulse(frame, t))} />
      {annex > 0.001 ? (
        <g opacity={annex * 0.55}>
          <AnnexLan />
          <AnnexPages />
          <AnnexImpact sweep={0.65} />
        </g>
      ) : null}
      <RoleCard {...BOX} tone="neutral" label="CÂU VẤN ĐỀ · MINH HỌA" opacity={appear(frame, T.card)} />
      <Sentence cx={BOX.x + BOX.w / 2} y={BOX.y + 118} size={38} lineH={66} lit={lit} opacity={appear(frame, T.card)} />
    </Scene>
  );
}
