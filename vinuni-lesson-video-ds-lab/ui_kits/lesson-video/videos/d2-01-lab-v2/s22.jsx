import React from 'react';
import { appear, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene } from './shared.jsx';
import { BotA, BranchColumn, RequestPill, SameNameLabel, branchFlows } from './v2-pC.jsx';

/*
 * Câu 22 — one name, different problems: the chatbot sends a flow into two branches. Each branch fills
 * its own chain of steps, measures and risks as they are named — same three zones, different order and
 * shape (abstract glyphs, no content).
 */
const N = 22;
const T = {
  cols: spokenAt(N, 'cùng một cái tên') - 14,
  flows: [spokenAt(N, 'cùng một cái tên') - 6, spokenAt(N, 'có thể dẫn tới') + 4],
  steps: spokenAt(N, 'quy trình') - 6,
  metric: spokenAt(N, 'chỉ số') - 6,
  risk: spokenAt(N, 'rủi ro') - 6,
  label: spokenAt(N, 'rất khác nhau') - 4,
};

export default function S22() {
  const frame = useFrame();
  const reveal = { steps: appear(frame, T.steps), metric: appear(frame, T.metric), risk: appear(frame, T.risk) };
  return (
    <Scene n={N} frame={frame}>
      <RequestPill />
      {[0, 1].map((ci) => (
        <BranchColumn key={ci} ci={ci} frameOpacity={appear(frame, T.cols)} reveal={reveal} />
      ))}
      {branchFlows(frame, T.flows[0], T.flows[1])}
      <BotA />
      <SameNameLabel opacity={appear(frame, T.label)} />
    </Scene>
  );
}
