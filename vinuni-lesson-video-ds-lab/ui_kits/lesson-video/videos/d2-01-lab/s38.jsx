import React from 'react';
import { Chip, Flow, SvgText } from '../../../../components/index.js';
import { C, appear, interpolate, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt, speechEnd } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';

/*
 * Câu 38 — the desired outcome, one card per person (green), merged into "ĐIỀU NHÓM MUỐN ĐẠT".
 * The machine-message count is not the goal: its chip is crossed out and dims.
 */
const N = 38;
const lan = { x: 180, y: 320, w: 660, h: 150 };
const dung = { x: 1080, y: 320, w: 660, h: 150 };
const goal = { x: 460, y: 640, w: 1000, h: 170 };
const CHIP = { x: 1520, y: 700, w: 290 };
const T = {
  lan: spokenAt(N, 'Lan tìm đúng') - 6,
  dung: spokenAt(N, 'Dũng bớt') - 6,
  merge: [spokenAt(N, 'những câu hỏi lặp lại'), spokenAt(N, 'những câu hỏi lặp lại') + 30],
  goal: spokenAt(N, 'những câu hỏi lặp lại') + 6,
  chip: spokenAt(N, 'Điều nhóm muốn đạt') + 10,
  cross: speechEnd(N) - 10,
};

export default function S38() {
  const frame = useFrame();
  const dim = interpolate(frame, [T.cross + 10, T.cross + 34], [1, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const joinY = 560;
  const into = { x: goal.x + goal.w / 2, y: goal.y };
  return (
    <Scene n={N} frame={frame}>
      <RoleCard {...lan} tone="job" label="LAN · HỌC VIÊN MỚI" lines={['Tìm đúng hướng dẫn dễ hơn']} size={28} opacity={appear(frame, T.lan)} />
      <RoleCard {...dung} tone="job" label="DŨNG · NHÂN VIÊN HỖ TRỢ" lines={['Bớt trả lời câu hỏi lặp lại']} size={28} opacity={appear(frame, T.dung)} />
      {[lan, dung].map((b, i) => (
        <Flow
          key={i}
          points={[{ x: b.x + b.w / 2, y: b.y + b.h }, { x: b.x + b.w / 2, y: joinY }, { x: into.x, y: joinY }, into]}
          frame={frame}
          start={T.merge[0]}
          end={T.merge[1]}
          hideIn={[lan, dung, goal]}
        />
      ))}
      <RoleCard {...goal} tone="job" label="ĐIỀU NHÓM MUỐN ĐẠT" lines={['Lan tìm đúng hướng dẫn dễ hơn', 'Dũng bớt trả lời lặp lại']} size={28} opacity={appear(frame, T.goal)} hot={pulse(frame, T.merge[1])} />
      <g opacity={appear(frame, T.chip) * dim}>
        <Chip x={CHIP.x} y={CHIP.y} w={CHIP.w} h={50} label="SỐ TIN NHẮN MÁY TẠO" tone="muted" size={17} />
      </g>
      <g opacity={appear(frame, T.cross)}>
        <path d={`M ${CHIP.x - 8} ${CHIP.y + 25} H ${CHIP.x + CHIP.w + 8}`} stroke={C.red} strokeWidth={4} strokeLinecap="round" />
        <SvgText x={CHIP.x + CHIP.w / 2} y={CHIP.y + 92} size={19} weight={700} color={C.red} letterSpacing={1.2}>BỎ · KHÔNG PHẢI ĐÍCH</SvgText>
      </g>
    </Scene>
  );
}
