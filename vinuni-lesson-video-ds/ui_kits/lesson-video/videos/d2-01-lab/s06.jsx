import React from 'react';
import { Enclosure, Stopwatch, SvgText } from '../../../../components/index.js';
import { C, appear, linearProgress, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { ProblemSlots, Scene } from './shared.jsx';

/*
 * Câu 06 — the two outputs of the video, side by side: the problem sentence (three empty slots to be
 * written) and a way to measure (a stopwatch, no number). Nothing is filled yet.
 */
const N = 6;
const T = {
  sentence: spokenAt(N, 'viết một câu') - 8,
  slots: spokenAt(N, 'nêu rõ khó khăn') - 6,
  measure: spokenAt(N, 'chọn cách đo') - 8,
  sweep: [spokenAt(N, 'chọn cách đo'), spokenAt(N, 'chọn cách đo') + 60],
};
const left = { x: 110, y: 360, w: 1230, h: 400 };
const right = { x: 1400, y: 360, w: 410, h: 400 };

export default function S06() {
  const frame = useFrame();
  const oS = appear(frame, T.slots);
  return (
    <Scene n={N} frame={frame}>
      <Enclosure {...left} label="ĐẦU RA 1 · CÂU VẤN ĐỀ" color={C.accentStrong} opacity={appear(frame, T.sentence)} />
      <ProblemSlots box={{ x: 150, y: 480, w: 1150, h: 170 }} show={[oS, appear(frame, T.slots + 8), appear(frame, T.slots + 16)]} />
      <SvgText x={left.x + left.w / 2} y={left.y + left.h - 40} size={22} weight={600} color={C.textMuted} opacity={oS}>
        Một câu: ai · khó việc gì, khi nào · dẫn tới điều gì
      </SvgText>
      <Enclosure {...right} label="ĐẦU RA 2 · CÁCH ĐO" color={C.accentStrong} opacity={appear(frame, T.measure)} />
      <Stopwatch x={right.x + right.w / 2} y={right.y + 180} r={82} sweep={linearProgress(frame, T.sweep[0], T.sweep[1]) * 0.35} color={C.accentStrong} opacity={appear(frame, T.measure + 4)} />
      <SvgText x={right.x + right.w / 2} y={right.y + right.h - 40} size={22} weight={600} color={C.textMuted} opacity={appear(frame, T.measure + 10)}>
        Khó khăn có giảm không?
      </SvgText>
    </Scene>
  );
}
