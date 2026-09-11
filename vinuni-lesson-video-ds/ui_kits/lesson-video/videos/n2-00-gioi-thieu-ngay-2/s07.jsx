import React from 'react';
import { Card, Flow, Pill, Stopwatch, SvgText } from '../../../../components/index.js';
import { C, anchor, appear, linearProgress, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { PartScene } from './shared.jsx';

/*
 * Câu 07 — measure now → choose a target → measure again. Three cards with stopwatches and no digits:
 * the current one sweeps a full turn, the target shows a smaller share, the re-measure has no result yet
 * ("?"). A dashed return path marks the loop back to measuring.
 */
const N = 7;
const T = {
  now: spokenAt(N, 'ghi lại hiện nay') - 6,
  sweep: [spokenAt(N, 'ghi lại hiện nay') + 10, spokenAt(N, 'chọn thời gian') - 20],
  targetFlow: [spokenAt(N, 'chọn thời gian') - 10, spokenAt(N, 'chọn thời gian') + 16],
  target: spokenAt(N, 'chọn thời gian') - 10,
  againFlow: [spokenAt(N, 'đo lại') - 8, spokenAt(N, 'đo lại') + 18],
  again: spokenAt(N, 'đo lại') - 8,
  back: [spokenAt(N, 'đo lại') + 20, spokenAt(N, 'đo lại') + 44],
};
const W = 460;
const H = 300;
const Y = 450;
const cards = [120, 730, 1340].map((x) => ({ x, y: Y, w: W, h: H }));
const SW_Y = Y + 135;
const TEXT_Y = Y + 250;
const LOOP_Y = Y + H + 56;
const pill = { x: 960 - 70, y: LOOP_Y - 25, w: 140, h: 50 };

function Content({ c, label, text, children }) {
  return (
    <>
      {children}
      <SvgText x={c.x + W / 2} y={TEXT_Y} size={24} weight={700}>
        {text}
      </SvgText>
    </>
  );
}

export default function S07() {
  const frame = useFrame();
  const [a, b, d] = cards;
  const loop = [
    anchor(d, 'bottom'),
    { x: d.x + W / 2, y: LOOP_Y },
    { x: a.x + W / 2, y: LOOP_Y },
    { x: a.x + W / 2, y: Y + H + 8 },
  ];
  loop[0] = { x: loop[0].x, y: loop[0].y + 8 };
  return (
    <PartScene n={N} frame={frame}>
      <Flow points={[{ x: a.x + W + 8, y: SW_Y }, { x: b.x - 8, y: SW_Y }]} frame={frame} start={T.targetFlow[0]} end={T.targetFlow[1]} />
      <Flow points={[{ x: b.x + W + 8, y: SW_Y }, { x: d.x - 8, y: SW_Y }]} frame={frame} start={T.againFlow[0]} end={T.againFlow[1]} />
      <Flow points={loop} frame={frame} start={T.back[0]} end={T.back[1]} dashed hideIn={[pill, a, d]} />
      <Pill x={pill.x} y={pill.y} w={pill.w} label="ĐO LẠI" opacity={appear(frame, T.back[0] + 6)} />

      <Card {...a} label="HIỆN NAY" opacity={appear(frame, T.now)} active={pulse(frame, T.back[1])}>
        <Content c={a} text="Mất bao lâu hiện nay?">
          <Stopwatch x={a.x + W / 2} y={SW_Y} sweep={linearProgress(frame, T.sweep[0], T.sweep[1])} />
        </Content>
      </Card>
      <Card {...b} label="MỤC TIÊU" opacity={appear(frame, T.target)} active={pulse(frame, T.targetFlow[1])}>
        <Content c={b} text="Muốn rút ngắn còn bao lâu?">
          <Stopwatch x={b.x + W / 2} y={SW_Y} sweep={0.45} color={C.accent} />
        </Content>
      </Card>
      <Card {...d} label="ĐO LẠI" opacity={appear(frame, T.again)} active={pulse(frame, T.againFlow[1])}>
        <Content c={d} text="Đo lại sau khi cải thiện">
          <Stopwatch x={d.x + W / 2} y={SW_Y} sweep={0} wedge={false} color={C.accent} />
          <circle cx={d.x + W / 2 + 58} cy={SW_Y - 48} r={20} fill={C.redSoft} stroke={C.red} strokeWidth={3} />
          <SvgText x={d.x + W / 2 + 58} y={SW_Y - 39} size={24} weight={700} color={C.red}>
            ?
          </SvgText>
        </Content>
      </Card>
    </PartScene>
  );
}
