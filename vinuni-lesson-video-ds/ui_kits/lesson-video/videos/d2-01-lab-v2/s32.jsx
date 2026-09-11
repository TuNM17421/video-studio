import React from 'react';
import { clamp01, appear, pulse, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { ChatbotBlock, Scene } from './shared.jsx';
import { Board, ChatChip, OUTLINES, Outline, chipCenter, settledLanes } from './v2-pD.jsx';

/*
 * Câu 32 (n 32) — "đừng coi chatbot là toàn bộ bài toán": a big CHATBOT AI block covers the board
 * (board dimmed behind it). On "chỉ là một khả năng" it shrinks and slides into the small chip on one
 * step of a workflow; the board comes back to full strength with the chips in place.
 */
const N = 32;
const T = {
  big: 4,
  shrink: [spokenAt(N, 'chỉ là một khả năng') - 4, spokenAt(N, 'chỉ là một khả năng') + 30],
  chip2: spokenAt(N, 'một workflow cụ thể') - 6,
};
const BIG = { x: 660, y: 470, w: 600, h: 220 };

export default function S32() {
  const frame = useFrame();
  const k = smooth(frame, T.shrink[0], T.shrink[1]);
  const target = chipCenter(0, 1);
  const cx = BIG.x + BIG.w / 2 + (target.x - (BIG.x + BIG.w / 2)) * k;
  const cy = BIG.y + BIG.h / 2 + (target.y - (BIG.y + BIG.h / 2)) * k;
  const s = 1 + (150 / BIG.w - 1) * k;
  const landed = frame >= T.shrink[1];
  const boardDim = 0.6 * (1 - k);
  return (
    <Scene n={N} frame={frame}>
      <Board frame={frame} lanes={settledLanes([boardDim, boardDim])} extras={{ upsell: 1, upsellMuted: boardDim, gate: { o: 1, state: 'open', muted: boardDim }, esc: { o: 1, muted: boardDim } }} />
      {OUTLINES.map((b, l) => (
        <Outline key={l} box={b} draw={1} label="WORKFLOW · chuỗi bước xử lý" labelO={1 - boardDim} />
      ))}
      {!landed ? (
        <g transform={`translate(${cx} ${cy}) scale(${s}) translate(${-(BIG.x + BIG.w / 2)} ${-(BIG.y + BIG.h / 2)})`} opacity={clamp01(appear(frame, T.big) * (1 - 0.3 * k))}>
          <ChatbotBlock {...BIG} sub="toàn bộ bài toán?" />
        </g>
      ) : null}
      <ChatChip l={0} i={1} opacity={landed ? 1 : 0} hot={pulse(frame, T.shrink[1])} />
      <ChatChip l={1} i={3} opacity={appear(frame, Math.max(T.chip2, T.shrink[1]))} />
    </Scene>
  );
}
