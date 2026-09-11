import React from 'react';
import { SvgText } from '../../../../components/index.js';
import { C, appear, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';

/*
 * Câu 15 — what the day needs: "Kiến thức kỹ thuật sâu" is shown first and dims to the back once it is
 * said not to be required; the two needed skills rise in front (green = what is needed).
 */
const N = 15;
const T = {
  tech: spokenAt(N, 'kiến thức kỹ thuật sâu') - 10,
  dim: [spokenAt(N, 'điều cần có') - 10, spokenAt(N, 'điều cần có') + 20],
  ask: spokenAt(N, 'đặt câu hỏi') - 10,
  observe: spokenAt(N, 'quan sát một quy trình thật') - 10,
};
const tech = { x: 660, y: 310, w: 600, h: 130 };

export default function S15() {
  const frame = useFrame();
  const dim = smooth(frame, T.dim[0], T.dim[1]);
  const a1 = appear(frame, T.ask);
  const a2 = appear(frame, T.observe);
  return (
    <Scene n={N} frame={frame}>
      <RoleCard {...tech} tone="neutral" dashed={dim > 0.5} label="KHÔNG ĐÒI HỎI" lines={['Kiến thức kỹ thuật sâu']} size={28} opacity={appear(frame, T.tech)} muted={dim} />
      {dim > 0.5 ? <line x1={tech.x + 150} y1={tech.y + 84} x2={tech.x + tech.w - 150} y2={tech.y + 84} stroke={C.textMuted} strokeWidth={3} opacity={0.36 * (dim - 0.5) * 2} /> : null}
      <RoleCard x={220} y={640 - 60 * a1} w={680} h={190} tone="job" label="CẦN CÓ" lines={['Đặt câu hỏi']} size={34} opacity={a1} />
      <RoleCard x={1020} y={640 - 60 * a2} w={680} h={190} tone="job" label="CẦN CÓ" lines={['Quan sát', 'một quy trình thật']} size={34} opacity={a2} />
      <SvgText x={960} y={930} size={22} weight={600} color={C.textMuted} opacity={appear(frame, T.observe + 30)}>
        Đặt câu hỏi · Quan sát
      </SvgText>
    </Scene>
  );
}
