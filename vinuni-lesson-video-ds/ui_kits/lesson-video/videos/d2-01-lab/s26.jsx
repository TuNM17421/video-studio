import React from 'react';
import { Flow } from '../../../../components/index.js';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { ProblemSlots, Scene } from './shared.jsx';
import { AnnexLan, AnnexPages, BeforeArrow, BeforeCard, ColumnHeads, LAN_AT, PAGES, PAGE_W, SLOT_BOX, SLOTS, slotBottom } from './p4-shared.jsx';

/*
 * Câu 26 — slot 2 (khó khăn · lúc nào) is written, then linked down to the three scattered pages the
 * guidance is split across (the situation of câu 04).
 */
const N = 26;
const say = spokenAt(N, 'khó tìm');
const T = {
  fill: say - 4,
  pages: [say + 8, say + 16, say + 24],
  flows: [0, 1, 2].map((i) => [spokenAt(N, 'khi chuẩn bị') - 10 + i * 8, spokenAt(N, 'khi chuẩn bị') + 16 + i * 8]),
};

export default function S26() {
  const frame = useFrame();
  const from = slotBottom(1);
  return (
    <Scene n={N} frame={frame}>
      <ColumnHeads />
      <BeforeCard muted={0.5} />
      <BeforeArrow />
      <ProblemSlots box={SLOT_BOX} fill={[1, appear(frame, T.fill), 0]} hot={[0, pulse(frame, T.fill + 4), 0]} />
      <AnnexLan opacity={1} />
      <Flow points={[{ x: LAN_AT.x, y: LAN_AT.y - LAN_AT.r - 12 }, slotBottom(0)]} progress={1} showParticle={false} opacity={0.5} />
      <AnnexPages show={T.pages.map((t) => appear(frame, t))} />
      {PAGES.map((p, i) =>
        frame >= T.flows[i][0] ? (
          <Flow
            key={p.label}
            points={[{ x: from.x - 60 + i * 60, y: from.y + 12 }, { x: p.x + PAGE_W / 2, y: p.y - 10 }]}
            frame={frame}
            start={T.flows[i][0]}
            end={T.flows[i][1]}
            strokeWidth={4}
            hideIn={[SLOTS[1]]}
          />
        ) : null,
      )}
    </Scene>
  );
}
