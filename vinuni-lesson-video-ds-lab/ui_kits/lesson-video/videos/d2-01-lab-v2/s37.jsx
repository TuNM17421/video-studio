import React from 'react';
import { SvgText } from '../../../../components/index.js';
import { C, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene } from './shared.jsx';
import { Chain, Situation3, ZONES, ZoneFrame, slot } from './v2-pE.jsx';

/*
 * Câu 37 — situations 1 and 2 side by side (zone 3 dims). First the zone headers light — the part a
 * user sees and the name — then the chains behind them light and "≠" marks show the rows differ.
 */
const N = 37;
const HEAD = spokenAt(N, 'giao diện') - 4;
const CHAIN = spokenAt(N, 'cách gọi tên') + 10;
const T = { dim: 0, head: HEAD, chain: CHAIN, neq: CHAIN + 8 };
const NEQ_X = (ZONES[0].x + ZONES[0].w + ZONES[1].x) / 2;

function Neq({ y, opacity }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <circle cx={NEQ_X} cy={y} r={22} fill={C.bg} stroke={C.red} strokeWidth={3} />
      <SvgText x={NEQ_X} y={y + 11} size={30} weight={700} color={C.red}>
        ≠
      </SvgText>
    </g>
  );
}

export default function S37() {
  const frame = useFrame();
  const dim = appear(frame, T.dim, 20);
  const chainHot = [0, 1, 2].map((i) => pulse(frame, T.chain + i * 8));
  return (
    <Scene n={N} frame={frame}>
      <ZoneFrame z={0} title={1} hot={pulse(frame, T.head)} />
      <ZoneFrame z={1} title={1} hot={pulse(frame, T.head + 6)} />
      <ZoneFrame z={2} title={1} muted={dim} />
      <Chain z={0} hot={chainHot} />
      <Chain z={1} hot={chainHot} />
      <Situation3 muted={dim} />
      {[0, 1, 2].map((i) => {
        const b = slot(0, i);
        return <Neq key={i} y={b.y + b.h / 2} opacity={appear(frame, T.neq + i * 8)} />;
      })}
    </Scene>
  );
}
