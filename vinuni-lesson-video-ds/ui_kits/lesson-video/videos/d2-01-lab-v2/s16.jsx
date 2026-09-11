import React from 'react';
import { Flow, SvgText } from '../../../../components/index.js';
import { C, anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';

/*
 * Câu 16 — the approach in four stages, lit in the spoken order: bài toán → làm rõ → công nghệ →
 * quyết định. Technology is third on purpose.
 */
const N = 16;
const STAGES = [
  { say: 'nhìn bài toán trước', lines: ['Bài toán'], tone: 'neutral', note: 'nhìn trước' },
  { say: 'làm rõ trước', lines: ['Làm rõ'], tone: 'unknown', note: 'làm rõ trước' },
  { say: 'công nghệ', lines: ['Công nghệ'], tone: 'solution', note: 'rồi mới nói đến' },
  { say: 'quyết định', lines: ['Quyết định'], tone: 'job', note: '' },
];
const XS = [130, 560, 990, 1420];
const boxes = XS.map((x) => ({ x, y: 500, w: 370, h: 170 }));
const SAY = STAGES.map((s) => spokenAt(N, s.say));
const T = { card: SAY.map((t, i) => (i === 0 ? t - 8 : t - 24)), flow: SAY.map((t) => [t - 20, t - 2]) };

export default function S16() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      {boxes.slice(1).map((b, i) => (
        <Flow key={i} points={[anchor(boxes[i], 'right'), anchor(b, 'left')]} frame={frame} start={T.flow[i + 1][0]} end={T.flow[i + 1][1]} hideIn={[boxes[i], b]} />
      ))}
      {STAGES.map((s, i) => (
        <g key={i}>
          <RoleCard {...boxes[i]} tone={s.tone} label={`BƯỚC ${i + 1}`} lines={s.lines} size={34} opacity={appear(frame, T.card[i])} hot={i === 0 ? pulse(frame, SAY[0]) : pulse(frame, T.flow[i][1])} />
          {s.note ? (
            <SvgText x={boxes[i].x + boxes[i].w / 2} y={boxes[i].y + boxes[i].h + 48} size={22} weight={600} color={C.textMuted} opacity={appear(frame, T.card[i] + 6)}>
              {s.note}
            </SvgText>
          ) : null}
        </g>
      ))}
    </Scene>
  );
}
