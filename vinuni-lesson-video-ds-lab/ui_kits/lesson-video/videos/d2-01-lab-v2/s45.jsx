import React from 'react';
import { Flow, SvgText } from '../../../../components/index.js';
import { C, appear, pulse, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { BOARD, RoleCard, Scene, ToneLabel } from './shared.jsx';
import { WorkflowBoard } from './v2-pF.jsx';

/*
 * Câu 45 — one tracking card at the end of each workflow. The two cards carry DIFFERENT marks (a dial
 * vs. rising bars) and no name or value — the slide only says the metrics differ. The word METRIC
 * appears only after "metric, tức là chỉ số …" has been said; at "các chỉ số khác nhau" both cards
 * pulse and a ≠ sits between them.
 */
const N = 45;
const T = {
  board: 0,
  cards: spokenAt(N, 'một metric') - 4,
  flows: [spokenAt(N, 'một metric') - 20, spokenAt(N, 'một metric') + 6],
  label: spokenAt(N, 'theo dõi và đánh giá') - 4,
  differ: spokenAt(N, 'các đối tượng khác nhau') - 4,
  metrics: spokenAt(N, 'các chỉ số khác nhau') - 4,
};
const CB = { ...BOARD, y: 330, h: 600, w: 1400, headerW: 200 };
const SW = 250;
const SH = 104;
const stepBox = (lane, i) => {
  const bodyX = CB.x + CB.headerW + 30;
  const gap = (CB.w - CB.headerW - 60 - 4 * SW) / 3;
  const laneH = CB.h / 2;
  return { x: bodyX + i * (SW + gap), y: CB.y + lane * laneH + (laneH - SH) / 2, w: SW, h: SH };
};
const CARD_W = 300;
const CARD_H = 190;
const cards = [0, 1].map((lane) => ({ x: 1530, y: CB.y + lane * (CB.h / 2) + (CB.h / 2 - CARD_H) / 2, w: CARD_W, h: CARD_H }));

function Dial({ cx, cy, t }) {
  const r = 52;
  const a = Math.PI * (1 - 0.72 * t);
  return (
    <g>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={C.dotInactive} strokeWidth={10} strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(a)} ${cy - r * Math.sin(a)}`} fill="none" stroke={C.accentStrong} strokeWidth={10} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={cx + (r - 14) * Math.cos(a)} y2={cy - (r - 14) * Math.sin(a)} stroke={C.text} strokeWidth={4} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill={C.text} />
    </g>
  );
}
function Bars({ cx, cy, t }) {
  const hs = [28, 48, 70];
  return (
    <g>
      <line x1={cx - 60} y1={cy} x2={cx + 60} y2={cy} stroke={C.dotInactive} strokeWidth={4} />
      {hs.map((h, i) => (
        <rect key={i} x={cx - 50 + i * 38} y={cy - h * t} width={24} height={h * t} rx={5} fill={i === 2 ? C.accentStrong : C.accent} />
      ))}
    </g>
  );
}

export default function S45() {
  const frame = useFrame();
  const oc = appear(frame, T.cards);
  const t = smooth(frame, T.cards, T.cards + 40);
  const hot = pulse(frame, T.metrics);
  return (
    <Scene n={N} frame={frame}>
      <WorkflowBoard b={CB} stepBox={stepBox} size={20} opacity={appear(frame, T.board, 12)} />
      {[0, 1].map((lane) => {
        const last = stepBox(lane, 3);
        return frame >= T.flows[0] ? (
          <Flow
            key={lane}
            points={[{ x: last.x + last.w + 8, y: last.y + last.h / 2 }, { x: cards[lane].x - 8, y: last.y + last.h / 2 }]}
            frame={frame}
            start={T.flows[0]}
            end={T.flows[1]}
            strokeWidth={4}
            hideIn={[last, cards[lane]]}
          />
        ) : null;
      })}
      {cards.map((c, lane) => (
        <RoleCard key={lane} {...c} tone="metric" hot={hot} opacity={oc}>
          {lane === 0 ? <Dial cx={c.x + c.w / 2} cy={c.y + 128} t={t} /> : <Bars cx={c.x + c.w / 2} cy={c.y + 150} t={t} />}
          <SvgText x={c.x + 24} y={c.y + 34} size={17} weight={700} anchor="start" color={C.accentStrong} opacity={appear(frame, T.label)} letterSpacing={1.2}>
            {lane === 0 ? 'THEO DÕI · BÊN NGOÀI' : 'THEO DÕI · NỘI BỘ'}
          </SvgText>
        </RoleCard>
      ))}
      <ToneLabel x={1440} y={306} tone="metric" opacity={appear(frame, T.label)}>
        METRIC · chỉ số theo dõi kết quả
      </ToneLabel>
      <g opacity={appear(frame, T.differ) < 1 ? appear(frame, T.differ) : undefined}>
        <circle cx={1680} cy={CB.y + CB.h / 2} r={28} fill={C.bg} stroke={C.accentStrong} strokeWidth={3} />
        <SvgText x={1680} y={CB.y + CB.h / 2 + 13} size={36} weight={700} color={C.accentStrong}>
          ≠
        </SvgText>
      </g>
    </Scene>
  );
}
