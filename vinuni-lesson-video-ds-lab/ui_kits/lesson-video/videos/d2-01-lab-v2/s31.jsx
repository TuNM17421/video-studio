import React from 'react';
import { pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { STEPS, Scene } from './shared.jsx';
import { Board, ChatChip, OUTLINES, Outline } from './v2-pD.jsx';

/*
 * Câu 31 (n 31) — the two workflows side by side. As each is named, its focus steps pulse in their own
 * tone: lane 0 answering + purchase advice; lane 1 support request, lookup, drafting and forwarding
 * (the escalation card). Steps that are not named are dimmed while their lane is in focus.
 */
const N = 31;
const T = {
  ext: spokenAt(N, 'giải đáp'),
  buy: spokenAt(N, 'hỗ trợ mua hàng'),
  req: spokenAt(N, 'yêu cầu hỗ trợ'),
  look: spokenAt(N, 'tra cứu'),
  draft: spokenAt(N, 'soạn nháp'),
  fwd: spokenAt(N, 'chuyển tiếp'),
};
const FOCUS = [
  [null, T.ext, T.buy, null],
  [T.req, null, T.look, T.draft],
];

export default function S31() {
  const frame = useFrame();
  const inFocus = (l) => (l === 0 ? frame >= T.ext - 10 : frame >= T.req - 10);
  const lanes = [0, 1].map((l) => ({
    links: [1, 1, 1],
    steps: STEPS[l].map((_, i) => {
      const t = FOCUS[l][i];
      return { o: 1, hot: t == null ? 0 : pulse(frame, t), muted: inFocus(l) && t == null ? 0.5 : 0 };
    }),
  }));
  return (
    <Scene n={N} frame={frame}>
      <Board
        frame={frame}
        lanes={lanes}
        extras={{ upsell: 1, upsellMuted: inFocus(0) ? 0.5 : 0, gate: { o: 1, state: 'open' }, esc: { o: 1, hot: pulse(frame, T.fwd) } }}
      />
      {OUTLINES.map((b, l) => (
        <Outline key={l} box={b} draw={1} label="WORKFLOW · chuỗi bước xử lý" labelO={1} />
      ))}
      <ChatChip l={0} i={1} />
      <ChatChip l={1} i={3} />
    </Scene>
  );
}
