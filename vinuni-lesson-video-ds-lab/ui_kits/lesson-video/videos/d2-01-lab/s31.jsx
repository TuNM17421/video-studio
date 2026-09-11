import React from 'react';
import { appear, linearProgress, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene } from './shared.jsx';
import { Timeline } from './p4-shared.jsx';
import { TimelineFrame } from './p4-timeline.jsx';

/* Câu 31 — the MINH HỌA timeline: 19:00 "bắt đầu tìm" → 19:08 "xác nhận đúng hướng dẫn của lớp". */
const N = 31;
const T = {
  frame: 2,
  start: spokenAt(N, 'bắt đầu lúc') - 4,
  draw: [spokenAt(N, 'bắt đầu lúc') + 10, spokenAt(N, 'sau đó tám phút')],
};
T.end = T.draw[1] - 6;

export default function S31() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <TimelineFrame opacity={appear(frame, T.frame)} />
      <Timeline draw={linearProgress(frame, T.draw[0], T.draw[1])} startMark={appear(frame, T.start)} endMark={appear(frame, T.end)} opacity={appear(frame, T.frame)} />
    </Scene>
  );
}
