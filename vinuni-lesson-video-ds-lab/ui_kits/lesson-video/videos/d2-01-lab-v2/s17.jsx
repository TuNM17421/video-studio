import React from 'react';
import { SvgText } from '../../../../components/index.js';
import { C, appear, linearProgress, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';

/*
 * Câu 17 — the easy-to-miss moment: the purple "GIẢI PHÁP" card slides in first, in front; the
 * "BÀI TOÁN" card behind it only comes into view gradually and stays partly covered.
 */
const N = 17;
const T = {
  label: spokenAt(N, 'điểm dễ bị bỏ qua nhất') - 6,
  slide: [spokenAt(N, 'khi giải pháp') - 12, spokenAt(N, 'khi giải pháp') + 18],
  problem: [spokenAt(N, 'bài toán được nhìn thấy') - 10, spokenAt(N, 'bài toán được nhìn thấy') + 60],
};
const prob = { x: 900, y: 360, w: 620, h: 330 };

export default function S17() {
  const frame = useFrame();
  const s = smooth(frame, T.slide[0], T.slide[1]);
  const p = linearProgress(frame, T.problem[0], T.problem[1]);
  return (
    <Scene n={N} frame={frame}>
      <RoleCard {...prob} tone="user" label="BÀI TOÁN" lines={['?']} size={60} opacity={appear(frame, T.slide[0]) * (0.2 + 0.8 * p)} />
      <RoleCard x={-400 + 920 * s} y={500} w={620} h={330} tone="solution" label="GIẢI PHÁP" lines={['Giải pháp', 'xuất hiện trước']} size={36} opacity={s > 0.001 ? 1 : 0} />
      <SvgText x={960} y={930} size={24} weight={700} color={C.accentStrong} opacity={appear(frame, T.label)}>
        Điểm dễ bị bỏ qua nhất
      </SvgText>
    </Scene>
  );
}
