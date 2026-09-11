import React from 'react';
import { appear, pulse, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene } from './shared.jsx';
import { BotA, BranchColumn, QuestionChips, RequestPill, SameNameLabel, branchFlows } from './v2-pC.jsx';

/*
 * Câu 23 — answer these three first: the question chips light in turn under BOTH branches, while the
 * chatbot and the branch contents (the technology layer) recede to the background.
 */
const N = 23;
const SAY = [spokenAt(N, 'ai sẽ dùng'), spokenAt(N, 'họ đang vướng'), spokenAt(N, 'chatbot cần tham gia')];
const T = {
  recede: [spokenAt(N, 'ba câu hỏi đó') - 20, spokenAt(N, 'ba câu hỏi đó') + 10],
  chips: SAY.map((t) => t - 6),
};
const ALL = { steps: 1, metric: 1, risk: 1 };

export default function S23() {
  const frame = useFrame();
  const back = smooth(frame, T.recede[0], T.recede[1]);
  const show = T.chips.map((t) => appear(frame, t));
  const hot = T.chips.map((t) => pulse(frame, t + 4));
  return (
    <Scene n={N} frame={frame}>
      <RequestPill muted={back} />
      {[0, 1].map((ci) => (
        <BranchColumn key={ci} ci={ci} reveal={ALL} muted={back} />
      ))}
      <g opacity={1 - back * 0.64 < 1 ? 1 - back * 0.64 : undefined}>{branchFlows(frame, -60, -30)}</g>
      <BotA muted={back} />
      <SameNameLabel opacity={1 - back * 0.64} />
      {[0, 1].map((ci) => (
        <QuestionChips key={ci} ci={ci} show={show} hot={hot} />
      ))}
    </Scene>
  );
}
