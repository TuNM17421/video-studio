import React from 'react';
import { Check, Flow, Stopwatch, SvgText } from '../../../../components/index.js';
import { C, ROLE, appear, linearProgress, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Lan, RoleCard, Scene } from './shared.jsx';

/*
 * Câu 30 — the metric. The clock starts at "bắt đầu tìm", runs while Lan searches, and stops only at
 * "xác nhận đúng hướng dẫn của lớp" (green = đạt). Named "chỉ số" as the narration says it. No digits.
 */
const N = 30;
const T = {
  start: spokenAt(N, 'theo dõi') - 8,
  run: [spokenAt(N, 'thời gian tìm') - 2, spokenAt(N, 'gọi là') + 4],
  metric: spokenAt(N, 'một chỉ số') - 6,
};
T.end = T.run[1] - 22;
const START = { x: 150, y: 540, w: 380, h: 150 };
const END = { x: 1390, y: 540, w: 420, h: 150 };
const METRIC = { x: 560, y: 285, w: 800, h: 130 };
const Y = START.y + START.h / 2;

export default function S30() {
  const frame = useFrame();
  const run = linearProgress(frame, T.run[0], T.run[1]);
  const done = appear(frame, T.run[1]);
  return (
    <Scene n={N} frame={frame}>
      <Lan x={START.x + 70} y={Y + 190} r={48} opacity={appear(frame, T.start)} />
      <RoleCard {...START} tone="user" label="BẤM GIỜ" lines={['Bắt đầu tìm', 'hướng dẫn']} size={26} opacity={appear(frame, T.start)} />
      <RoleCard {...END} tone="job" label="DỪNG GIỜ" lines={['Xác nhận đúng', 'hướng dẫn của lớp']} size={26} opacity={appear(frame, T.end)} hot={pulse(frame, T.run[1])} />
      {frame >= T.run[0] ? (
        <Flow points={[{ x: START.x + START.w, y: Y }, { x: END.x, y: Y }]} frame={frame} start={T.run[0]} end={T.run[1]} hideIn={[START, END]} />
      ) : null}
      <Stopwatch x={960} y={Y + 160} r={62} sweep={0.9 * run} color={C.accentStrong} wedge={false} opacity={appear(frame, T.run[0] - 10)} />
      <SvgText x={960} y={Y + 270} size={22} weight={700} color={C.accentStrong} opacity={appear(frame, T.run[0])}>
        {done > 0.5 ? 'đã dừng' : 'đang đo'}
      </SvgText>
      <Check x={END.x + END.w - 44} y={END.y + 38} size={36} color={ROLE.green} opacity={done} />
      <RoleCard {...METRIC} tone="metric" label="CHỈ SỐ" lines={['Thời gian tìm đúng hướng dẫn']} size={30} opacity={appear(frame, T.metric)} hot={pulse(frame, T.metric + 10)} />
    </Scene>
  );
}
