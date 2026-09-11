import React from 'react';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { STEPS, Scene } from './shared.jsx';
import { Board } from './v2-pD.jsx';

/*
 * Câu 29 (n 29) — same board. Lane 0 stays (dimmed); lane 1 (internal staff) builds: support request →
 * classification → business lookup → draft reply, then the draft waits at the approval gate (amber
 * pending → green open once a person approves), then the orange escalation branch from classification
 * to "Nhân sự hỗ trợ" for complex / high-risk questions.
 */
const N = 29;
const SAY = [
  spokenAt(N, 'một yêu cầu hỗ trợ'),
  spokenAt(N, 'phân loại yêu cầu'),
  spokenAt(N, 'tra cứu thông tin'),
  spokenAt(N, 'đề xuất nháp'),
];
const T = {
  steps: SAY.map((t) => t - 8),
  links: SAY.slice(1).map((t) => ({ start: t - 10, end: t + 6 })),
  gate: spokenAt(N, 'con người phê duyệt') - 8,
  approve: spokenAt(N, 'con người phê duyệt') + 30,
  escFlow: [spokenAt(N, 'chuyển câu hỏi') - 4, spokenAt(N, 'cho nhân sự hỗ trợ') + 4],
};

export default function S29() {
  const frame = useFrame();
  const lane0 = { muted: 0.55, steps: STEPS[0].map(() => ({ o: 1 })), links: [1, 1, 1] };
  const lane1 = {
    steps: T.steps.map((t, i) => ({ o: appear(frame, t), hot: i === 0 ? 0 : pulse(frame, T.links[i - 1].end) })),
    links: T.links.map((lk) => (frame >= lk.start ? lk : undefined)),
  };
  return (
    <Scene n={N} frame={frame}>
      <Board
        frame={frame}
        lanes={[lane0, lane1]}
        extras={{
          upsell: 1,
          upsellMuted: 0.55,
          gate: { o: appear(frame, T.gate), state: frame >= T.approve ? 'open' : 'pending', at: T.approve },
          esc: frame >= T.escFlow[0] ? { o: 1, flow: T.escFlow, card: appear(frame, T.escFlow[1] - 20), hot: pulse(frame, T.escFlow[1]) } : null,
        }}
      />
    </Scene>
  );
}
