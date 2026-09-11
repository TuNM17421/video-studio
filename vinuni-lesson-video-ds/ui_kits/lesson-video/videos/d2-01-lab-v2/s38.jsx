import React from 'react';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene } from './shared.jsx';
import { Chain, HumanChip, Situation3, ZoneFrame, slot } from './v2-pE.jsx';

/*
 * Câu 38 — what changes between the situations, lit in the order spoken: the work steps (accent),
 * the automated steps (purple chatbot chips), and where a person steps in (green: approval of the
 * internal draft reply — câu 29 — and the support person of situation 3). Situation 1 has no human
 * marker: the narration names none there.
 */
const N = 38;
const T = {
  undim: 0,
  work: spokenAt(N, 'công việc cần xử lý') - 4,
  auto: spokenAt(N, 'bước nào được tự động') - 4,
  human: spokenAt(N, 'con người phải tham gia') - 6,
};
const draft = slot(1, 2);
const approve = { x: draft.x + 50, y: draft.y + draft.h + 30, w: draft.w - 100 };

export default function S38() {
  const frame = useFrame();
  const dim = 1 - appear(frame, T.undim, 20);
  const work = pulse(frame, T.work);
  const auto = pulse(frame, T.auto);
  return (
    <Scene n={N} frame={frame}>
      <ZoneFrame z={0} title={1} />
      <ZoneFrame z={1} title={1} />
      <ZoneFrame z={2} title={1} muted={dim * 0.6} />
      <Chain z={0} hot={[work, auto, work]} />
      <Chain z={1} hot={[work, auto, work]} />
      <Situation3 muted={dim * 0.6} hot={{ card: work, human: pulse(frame, T.human + 4) }} />
      <HumanChip {...approve} label="Con người phê duyệt" opacity={appear(frame, T.human)} hot={pulse(frame, T.human)} />
    </Scene>
  );
}
