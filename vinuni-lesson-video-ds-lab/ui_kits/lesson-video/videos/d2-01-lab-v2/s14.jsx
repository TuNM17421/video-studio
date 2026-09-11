import React from 'react';
import { Flow, SvgText } from '../../../../components/index.js';
import { C, anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';

/*
 * Câu 14 — four guiding questions around the day: a center hub "NGÀY 2" and one card per question,
 * each appearing (and receiving a particle from the hub) as it is read. Amber = still open.
 */
const N = 14;
const Q = [
  { say: 'bài toán có thật sự cần AI', lines: ['Bài toán có', 'thật sự cần AI?'] },
  { say: 'giải pháp nên ở cấp độ nào', lines: ['Giải pháp nên', 'ở cấp độ nào?'] },
  { say: 'bản mô tả bài toán đã đủ rõ', lines: ['Bản mô tả bài toán', 'đã đủ rõ chưa?'] },
  { say: 'khi nào nên quyết định', lines: ['Khi nào nên quyết định', 'triển khai?'] },
];
const HUB = { x: 960, y: 620, r: 92 };
const W = 560;
const H = 170;
const boxes = [
  { x: 150, y: 320, w: W, h: H },
  { x: 1210, y: 320, w: W, h: H },
  { x: 150, y: 760, w: W, h: H },
  { x: 1210, y: 760, w: W, h: H },
];
const SAY = Q.map((q) => spokenAt(N, q.say));
const T = { hub: spokenAt(N, 'Bốn câu hỏi') - 6, card: SAY.map((t) => t - 20), flow: SAY.map((t) => [t - 14, t + 8]) };
const hubBox = { x: HUB.x - HUB.r, y: HUB.y - HUB.r, w: 2 * HUB.r, h: 2 * HUB.r };

export default function S14() {
  const frame = useFrame();
  const oh = appear(frame, T.hub);
  return (
    <Scene n={N} frame={frame}>
      {boxes.map((b, i) => {
        const left = i % 2 === 0;
        const end = anchor(b, left ? 'right' : 'left');
        const start = { x: HUB.x + (left ? -1 : 1) * HUB.r * 0.72, y: HUB.y + (i < 2 ? -1 : 1) * HUB.r * 0.7 };
        return <Flow key={i} points={[start, { x: start.x + (left ? -60 : 60), y: end.y }, end]} frame={frame} start={T.flow[i][0]} end={T.flow[i][1]} hideIn={[hubBox, b]} />;
      })}
      {oh > 0.001 ? (
        <g opacity={oh < 1 ? oh : undefined}>
          <circle cx={HUB.x} cy={HUB.y} r={HUB.r} fill={C.bgAlt} stroke={C.accentStrong} strokeWidth={4} />
          <SvgText x={HUB.x} y={HUB.y - 4} size={30} weight={700} color={C.accentStrong}>
            NGÀY 2
          </SvgText>
          <SvgText x={HUB.x} y={HUB.y + 30} size={18} weight={600} color={C.textMuted}>
            4 câu hỏi
          </SvgText>
        </g>
      ) : null}
      {Q.map((q, i) => (
        <RoleCard key={i} {...boxes[i]} tone="unknown" label={`CÂU HỎI ${i + 1}`} lines={q.lines} size={28} opacity={appear(frame, T.card[i])} hot={pulse(frame, T.flow[i][1])} />
      ))}
    </Scene>
  );
}
