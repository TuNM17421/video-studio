import React from 'react';
import { Flow, NumberBadge, SvgText } from '../../../../components/index.js';
import { C, anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Lan, RoleCard, Scene } from './shared.jsx';

/*
 * Câu 03 — the road of the day in four stages; the situation card (MINH HỌA) names the running case;
 * stage 1 "Làm rõ vấn đề" lights (orange = the difficulty) on "bắt đầu từ khó khăn", and the later
 * stages stay neutral until "rồi mới chọn cách giải quyết".
 */
const N = 3;
const STAGES = [
  ['LÀM RÕ', 'VẤN ĐỀ'],
  ['TÌM', 'PHƯƠNG ÁN'],
  ['PHÂN CÔNG', 'NGƯỜI VÀ MÁY'],
  ['CHỌN CÁCH', 'TỔ CHỨC'],
];
const W = 350;
const GAP = 76;
const X0 = (1920 - (4 * W + 3 * GAP)) / 2;
const boxes = STAGES.map((_, i) => ({ x: X0 + i * (W + GAP), y: 330, w: W, h: 150 }));
const T = {
  stages: [6, 16, 26, 36],
  flows: [[20, 44], [30, 54], [40, 64]],
  situation: spokenAt(N, 'tình huống') - 8,
  first: spokenAt(N, 'bắt đầu từ khó khăn') - 4,
  rest: spokenAt(N, 'rồi mới chọn') - 4,
};
const situation = { x: 440, y: 640, w: 900, h: 170 };

export default function S03() {
  const frame = useFrame();
  const lit = appear(frame, T.first);
  return (
    <Scene n={N} frame={frame}>
      {boxes.map((b, i) => (
        <g key={i}>
          <RoleCard
            {...b}
            tone={i === 0 && lit > 0.5 ? 'problem' : 'neutral'}
            lines={STAGES[i]}
            size={26}
            opacity={appear(frame, T.stages[i])}
            hot={i === 0 ? pulse(frame, T.first) : i > 0 ? pulse(frame, T.rest + (i - 1) * 8) * 0.6 : 0}
          />
          <NumberBadge x={b.x + 34} y={b.y + 34} value={i + 1} active={i === 0 && lit > 0.5} opacity={appear(frame, T.stages[i])} />
        </g>
      ))}
      {T.flows.map(([s, e], i) => (
        <Flow key={i} points={[anchor(boxes[i], 'right'), anchor(boxes[i + 1], 'left')]} frame={frame} start={s} end={e} hideIn={[boxes[i], boxes[i + 1]]} />
      ))}
      <SvgText x={boxes[0].x + W / 2} y={boxes[0].y + 196} size={22} weight={700} color={C.red} opacity={lit}>
        Bắt đầu ở đây
      </SvgText>
      <RoleCard {...situation} tone="user" label="TÌNH HUỐNG MINH HỌA" lines={['Lan tìm hướng dẫn nộp bài', 'đi qua bốn chặng, bắt đầu từ khó khăn']} size={28} align="start" opacity={appear(frame, T.situation)} />
      <Lan x={1500} y={situation.y + 70} r={56} opacity={appear(frame, T.situation)} />
    </Scene>
  );
}
