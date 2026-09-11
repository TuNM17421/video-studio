import React from 'react';
import { Flow, HookOverlay, SvgText } from '../../../../components/index.js';
import { C, anchor, appear, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Dung, Lan, RoleCard, Scene } from './shared.jsx';

/*
 * Câu 01 — hook "Giải pháp hay vấn đề?", then the proposal of the support team sits between Lan and
 * Dũng; two dashed red question lines reach toward each of them as "khó khăn cần giải quyết" is read.
 * The question stays open (no answer). MINH HỌA: self-authored situation.
 */
const N = 1;
const T = {
  hook: 110,
  people: 96,
  card: 104,
  ask: spokenAt(N, 'khó khăn cần giải quyết') - 8,
  marks: spokenAt(N, 'khó khăn cần giải quyết') + 26,
};
export const LAN = { x: 250, y: 560 };
export const DUNG = { x: 1670, y: 560 };
const card = { x: 700, y: 470, w: 520, h: 180 };

function Ask({ x, y, opacity }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <circle cx={x} cy={y} r={32} fill={C.bg} stroke={C.red} strokeWidth={4} />
      <SvgText x={x} y={y + 13} size={38} weight={700} color={C.red}>?</SvgText>
    </g>
  );
}

export default function S01() {
  const frame = useFrame();
  const L = anchor(card, 'left');
  const R = anchor(card, 'right');
  const lanEnd = { x: LAN.x + 90, y: L.y };
  const dungEnd = { x: DUNG.x - 90, y: R.y };
  return (
    <Scene n={N} frame={frame} overlay={<HookOverlay frame={frame} duration={T.hook} question="Giải pháp hay vấn đề?" />}>
      <Lan x={LAN.x} y={LAN.y} opacity={appear(frame, T.people)} />
      <Dung x={DUNG.x} y={DUNG.y} opacity={appear(frame, T.people)} />
      <RoleCard {...card} tone="solution" label="ĐỀ NGHỊ CỦA ĐỘI HỖ TRỢ" lines={['CẦN TRỢ LÝ', 'HỘI THOẠI']} size={34} opacity={appear(frame, T.card)} />
      <Flow points={[L, lanEnd]} frame={frame} start={T.ask} end={T.ask + 30} color={C.red} dashed hideIn={[card]} />
      <Flow points={[R, dungEnd]} frame={frame} start={T.ask} end={T.ask + 30} color={C.red} dashed hideIn={[card]} />
      <Ask x={(L.x + lanEnd.x) / 2} y={L.y - 62} opacity={appear(frame, T.marks)} />
      <Ask x={(R.x + dungEnd.x) / 2} y={R.y - 62} opacity={appear(frame, T.marks)} />
      <SvgText x={960} y={760} size={26} weight={700} color={C.red} opacity={appear(frame, T.marks + 6)}>
        Khó khăn cần giải quyết là gì?
      </SvgText>
    </Scene>
  );
}
