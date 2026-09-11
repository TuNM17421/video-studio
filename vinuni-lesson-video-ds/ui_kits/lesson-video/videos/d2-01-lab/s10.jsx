import React from 'react';
import { Swimlane, laneBox } from '../../../../components/index.js';
import { C, appear, pulse, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene, TONE } from './shared.jsx';
import { SvgText } from '../../../../components/index.js';

/*
 * Câu 10 — three lanes: CÔNG VIỆC · TRỞ NGẠI · GIẢI PHÁP. The chatbot card starts mixed into the job
 * lane and, on "cách giải quyết", moves down into the GIẢI PHÁP lane. The obstacle carries an amber
 * "vì sao? — cần xác nhận" tag: the team still has to confirm why Lan struggles.
 */
const N = 10;
const LANES = { x: 100, y: 280, w: 1720, h: 650, headerW: 230, lanes: [
  { label: 'CÔNG VIỆC', tone: 'output', sub: 'Lan cần làm gì' },
  { label: 'TRỞ NGẠI', tone: 'check', sub: 'Lan vướng ở đâu' },
  { label: 'GIẢI PHÁP', tone: 'process', sub: 'cách giải quyết' },
] };
const T = {
  cards: 20,
  bot: spokenAt(N, 'trợ lý hội thoại') - 6,
  move: [spokenAt(N, 'cách giải quyết') - 4, spokenAt(N, 'cách giải quyết') + 30],
  why: spokenAt(N, 'vì sao') - 6,
};
const CARD_H = 124;
const inLane = (i, x, w) => {
  const b = laneBox(LANES, i);
  return { x, y: b.y + (b.h - CARD_H) / 2, w, h: CARD_H };
};
const job = inLane(0, 390, 560);
const obstacle = inLane(1, 390, 560);
const botFrom = inLane(0, 1130, 460);
const botTo = inLane(2, 390, 560);

export default function S10() {
  const frame = useFrame();
  const m = smooth(frame, T.move[0], T.move[1]);
  const bot = { x: botFrom.x + (botTo.x - botFrom.x) * m, y: botFrom.y + (botTo.y - botFrom.y) * m, w: botFrom.w + (botTo.w - botFrom.w) * m, h: CARD_H };
  const wy = appear(frame, T.why);
  const [amber, amberSoft] = TONE.unknown;
  return (
    <Scene n={N} frame={frame}>
      <Swimlane {...LANES} frame={frame} start={0} />
      <RoleCard {...job} tone="job" lines={['Nộp đúng bài, đúng nơi', 'trước hạn']} size={25} opacity={appear(frame, T.cards)} />
      <RoleCard {...obstacle} tone="problem" lines={['Chưa biết hướng dẫn nào', 'cho lớp mình']} size={25} opacity={appear(frame, T.cards + 8)} />
      <g opacity={wy < 1 ? wy : undefined}>
        <rect x={obstacle.x + obstacle.w + 40} y={obstacle.y + 26} width={500} height={72} rx={36} fill={amberSoft} stroke={amber} strokeWidth={3} strokeDasharray="12 10" />
        <SvgText x={obstacle.x + obstacle.w + 290} y={obstacle.y + 71} size={24} weight={700} color={C.text}>Vì sao? — cần xác nhận</SvgText>
      </g>
      <RoleCard {...bot} tone="solution" label="ĐỀ NGHỊ" lines={['Trợ lý hội thoại']} size={26} opacity={appear(frame, T.bot)} hot={pulse(frame, T.move[1] - 6)} />
    </Scene>
  );
}
