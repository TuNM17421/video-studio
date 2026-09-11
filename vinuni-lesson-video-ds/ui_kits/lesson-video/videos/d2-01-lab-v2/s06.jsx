import React from 'react';
import { Flow, NumberBadge } from '../../../../components/index.js';
import { anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene, ToneLabel } from './shared.jsx';
import { GOALS, GOAL_W, GOAL_X } from './v2-pA.jsx';

/* Câu 06 — the day's first goals, in order: phân biệt → đặt câu hỏi làm rõ → rồi mới đề xuất công nghệ. */
const N = 6;
const SAY = [spokenAt(N, 'phân biệt'), spokenAt(N, 'đặt câu hỏi'), spokenAt(N, 'đề xuất công nghệ')];
const T = { label: 10, cards: SAY.map((t) => t - 8), flows: [[SAY[1] - 16, SAY[1] + 2], [SAY[2] - 16, SAY[2] + 2]] };
const Y = 480;
const H = 170;
const boxes = GOAL_X.map((x) => ({ x, y: Y, w: GOAL_W, h: H }));

export default function S06() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <ToneLabel x={160} y={440} tone="job" opacity={appear(frame, T.label)}>
        SAU NGÀY HỌC
      </ToneLabel>
      {boxes.map((b, i) => (
        <g key={i}>
          <RoleCard {...b} tone={i === 2 ? 'solution' : 'job'} lines={GOALS[i]} size={30} opacity={appear(frame, T.cards[i])} hot={pulse(frame, i === 0 ? T.cards[0] + 8 : T.flows[i - 1][1])} />
          <NumberBadge x={b.x + 30} y={b.y + 30} value={i + 1} opacity={appear(frame, T.cards[i])} />
        </g>
      ))}
      {T.flows.map(([s, e], i) => (
        <Flow key={i} points={[anchor(boxes[i], 'right'), anchor(boxes[i + 1], 'left')]} frame={frame} start={s} end={e} hideIn={[boxes[i], boxes[i + 1]]} />
      ))}
    </Scene>
  );
}
