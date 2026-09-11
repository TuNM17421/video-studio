import React from 'react';
import { Flow, SvgText } from '../../../../components/index.js';
import { C, anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';

/*
 * Câu 07 — a vaguely described pain point (dashed orange) is structured into three cards: HIỆN TRẠNG ·
 * MỤC TIÊU · CÁCH ĐO, each on its word; their explanations follow the second half of the sentence.
 * No values are written in: the day teaches the structure, not a measurement.
 */
const N = 7;
const SAY = [spokenAt(N, 'hiện trạng'), spokenAt(N, 'mục tiêu'), spokenAt(N, 'cách đo')];
const SUB = [spokenAt(N, 'những gì đang có'), spokenAt(N, 'điều cần đạt tới'), spokenAt(N, 'cách kiểm chứng')];
const T = {
  blob: spokenAt(N, 'một điểm đau') - 8,
  flows: SAY.map((t) => [t - 22, t - 2]),
  cards: SAY.map((t) => t - 20),
  vague: spokenAt(N, 'mô tả chung chung') - 4,
  subs: SUB.map((t) => t - 6),
};
const BLOB = { x: 660, y: 340, w: 600, h: 140 };
const CARDS = [
  { x: 150, y: 620, w: 480, h: 230, tone: 'user', label: 'HIỆN TRẠNG', sub: ['những gì', 'đang có'] },
  { x: 720, y: 620, w: 480, h: 230, tone: 'job', label: 'MỤC TIÊU', sub: ['điều cần', 'đạt tới'] },
  { x: 1290, y: 620, w: 480, h: 230, tone: 'metric', label: 'CÁCH ĐO', sub: ['cách', 'kiểm chứng'] },
];

export default function S07() {
  const frame = useFrame();
  const v = appear(frame, T.vague, 18);
  return (
    <Scene n={N} frame={frame}>
      <RoleCard {...BLOB} tone="problem" dashed label="ĐIỂM ĐAU" opacity={appear(frame, T.blob)}>
        <SvgText x={960} y={BLOB.y + 96} size={30} weight={600} color={C.textMuted}>
          mô tả chung chung
        </SvgText>
        {v > 0.001 ? <line x1={808} y1={BLOB.y + 86} x2={808 + 304 * v} y2={BLOB.y + 86} stroke={C.red} strokeWidth={4} strokeLinecap="round" /> : null}
      </RoleCard>
      {CARDS.map((c, i) => {
        const bx = anchor(BLOB, 'bottom', [0.2, 0.5, 0.8][i]);
        const tx = anchor(c, 'top');
        return (
          <Flow
            key={`f${i}`}
            points={[bx, { x: bx.x, y: 550 }, { x: tx.x, y: 550 }, tx]}
            frame={frame}
            start={T.flows[i][0]}
            end={T.flows[i][1]}
            hideIn={[BLOB, c]}
          />
        );
      })}
      {CARDS.map((c, i) => {
        const s = appear(frame, T.subs[i]);
        return (
          <RoleCard key={i} x={c.x} y={c.y} w={c.w} h={c.h} tone={c.tone} opacity={appear(frame, T.cards[i])} hot={pulse(frame, T.flows[i][1])}>
            <SvgText x={c.x + c.w / 2} y={c.y + 88} size={36} weight={700} color={C.text} letterSpacing={1}>
              {c.label}
            </SvgText>
            <SvgText x={c.x + c.w / 2} y={c.y + 150} size={26} weight={600} color={C.textMuted} opacity={s}>
              {c.sub[0]}
            </SvgText>
            <SvgText x={c.x + c.w / 2} y={c.y + 186} size={26} weight={600} color={C.textMuted} opacity={s}>
              {c.sub[1]}
            </SvgText>
          </RoleCard>
        );
      })}
    </Scene>
  );
}
