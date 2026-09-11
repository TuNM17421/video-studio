import React from 'react';
import { appear, linearProgress, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene } from './shared.jsx';
import { Board, ChatChip, OUTLINES, Outline, settledLanes } from './v2-pD.jsx';

/*
 * Câu 30 (n 30) — the finished board. At the word "workflow" its label pill appears; on "chuỗi các
 * bước" a dashed outline draws around each lane's chain of steps; on "chatbot sẽ đứng ở đâu" a small
 * chatbot chip lands on one step of each chain (answering in lane 0, the draft reply in lane 1).
 */
const N = 30;
const T = {
  label: spokenAt(N, 'workflow') - 2,
  draw: [spokenAt(N, 'chuỗi các bước') - 6, spokenAt(N, 'chuỗi các bước') + 44],
  chip: [spokenAt(N, 'chatbot sẽ đứng') - 6, spokenAt(N, 'chatbot sẽ đứng') + 10],
};

export default function S30() {
  const frame = useFrame();
  const draw = linearProgress(frame, T.draw[0], T.draw[1]);
  const lo = appear(frame, T.label);
  return (
    <Scene n={N} frame={frame}>
      <Board frame={frame} lanes={settledLanes()} extras={{ upsell: 1, gate: { o: 1, state: 'open' }, esc: { o: 1 } }} />
      {OUTLINES.map((b, l) => (
        <Outline key={l} box={b} draw={draw} label="WORKFLOW · chuỗi bước xử lý" labelO={lo} />
      ))}
      <ChatChip l={0} i={1} opacity={appear(frame, T.chip[0])} hot={pulse(frame, T.chip[0] + 4)} />
      <ChatChip l={1} i={3} opacity={appear(frame, T.chip[1])} hot={pulse(frame, T.chip[1] + 4)} />
    </Scene>
  );
}
