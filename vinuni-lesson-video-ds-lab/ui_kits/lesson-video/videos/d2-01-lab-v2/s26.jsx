import React from 'react';
import { SvgText } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene } from './shared.jsx';
import { BotB, Lanes, QuestionChain, placeFlows } from './v2-pC.jsx';

/*
 * Câu 26 — predict first: behind each group, the chain of work is drawn as "?" nodes linked by dashed
 * arrows (same slots as the steps of câu 28) — nothing says the two chains are the same.
 */
const N = 26;
// The cue title says "workflow", a term only explained at câu 30 — keep it off screen until then.
const TITLE = 'Đổi đối tượng, công việc có đổi?';
const T = {
  chain: [spokenAt(N, 'công việc phía sau') - 20, spokenAt(N, 'công việc phía sau') - 6],
  note: spokenAt(N, 'còn giống nhau') - 4,
};

export default function S26() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame} title={TITLE}>
      <Lanes labels={[1, 1]} />
      <QuestionChain lane={0} frame={frame} start={T.chain[0]} />
      <QuestionChain lane={1} frame={frame} start={T.chain[1]} />
      {placeFlows(frame, -60, -30)}
      <BotB />
      <SvgText x={1085} y={950} size={22} weight={700} color={C.textMuted} opacity={appear(frame, T.note)}>
        Công việc phía sau có còn giống nhau?
      </SvgText>
    </Scene>
  );
}
