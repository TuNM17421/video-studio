import React from 'react';
import { Flow, Pill, SvgText } from '../../../../components/index.js';
import { C, ROLE, appear, clamp01, linearProgress, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt, speechEnd } from './cues.js';
import { RoleCard, Scene, TONE } from './shared.jsx';

/*
 * Câu 47 — close. The three-card kit (problem · measure · unknown) stays on the left; a double-diamond
 * outline opens to the right: the first diamond (Vấn đề, this video) and the second (Giải pháp) lit as
 * the next video; one Flow carries the kit into the second diamond.
 */
const N = 47;
const T = {
  kit: 0,
  d1: spokenAt(N, 'câu vấn đề') + 4,
  d2: spokenAt(N, 'tìm các hướng giải quyết') - 10,
  flow: [spokenAt(N, 'tìm các hướng giải quyết') - 4, spokenAt(N, 'video sau') + 4],
  next: spokenAt(N, 'video sau'),
};
const KIT = [
  { label: 'KHÓ KHĂN', lines: ['Câu vấn đề'], tone: 'problem' },
  { label: 'CÁCH ĐO', lines: ['Chỉ số theo dõi'], tone: 'metric' },
  { label: 'ĐIỀU CHƯA RÕ', lines: ['Giả định cần kiểm tra'], tone: 'unknown', dashed: true },
];
const kitBox = (i) => ({ x: 110, y: 330 + i * 160, w: 440, h: 130 });
const CY = 560;
const D1 = { cx: 980, hw: 280, hh: 220 };
const D2 = { cx: 1540, hw: 280, hh: 220 };
const diamond = (d) => `M ${d.cx - d.hw} ${CY} L ${d.cx} ${CY - d.hh} L ${d.cx + d.hw} ${CY} L ${d.cx} ${CY + d.hh} Z`;
const PERIM = 4 * Math.hypot(280, 220);

function Diamond({ d, draw, stroke, fill, title, sub, glow = 0 }) {
  if (draw <= 0.001) return null;
  return (
    <g>
      <path d={diamond(d)} fill={fill} fillOpacity={clamp01(draw * 2 - 1)} stroke={stroke} strokeWidth={4 + 2 * glow} strokeLinejoin="round" strokeDasharray={`${PERIM * draw} ${PERIM}`} />
      <SvgText x={d.cx} y={CY - 40} size={34} weight={700} color={C.text} opacity={clamp01(draw * 2 - 1)}>
        {title}
      </SvgText>
      <SvgText x={d.cx} y={CY - 2} size={21} weight={600} color={C.textMuted} opacity={clamp01(draw * 2 - 1)}>
        {sub}
      </SvgText>
    </g>
  );
}

export default function S47() {
  const frame = useFrame();
  const d1 = linearProgress(frame, T.d1, T.d1 + 30);
  const d2 = linearProgress(frame, T.d2, T.d2 + 30);
  const hit = pulse(frame, T.flow[1]);
  const lit = appear(frame, T.flow[1] - 6);
  return (
    <Scene n={N} frame={frame}>
      {KIT.map((k, i) => (
        <RoleCard key={k.label} {...kitBox(i)} {...k} size={26} opacity={appear(frame, T.kit + i * 6)} />
      ))}
      <Diamond d={D1} draw={d1} stroke={C.accent} fill={C.bgAlt} title="Vấn đề" sub="câu vấn đề · cách đo" />
      <Diamond d={D2} draw={d2} stroke={TONE.solution[0]} fill={lit > 0.5 ? ROLE.purpleSoft : C.bg} title="Giải pháp" sub="tìm các hướng" glow={hit} />
      <Flow points={[{ x: 562, y: 555 }, { x: 630, y: CY + 60 }, { x: D2.cx - 40, y: CY + 60 }]} frame={frame} start={T.flow[0]} end={T.flow[1]} color={TONE.solution[0]} />
      <Pill x={D2.cx - 75} y={CY + D2.hh + 24} label="VIDEO SAU" accent={TONE.solution[0]} variant="solid" opacity={lit} />
      <Pill x={D1.cx - 70} y={CY + D1.hh + 24} label="VIDEO NÀY" accent={C.accent} opacity={appear(frame, T.d1 + 20)} />
      <SvgText x={1260} y={300} size={22} weight={700} color={C.accentStrong} opacity={appear(frame, Math.min(speechEnd(N), T.next + 10))}>
        Từ vấn đề → tới các hướng giải quyết
      </SvgText>
    </Scene>
  );
}
