import React from 'react';
import { Flow, SvgText } from '../../../../components/index.js';
import { C, ROLE, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { ProblemSlots, RoleCard, Scene, ToneLabel, problemSlotBoxes } from './shared.jsx';

/*
 * Câu 35 — the finished problem sentence stays on top; under its KHÓ KHĂN slot the team's belief about
 * the cause appears as an amber dashed card (not confirmed), then the definition of "giả định".
 */
const N = 35;
const SLOTS = { x: 160, y: 290, w: 1600, h: 140 };
const T = {
  belief: spokenAt(N, 'Nhóm cho rằng') + 8,
  flow: [spokenAt(N, 'hướng dẫn khó tìm') - 4, spokenAt(N, 'hướng dẫn khó tìm') + 26],
  cause: spokenAt(N, 'nguyên nhân chính') - 4,
  define: spokenAt(N, 'một giả định') - 6,
};
const belief = { x: 560, y: 540, w: 800, h: 160 };
const define = { x: 460, y: 780, w: 1000, h: 104 };

export default function S35() {
  const frame = useFrame();
  const obstacle = problemSlotBoxes(SLOTS)[1];
  const from = { x: obstacle.x + obstacle.w / 2, y: obstacle.y + obstacle.h + 8 };
  const to = { x: from.x, y: belief.y };
  return (
    <Scene n={N} frame={frame}>
      <ProblemSlots box={SLOTS} fill={[1, 1, 1]} size={22} />
      <Flow points={[from, to]} frame={frame} start={T.flow[0]} end={T.flow[1]} dashed hideIn={[belief]} />
      <RoleCard
        {...belief}
        tone="unknown"
        dashed
        label="NHÓM ĐANG CHO RẰNG"
        lines={frame >= T.cause ? ['Hướng dẫn khó tìm', 'là nguyên nhân chính'] : ['Hướng dẫn khó tìm']}
        size={28}
        opacity={appear(frame, T.belief - 12)}
        hot={pulse(frame, T.flow[1])}
      />
      <g opacity={appear(frame, T.belief)}>
        <circle cx={belief.x + belief.w - 40} cy={belief.y + 40} r={24} fill={C.bg} stroke={C.red} strokeWidth={3} />
        <SvgText x={belief.x + belief.w - 40} y={belief.y + 51} size={30} weight={700} color={C.red}>?</SvgText>
      </g>
      <RoleCard {...define} tone="unknown" lines={['Giả định = điều chưa được xác nhận']} size={30} opacity={appear(frame, T.define)} hot={pulse(frame, T.define + 6)} />
      <ToneLabel x={define.x + define.w / 2} y={define.y + define.h + 40} tone="unknown" anchor="middle" opacity={appear(frame, T.define + 20)}>
        CẦN KIỂM TRA TRƯỚC KHI XÂY
      </ToneLabel>
    </Scene>
  );
}
