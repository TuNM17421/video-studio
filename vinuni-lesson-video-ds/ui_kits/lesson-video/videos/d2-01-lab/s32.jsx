import React from 'react';
import { SvgText } from '../../../../components/index.js';
import { C, appear, linearProgress, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Dung, Scene } from './shared.jsx';
import { AXIS, SpanBand, Timeline, axisX } from './p4-shared.jsx';
import { TimelineFrame } from './p4-timeline.jsx';

/*
 * Câu 32 — the whole 8-minute span is the measure; Dũng typing the final answer is only a short piece
 * inside it (position illustrative).
 */
const N = 32;
const T = {
  band: [spokenAt(N, 'tám phút') - 10, spokenAt(N, 'tám phút') + 30],
  typing: spokenAt(N, 'Dũng gõ') - 6,
};
const SEG = { x0: axisX(6.3), x1: axisX(6.9) };

export default function S32() {
  const frame = useFrame();
  const ty = appear(frame, T.typing);
  return (
    <Scene n={N} frame={frame}>
      <TimelineFrame />
      <Timeline />
      <SpanBand fill={linearProgress(frame, T.band[0], T.band[1])} label={appear(frame, T.band[1] - 6)} />
      {ty > 0.001 ? (
        <g opacity={ty < 1 ? ty : undefined}>
          <rect x={SEG.x0} y={AXIS.y - 26} width={SEG.x1 - SEG.x0} height={52} rx={10} fill={C.accentStrong} />
          <line x1={(SEG.x0 + SEG.x1) / 2} y1={AXIS.y + 30} x2={(SEG.x0 + SEG.x1) / 2} y2={AXIS.y + 150} stroke={C.accentStrong} strokeWidth={3} />
          <SvgText x={(SEG.x0 + SEG.x1) / 2 - 18} y={AXIS.y + 186} size={24} weight={700} anchor="end" color={C.accentStrong}>
            Dũng gõ câu trả lời
          </SvgText>
        </g>
      ) : null}
      <Dung x={(SEG.x0 + SEG.x1) / 2 + 60} y={AXIS.y + 200} r={40} opacity={ty} />
    </Scene>
  );
}
