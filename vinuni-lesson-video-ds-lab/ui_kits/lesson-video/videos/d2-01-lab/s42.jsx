import React from 'react';
import { SvgText } from '../../../../components/index.js';
import { C, ROLE, clamp01, interpolate, useFrame } from '../../../../lib/index.js';
import { Board } from './p6-shared.jsx';
import { Scene } from './shared.jsx';

/*
 * Câu 42 — 5-second silent pause (150 f, no narration, no captions). Câu 41's board holds; five dots
 * light up together, then one switches off per second.
 */
const N = 42;
const DOTS = 5;
const CX = 960;
const Y = 900;

export default function S42() {
  const frame = useFrame();
  const on = clamp01(frame / 8);
  return (
    <Scene n={N} frame={frame}>
      <Board frame={frame} dim={0.15} />
      <rect x={CX - 300} y={Y - 44} width={600} height={88} rx={44} fill={C.bg} stroke={ROLE.amber} strokeWidth={3} />
      {Array.from({ length: DOTS }, (_, i) => {
        // dot i goes out at the end of second i+1 (last dot at f 150)
        const off = interpolate(frame, [30 * (i + 1) - 6, 30 * (i + 1)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const lit = on * (1 - off);
        const x = CX - 250 + i * 40;
        return <circle key={i} cx={x} cy={Y} r={13} fill={lit > 0.5 ? ROLE.amber : C.dotInactive} stroke={ROLE.amber} strokeWidth={2} />;
      })}
      <SvgText x={CX - 45} y={Y + 8} size={22} weight={700} anchor="start" color={C.text}>
        Tạm dừng · bạn thử trả lời
      </SvgText>
    </Scene>
  );
}
