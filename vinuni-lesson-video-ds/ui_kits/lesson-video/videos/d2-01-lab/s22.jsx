import React from 'react';
import { SvgText } from '../../../../components/index.js';
import { C, appear, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';

/*
 * Câu 22 — xem số câu hỏi trên mỗi học viên. Two bars grow together from one continuous value (no
 * numbers); then the per-learner ratio card asks the real question: it may not have changed at all.
 */
const N = 22;
const T = {
  axis: 4,
  grow: [spokenAt(N, 'số học viên tăng') - 4, spokenAt(N, 'dù mỗi người') - 4],
  ratio: spokenAt(N, 'mỗi người') - 8,
  flat: spokenAt(N, 'nhiều hơn') - 4,
};
const BASE = 840;
const BARS = [
  { x: 300, label: 'Số học viên' },
  { x: 600, label: 'Số câu hỏi' },
];
const BW = 170;

export default function S22() {
  const frame = useFrame();
  const g = smooth(frame, T.grow[0], T.grow[1]);
  const hgt = 110 + 380 * g;
  const r = appear(frame, T.ratio);
  return (
    <Scene n={N} frame={frame}>
      <g opacity={appear(frame, T.axis)}>
        <path d={`M 220 ${BASE} H 900`} stroke={C.text} strokeWidth={3} />
        {BARS.map((b) => (
          <g key={b.label}>
            <rect x={b.x} y={BASE - hgt} width={BW} height={hgt} rx={10} fill={C.accent} />
            <SvgText x={b.x + BW / 2} y={BASE + 42} size={24} weight={700}>
              {b.label}
            </SvgText>
            <SvgText x={b.x + BW / 2} y={BASE - hgt - 18} size={30} weight={700} color={C.accent} opacity={appear(frame, T.grow[0] + 10)}>
              ↑
            </SvgText>
          </g>
        ))}
        <SvgText x={560} y={300} size={18} weight={700} color={C.textMuted} letterSpacing={1.2}>
          CÙNG TĂNG · MINH HỌA
        </SvgText>
      </g>
      <RoleCard x={1060} y={400} w={700} h={340} tone="unknown" label="CÂU HỎI TRÊN MỖI HỌC VIÊN" opacity={r}>
        <SvgText x={1330} y={530} size={30} weight={700}>
          Số câu hỏi
        </SvgText>
        <path d="M 1180 558 H 1480" stroke={C.text} strokeWidth={4} />
        <SvgText x={1330} y={606} size={30} weight={700}>
          Số học viên
        </SvgText>
        <SvgText x={1580} y={584} size={64} weight={700} color={C.red}>
          = ?
        </SvgText>
        <SvgText x={1410} y={690} size={22} weight={600} color={C.textMuted} opacity={appear(frame, T.flat)}>
          có thể không đổi dù tổng số tăng
        </SvgText>
      </RoleCard>
    </Scene>
  );
}
