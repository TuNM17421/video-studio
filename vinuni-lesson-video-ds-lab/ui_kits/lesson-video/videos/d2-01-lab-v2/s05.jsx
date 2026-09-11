import React from 'react';
import { Flow } from '../../../../components/index.js';
import { anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt, speechEnd } from './cues.js';
import { RoleCard, Scene, ToneLabel } from './shared.jsx';

/*
 * Câu 05 — clarify first: "Công nghệ" is placed at the far end (muted, dashed) as soon as it is named;
 * the three clarifying cards then appear in order and a chain runs through them, reaching the technology
 * card only at the end of the sentence.
 */
const N = 5;
const SAY = [spokenAt(N, 'điều gì đang xảy ra'), spokenAt(N, 'điều gì cần thay đổi'), spokenAt(N, 'quyết định nào')];
const T = {
  tech: spokenAt(N, 'đề xuất công nghệ') - 4,
  cards: SAY.map((t) => t - 8),
  flows: [
    [SAY[1] - 14, SAY[1] + 4],
    [SAY[2] - 14, SAY[2] + 4],
    [speechEnd(N) - 16, speechEnd(N) + 14],
  ],
};
const Y = 480;
const H = 170;
const BOXES = [
  { x: 110, y: Y, w: 400, h: H, lines: ['Điều đang', 'xảy ra'] },
  { x: 570, y: Y, w: 400, h: H, lines: ['Điều cần', 'thay đổi'] },
  { x: 1030, y: Y, w: 440, h: H, lines: ['Quyết định đang', 'được đặt ra'] },
];
const TECH = { x: 1540, y: Y + 20, w: 270, h: H - 40 };

export default function S05() {
  const frame = useFrame();
  const chain = [...BOXES, TECH];
  return (
    <Scene n={N} frame={frame}>
      <ToneLabel x={120} y={440} tone="job" opacity={appear(frame, T.cards[0])}>
        LÀM RÕ TRƯỚC
      </ToneLabel>
      <ToneLabel x={1550} y={440} tone="solution" opacity={appear(frame, T.tech)}>
        SAU ĐÓ
      </ToneLabel>
      <RoleCard {...TECH} tone="solution" lines={['CÔNG NGHỆ']} size={28} dashed muted={0.4} opacity={appear(frame, T.tech)} hot={pulse(frame, T.flows[2][1])} />
      {BOXES.map((b, i) => (
        <RoleCard key={i} {...b} tone="job" lines={b.lines} size={30} opacity={appear(frame, T.cards[i])} hot={pulse(frame, i === 0 ? T.cards[0] + 8 : T.flows[i - 1][1])} />
      ))}
      {T.flows.map(([s, e], i) => (
        <Flow key={i} points={[anchor(chain[i], 'right'), anchor(chain[i + 1], 'left')]} frame={frame} start={s} end={e} hideIn={[chain[i], chain[i + 1]]} />
      ))}
    </Scene>
  );
}
