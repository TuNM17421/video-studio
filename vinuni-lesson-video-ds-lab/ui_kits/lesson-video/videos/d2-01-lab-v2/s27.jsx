import React from 'react';
import { SvgText } from '../../../../components/index.js';
import { C, useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';
import { BotB, Lanes, QuestionChain, placeFlows } from './v2-pC.jsx';

/* Câu 27 — silent 3 s: hold the final state of câu 26 (no narration, no captions). */
const N = 27;
// The cue title says "workflow", a term only explained at câu 30 — keep it off screen until then.
const TITLE = 'Đổi đối tượng, công việc có đổi?';
const SETTLED = 10000;

export default function S27() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame} title={TITLE}>
      <Lanes labels={[1, 1]} />
      <QuestionChain lane={0} frame={SETTLED} start={0} />
      <QuestionChain lane={1} frame={SETTLED} start={0} />
      {placeFlows(frame, -60, -30)}
      <BotB />
      <SvgText x={1085} y={950} size={22} weight={700} color={C.textMuted}>
        Công việc phía sau có còn giống nhau?
      </SvgText>
    </Scene>
  );
}
