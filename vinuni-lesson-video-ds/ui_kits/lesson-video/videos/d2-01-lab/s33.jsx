import React from 'react';
import { SpeechBubble, SvgText } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene } from './shared.jsx';
import { AXIS, SpanBand, Timeline, axisX } from './p4-shared.jsx';
import { TimelineFrame } from './p4-timeline.jsx';

/*
 * Câu 33 — the two follow-up questions are pinned where they happened on the same timeline, with their
 * content (MINH HỌA), to find the step where Lan got stuck.
 */
const N = 33;
const T = {
  asks: [spokenAt(N, 'hai lượt') - 6, spokenAt(N, 'hai lượt') + 14],
  where: spokenAt(N, 'vị trí') - 4,
  stuck: spokenAt(N, 'Lan vướng') - 6,
};
const ASKS = [
  { m: 2.2, w: 400, lines: ['“Hướng dẫn nào là', 'của lớp em?”'], label: 'LƯỢT HỎI 1' },
  { m: 5.2, w: 360, lines: ['“Nộp ở mục nào ạ?”'], label: 'LƯỢT HỎI 2' },
];
const BUBBLE_Y = 408;
const BUBBLE_H = 96;

export default function S33() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <TimelineFrame />
      <Timeline />
      <SpanBand label={0} opacity={0.6} />
      {ASKS.map((a, i) => {
        const o = appear(frame, T.asks[i]);
        const pin = appear(frame, T.where + i * 14);
        const x = axisX(a.m);
        return (
          <g key={i}>
            {pin > 0.001 ? (
              <g opacity={pin < 1 ? pin : undefined}>
                <line x1={x} y1={BUBBLE_Y + BUBBLE_H + 26} x2={x} y2={AXIS.y} stroke={C.accent} strokeWidth={3} strokeDasharray="6 6" />
                <circle cx={x} cy={AXIS.y} r={13} fill={C.bg} stroke={C.accent} strokeWidth={5} />
              </g>
            ) : null}
            <SvgText x={x - 25} y={BUBBLE_Y - 14} size={17} weight={700} anchor="start" color={C.accentStrong} letterSpacing={1.2} opacity={o}>
              {a.label}
            </SvgText>
            <SpeechBubble x={x - 25} y={BUBBLE_Y} w={a.w} h={BUBBLE_H} lines={a.lines} size={24} tail="left" opacity={o} />
          </g>
        );
      })}
      <SvgText x={960} y={AXIS.y + 170} size={34} weight={700} color={C.text} opacity={appear(frame, T.stuck)}>
        Lan vướng ở bước nào?
      </SvgText>
    </Scene>
  );
}
