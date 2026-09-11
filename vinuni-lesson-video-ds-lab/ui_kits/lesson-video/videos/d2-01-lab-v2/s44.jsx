import React from 'react';
import { Check } from '../../../../components/index.js';
import { ROLE, appear, interpolate, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt, speechEnd } from './cues.js';
import { ChatbotBlock, Scene, ToneLabel } from './shared.jsx';
import { PAIN_BOX, PAIN_STEP, PainLayer } from './s43.jsx';
import { WorkflowBoard } from './v2-pF.jsx';
import { ToneChip } from './v2-pF.jsx';

/*
 * Câu 44 — the pain zone of câu 43 holds. The chatbot stands OUTSIDE the board (dashed, "chưa có căn
 * cứ"); only once the pain point is marked clarified (green check, end of the sentence) does it move
 * into the workflow and dock under the stuck step.
 */
const N = 44;
const T = {
  bot: 6,
  basis: spokenAt(N, 'chưa có căn cứ') - 6,
  clear: spokenAt(N, 'đúng việc') - 4,
  move: [speechEnd(N) - 20, speechEnd(N) + 16],
};
const OUT = { x: 1440, y: 262, w: 360, h: 100 };
const DOCK = { x: PAIN_STEP.x + 10, y: PAIN_STEP.y + PAIN_STEP.h + 8, w: 330, h: 66 };

export default function S44() {
  const frame = useFrame();
  const m = smooth(frame, T.move[0], T.move[1]);
  const box = {
    x: interpolate(m, [0, 1], [OUT.x, DOCK.x]),
    y: interpolate(m, [0, 1], [OUT.y, DOCK.y]),
    w: interpolate(m, [0, 1], [OUT.w, DOCK.w]),
    h: interpolate(m, [0, 1], [OUT.h, DOCK.h]),
  };
  const cleared = appear(frame, T.clear);
  return (
    <Scene n={N} frame={frame}>
      <WorkflowBoard under={<PainLayer frame={frame} />} />
      <g opacity={cleared < 1 ? cleared : undefined}>
        <circle cx={PAIN_BOX.x + PAIN_BOX.w + 20} cy={PAIN_BOX.y + 8} r={24} fill={ROLE.greenSoft} stroke={ROLE.green} strokeWidth={3} />
        <Check x={PAIN_BOX.x + PAIN_BOX.w + 20} y={PAIN_BOX.y + 8} size={26} color={ROLE.green} strokeWidth={5} opacity={cleared} />
      </g>
      <ToneLabel x={PAIN_BOX.x + PAIN_BOX.w + 54} y={PAIN_BOX.y + 12} tone="job" opacity={cleared}>
        ĐÃ LÀM RÕ
      </ToneLabel>
      <ToneChip x={OUT.x - 250} y={OUT.y + 32} w={220} tone="unknown" label="chưa có căn cứ" opacity={appear(frame, T.basis) * (1 - m)} />
      <ChatbotBlock {...box} dashed={m < 0.99} opacity={appear(frame, T.bot)} label="CHATBOT AI" />
    </Scene>
  );
}
