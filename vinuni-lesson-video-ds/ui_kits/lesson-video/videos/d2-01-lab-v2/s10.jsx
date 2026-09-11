import React from 'react';
import { Flow, SvgText } from '../../../../components/index.js';
import { C, anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';

/*
 * Câu 10 — naming a solution is not the goal: the named solution (purple) is joined to the two things
 * it must make clear — what it has to achieve, and how it is judged when the result is wrong (amber:
 * open questions until answered).
 */
const N = 10;
const T = {
  sol: spokenAt(N, 'gọi tên một giải pháp') - 8,
  notEnough: spokenAt(N, 'mà là làm rõ') - 4,
  q1: spokenAt(N, 'cần đạt điều gì') - 20,
  q1Flow: [spokenAt(N, 'cần đạt điều gì') - 14, spokenAt(N, 'cần đạt điều gì') + 8],
  q2: spokenAt(N, 'cần được nhìn nhận') - 20,
  q2Flow: [spokenAt(N, 'cần được nhìn nhận') - 14, spokenAt(N, 'cần được nhìn nhận') + 8],
};
const sol = { x: 200, y: 520, w: 480, h: 170 };
const q1 = { x: 1060, y: 360, w: 680, h: 160 };
const q2 = { x: 1060, y: 690, w: 680, h: 160 };
const JX = 870;

export default function S10() {
  const frame = useFrame();
  const out = anchor(sol, 'right');
  const i1 = anchor(q1, 'left');
  const i2 = anchor(q2, 'left');
  return (
    <Scene n={N} frame={frame}>
      <RoleCard {...sol} tone="solution" label="GIẢI PHÁP" lines={['Một giải pháp', 'đã được gọi tên']} size={28} opacity={appear(frame, T.sol)} />
      <SvgText x={sol.x + sol.w / 2} y={sol.y + sol.h + 52} size={22} weight={600} color={C.textMuted} opacity={appear(frame, T.notEnough)}>
        Gọi tên thôi chưa đủ
      </SvgText>
      <Flow points={[out, { x: JX, y: out.y }, { x: JX, y: i1.y }, i1]} frame={frame} start={T.q1Flow[0]} end={T.q1Flow[1]} hideIn={[sol, q1]} />
      <Flow points={[out, { x: JX, y: out.y }, { x: JX, y: i2.y }, i2]} frame={frame} start={T.q2Flow[0]} end={T.q2Flow[1]} hideIn={[sol, q2]} />
      <RoleCard {...q1} tone="unknown" label="CÂU HỎI 1" lines={['Cần đạt điều gì?']} size={30} opacity={appear(frame, T.q1)} hot={pulse(frame, T.q1Flow[1])} />
      <RoleCard {...q2} tone="unknown" label="CÂU HỎI 2" lines={['Nhìn nhận ra sao', 'khi kết quả không đúng?']} size={30} opacity={appear(frame, T.q2)} hot={pulse(frame, T.q2Flow[1])} />
    </Scene>
  );
}
