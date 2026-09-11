import React from 'react';
import { appear, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Board } from './p6-shared.jsx';
import { Scene } from './shared.jsx';

/*
 * Câu 41 — check question. The proposal (a tool that picks its own handling and sends email) appears
 * in the purple ĐỀ NGHỊ zone, travels to the decision gate (pending), and the four questions the team
 * cannot yet answer appear as empty dashed slots. Nothing is answered here.
 */
const N = 41;
const T = {
  tool: 4,
  flow: [spokenAt(N, 'gửi thư điện tử') - 4, spokenAt(N, 'còn thiếu') + 6],
  head: spokenAt(N, 'còn thiếu') - 6,
  slots: spokenAt(N, 'thông tin gì') - 6,
  gate: spokenAt(N, 'để quyết định') - 8,
};

export default function S41() {
  const frame = useFrame();
  const at = T.flow[1];
  return (
    <Scene n={N} frame={frame}>
      <Board
        frame={frame}
        toolIn={appear(frame, T.tool)}
        gateIn={appear(frame, Math.min(T.gate, at - 20))}
        gateAt={at}
        flow={T.flow}
        headIn={appear(frame, T.head)}
        slotsIn={[0, 1, 2, 3].map((i) => appear(frame, T.slots + i * 8))}
      />
    </Scene>
  );
}
