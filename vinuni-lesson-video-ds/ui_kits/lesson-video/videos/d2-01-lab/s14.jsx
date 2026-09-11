import React from 'react';
import { StaticPath, SvgText } from '../../../../components/index.js';
import { C, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { ProblemSlots, RoleCard, Scene, ToneLabel } from './shared.jsx';

/*
 * Câu 14 — the rule of the part: write the problem first (three filled slots), choose the solution
 * later (three dashed purple options, opened only on "cách giải quyết sẽ chọn sau").
 */
const N = 14;
const BOX = { x: 160, y: 340, w: 1600, h: 170 };
const OPTIONS = ['Trợ lý hội thoại', 'Nút hướng dẫn', 'Cách khác…'];
const OPT_W = 460;
const OPT_Y = 700;
const optX = (i) => 160 + i * (OPT_W + 110);
const say = spokenAt(N, 'Lan vướng điều gì');
const T = {
  label: 4,
  fill: [say - 6, say + 10, say + 26],
  solve: spokenAt(N, 'cách giải quyết') - 6,
  opts: [0, 10, 20],
  hot: spokenAt(N, 'hiểu khó khăn') - 4,
};

export default function S14() {
  const frame = useFrame();
  const so = appear(frame, T.solve);
  const h = pulse(frame, T.hot);
  return (
    <Scene n={N} frame={frame}>
      <ToneLabel x={170} y={315} tone="problem" opacity={appear(frame, T.label)}>VẤN ĐỀ · VIẾT TRƯỚC</ToneLabel>
      <ProblemSlots box={BOX} fill={T.fill.map((t) => appear(frame, t))} hot={[h, h, h]} opacity={appear(frame, T.label)} />
      <g opacity={so < 1 ? so : undefined}>
        <StaticPath points={[{ x: 960, y: BOX.y + BOX.h + 16 }, { x: 960, y: OPT_Y - 70 }]} color={C.dotInactive} strokeWidth={4} dashed />
        <SvgText x={990} y={BOX.y + BOX.h + 100} size={21} weight={600} anchor="start" color={C.textMuted}>sau khi đã hiểu khó khăn</SvgText>
        <ToneLabel x={170} y={OPT_Y - 26} tone="solution">GIẢI PHÁP · CHỌN SAU</ToneLabel>
      </g>
      {OPTIONS.map((o, i) => (
        <RoleCard key={o} x={optX(i)} y={OPT_Y} w={OPT_W} h={130} tone="solution" dashed lines={[o]} size={26} opacity={appear(frame, T.solve + T.opts[i])} />
      ))}
    </Scene>
  );
}
