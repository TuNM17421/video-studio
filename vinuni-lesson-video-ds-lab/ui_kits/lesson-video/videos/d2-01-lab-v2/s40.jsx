import React from 'react';
import { StopGate } from '../../../../components/index.js';
import { appear, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';

/*
 * Câu 40 — the two problem descriptions of câu 39 hold; a stop sign drops between them at "dừng lại",
 * marking the spot that is easiest to get wrong.
 */
const N = 40;
const T = {
  cards: 0,
  stop: spokenAt(N, 'dừng lại') - 6,
  note: spokenAt(N, 'dễ nhầm nhất') - 6,
};
export const PROBLEM_CARDS = [
  { x: 200, y: 420, w: 580, h: 220, label: 'MÔ TẢ BÀI TOÁN · BÊN NGOÀI', lines: ['Khách hàng', 'bên ngoài'] },
  { x: 1140, y: 420, w: 580, h: 220, label: 'MÔ TẢ BÀI TOÁN · NỘI BỘ', lines: ['Nhân sự', 'nội bộ'] },
];

export default function S40() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      {PROBLEM_CARDS.map((c) => (
        <RoleCard key={c.label} {...c} tone="neutral" size={30} opacity={appear(frame, T.cards, 12)} />
      ))}
      <StopGate x={960} y={530} r={62} label="DỪNG" detail="chỗ dễ hiểu sai" frame={frame} at={T.note} opacity={appear(frame, T.stop)} />
    </Scene>
  );
}
