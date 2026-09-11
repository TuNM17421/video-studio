import React from 'react';
import { Cross, Flow, Icon, Stopwatch, SvgText } from '../../../../components/index.js';
import { C, ROLE, anchor, appear, linearProgress, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';

/*
 * Câu 18 — hậu quả là gì? From the orange difficulty, three flows reach three consequences, each named
 * with WHO bears it (feedback: "ai chờ lâu?"): Lan chờ lâu · Lan nộp nhầm nơi · Dũng trả lời lại.
 */
const N = 18;
const say = [spokenAt(N, 'Lan phải chờ lâu'), spokenAt(N, 'nộp nhầm nơi'), spokenAt(N, 'Dũng phải trả lời lại')];
const T = {
  source: 6,
  cards: say.map((t) => t - 16),
  flows: say.map((t) => [t - 14, t + 10]),
};
const SRC = { x: 160, y: 530, w: 480, h: 150 };
const CARDS = [
  { x: 1100, y: 300, w: 660, h: 150, lines: ['Lan chờ lâu', 'chờ hỗ trợ trả lời'] },
  { x: 1100, y: 530, w: 660, h: 150, lines: ['Lan nộp nhầm nơi', 'nộp vào mục của lớp khác'] },
  { x: 1100, y: 760, w: 660, h: 150, lines: ['Dũng trả lời lại', 'cùng câu hỏi, nhiều lần'] },
];
const JX = 820;

export default function S18() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <RoleCard {...SRC} tone="problem" label="KHÓ KHĂN" lines={['Khó tìm đúng', 'hướng dẫn']} size={30} opacity={appear(frame, T.source)} />
      {CARDS.map((c, i) => {
        const a = anchor(SRC, 'right');
        const b = anchor(c, 'left');
        return (
          <Flow
            key={`f${i}`}
            points={[a, { x: JX, y: a.y }, { x: JX, y: b.y }, b]}
            frame={frame}
            start={T.flows[i][0]}
            end={T.flows[i][1]}
            color={ROLE.orange}
            hideIn={[SRC, c]}
          />
        );
      })}
      {CARDS.map((c, i) => {
        const o = appear(frame, T.cards[i]);
        const ix = c.x + 90;
        const iy = c.y + c.h / 2;
        return (
          <RoleCard key={i} x={c.x} y={c.y} w={c.w} h={c.h} tone="problem" opacity={o} hot={pulse(frame, T.flows[i][1])}>
            {i === 0 ? <Stopwatch x={ix} y={iy + 6} r={44} sweep={linearProgress(frame, T.cards[0], T.cards[0] + 120) * 0.8} color={ROLE.orange} /> : null}
            {i === 1 ? (
              <g>
                <Icon name="document" x={ix} y={iy} size={70} color={ROLE.orange} />
                <Cross x={ix + 34} y={iy + 30} size={30} strokeWidth={6} color={C.red} />
              </g>
            ) : null}
            {i === 2 ? (
              <g>
                <Icon name="mail" x={ix - 10} y={iy - 8} size={54} color={ROLE.orange} />
                <Icon name="mail" x={ix + 10} y={iy + 12} size={54} color={ROLE.orange} />
              </g>
            ) : null}
            <SvgText x={c.x + 170} y={c.y + 70} size={30} weight={700} anchor="start">
              {c.lines[0]}
            </SvgText>
            <SvgText x={c.x + 170} y={c.y + 110} size={22} weight={600} anchor="start" color={C.textMuted}>
              {c.lines[1]}
            </SvgText>
          </RoleCard>
        );
      })}
    </Scene>
  );
}
