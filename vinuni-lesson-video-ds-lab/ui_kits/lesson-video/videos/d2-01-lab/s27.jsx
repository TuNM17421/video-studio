import React from 'react';
import { Flow } from '../../../../components/index.js';
import { appear, linearProgress, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { ProblemSlots, Scene } from './shared.jsx';
import { AnnexImpact, AnnexLan, AnnexPages, BeforeArrow, BeforeCard, ColumnHeads, LAN_AT, PAGES, PAGE_W, SLOT_BOX, slotBottom } from './p4-shared.jsx';

/* Câu 27 — slot 3 (hậu quả): a stopwatch keeps running (chờ hỗ trợ) and two "hỏi lại" bubbles appear. */
const N = 27;
const T = {
  fill: spokenAt(N, 'hậu quả') - 4,
  watch: spokenAt(N, 'phải chờ') - 6,
  asks: [spokenAt(N, 'hỏi lại') - 4, spokenAt(N, 'nhiều lần') - 2],
};

export default function S27() {
  const frame = useFrame();
  const from1 = slotBottom(1);
  return (
    <Scene n={N} frame={frame}>
      <ColumnHeads />
      <BeforeCard muted={0.5} />
      <BeforeArrow />
      <ProblemSlots box={SLOT_BOX} fill={[1, 1, appear(frame, T.fill)]} hot={[0, 0, pulse(frame, T.fill + 4)]} />
      <g opacity={0.55}>
        <AnnexLan />
        <Flow points={[{ x: LAN_AT.x, y: LAN_AT.y - LAN_AT.r - 12 }, slotBottom(0)]} progress={1} showParticle={false} />
        <AnnexPages />
        {PAGES.map((p, i) => (
          <Flow key={p.label} points={[{ x: from1.x - 60 + i * 60, y: from1.y + 12 }, { x: p.x + PAGE_W / 2, y: p.y - 10 }]} progress={1} showParticle={false} strokeWidth={4} />
        ))}
      </g>
      <AnnexImpact
        watch={appear(frame, T.watch)}
        sweep={0.05 + 0.6 * linearProgress(frame, T.watch, T.watch + 90)}
        asks={T.asks.map((t) => appear(frame, t))}
      />
    </Scene>
  );
}
