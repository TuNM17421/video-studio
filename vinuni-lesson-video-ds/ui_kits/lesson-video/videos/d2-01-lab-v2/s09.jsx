import React from 'react';
import { Flow, NumberBadge } from '../../../../components/index.js';
import { anchor, appear, pulse, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene, ToneLabel } from './shared.jsx';
import { GOALS, GOAL_W, GOAL_X } from './v2-pA.jsx';

/*
 * Câu 09 — the goal chain of câu 06 moves up and continues (snake) into two new goals: Tiêu chí thành
 * công, then Ứng xử khi AI sai.
 */
const N = 9;
const T = {
  lift: [0, 30],
  flow4: [spokenAt(N, 'tiêu chí thành công') - 22, spokenAt(N, 'tiêu chí thành công') - 2],
  card4: spokenAt(N, 'tiêu chí thành công') - 16,
  flow5: [spokenAt(N, 'ứng xử khi AI sai') - 22, spokenAt(N, 'ứng xử khi AI sai') - 2],
  card5: spokenAt(N, 'ứng xử khi AI sai') - 16,
};
const H0 = 170;
const H1 = 130;
const NEW = [
  { x: 1290, y: 700, w: GOAL_W, h: 150, tone: 'job', lines: ['Tiêu chí thành công', 'có thể hành động'] },
  { x: 720, y: 700, w: GOAL_W, h: 150, tone: 'problem', lines: ['Ứng xử', 'khi AI sai'] },
];

export default function S09() {
  const frame = useFrame();
  const k = smooth(frame, T.lift[0], T.lift[1]);
  const y = 480 + (360 - 480) * k;
  const h = H0 + (H1 - H0) * k;
  const boxes = GOAL_X.map((x) => ({ x, y, w: GOAL_W, h }));
  return (
    <Scene n={N} frame={frame}>
      <ToneLabel x={160} y={y - 40} tone="job">
        SAU NGÀY HỌC
      </ToneLabel>
      {boxes.map((b, i) => (
        <g key={i}>
          <RoleCard {...b} tone={i === 2 ? 'solution' : 'job'} lines={GOALS[i]} size={30} />
          <NumberBadge x={b.x + 30} y={b.y + 30} value={i + 1} />
        </g>
      ))}
      {[0, 1].map((i) => (
        <Flow key={i} points={[anchor(boxes[i], 'right'), anchor(boxes[i + 1], 'left')]} progress={1} showParticle={false} hideIn={[boxes[i], boxes[i + 1]]} />
      ))}
      {frame >= T.flow4[0] ? (
        <Flow points={[anchor(boxes[2], 'bottom'), anchor(NEW[0], 'top')]} frame={frame} start={T.flow4[0]} end={T.flow4[1]} hideIn={[boxes[2], NEW[0]]} />
      ) : null}
      {frame >= T.flow5[0] ? (
        <Flow points={[anchor(NEW[0], 'left'), anchor(NEW[1], 'right')]} frame={frame} start={T.flow5[0]} end={T.flow5[1]} hideIn={NEW} />
      ) : null}
      {NEW.map((c, i) => {
        const at = i === 0 ? T.card4 : T.card5;
        const arrive = i === 0 ? T.flow4[1] : T.flow5[1];
        return (
          <g key={`n${i}`}>
            <RoleCard {...c} size={30} opacity={appear(frame, at)} hot={pulse(frame, arrive)} />
            <NumberBadge x={c.x + 30} y={c.y + 30} value={i + 4} opacity={appear(frame, at)} />
          </g>
        );
      })}
    </Scene>
  );
}
