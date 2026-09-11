import React from 'react';
import { Card, DocumentSheet, Flow, Pill, SvgText } from '../../../../components/index.js';
import { C, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { PartScene } from './shared.jsx';

/*
 * Câu 15 — the finished description branches into three equal options, each with an empty "LÝ DO" box
 * (the reason is written in the lesson, not here). The two considerations appear as pills under the
 * document. No branch is highlighted or chosen.
 */
const N = 15;
const SAY = [spokenAt(N, 'đi tiếp'), spokenAt(N, 'chuẩn bị thêm'), spokenAt(N, 'dừng đề xuất')]; // 40, 60, 100
const T = {
  doc: 6,
  flows: SAY.map((t) => [t - 14, t + 12]),
  cards: SAY.map((t) => t - 8),
  benefit: spokenAt(N, 'lợi ích dự kiến') - 6, // 144
  risk: spokenAt(N, 'kiểm soát rủi ro') - 6, // 214
};
const DOC = { x: 150, y: 470, w: 230 };
const DOC_H = (168 * DOC.w) / 215;
const OPTIONS = ['ĐI TIẾP', 'CHUẨN BỊ THÊM', 'DỪNG ĐỀ XUẤT'];
const CARD_W = 340;
const cards = OPTIONS.map((_, i) => ({ x: 690 + i * 390, y: 490, w: CARD_W, h: 120 }));
const reasons = cards.map((c) => ({ x: c.x, y: c.y + c.h + 40, w: c.w, h: 150 }));
const RAIL_Y = 446;
const JX = 540;

export default function S15() {
  const frame = useFrame();
  const out = { x: DOC.x + DOC.w + 10, y: DOC.y + DOC_H / 2 };
  return (
    <PartScene n={N} frame={frame}>
      <DocumentSheet x={DOC.x} y={DOC.y} w={DOC.w} label="Bản mô tả hoàn chỉnh" opacity={appear(frame, T.doc)} />
      {cards.map((c, i) => (
        <Flow
          key={i}
          points={[out, { x: JX, y: out.y }, { x: JX, y: RAIL_Y }, { x: c.x + c.w / 2, y: RAIL_Y }, { x: c.x + c.w / 2, y: c.y }]}
          frame={frame}
          start={T.flows[i][0]}
          end={T.flows[i][1]}
          hideIn={[c]}
        />
      ))}
      {cards.map((c, i) => (
        <g key={i}>
          <Card {...c} label="HƯỚNG ĐI" lines={[OPTIONS[i]]} size={28} opacity={appear(frame, T.cards[i])} active={pulse(frame, T.flows[i][1])} />
          <g opacity={appear(frame, T.cards[i] + 10)}>
            <rect x={reasons[i].x} y={reasons[i].y} width={reasons[i].w} height={reasons[i].h} rx={18} fill={C.bg} stroke={C.accent} strokeWidth={2} strokeDasharray="12 10" />
            <SvgText x={reasons[i].x + 24} y={reasons[i].y + 34} size={17} weight={700} anchor="start" color={C.accent} letterSpacing={1.2}>
              LÝ DO
            </SvgText>
          </g>
        </g>
      ))}
      <SvgText x={DOC.x + DOC.w / 2 + 20} y={790} size={20} weight={600} color={C.textMuted} opacity={appear(frame, T.benefit)}>
        dựa vào
      </SvgText>
      <Pill x={DOC.x - 30} y={812} w={330} label="LỢI ÍCH DỰ KIẾN" opacity={appear(frame, T.benefit)} />
      <Pill x={DOC.x - 30} y={878} w={330} label="KIỂM SOÁT RỦI RO" opacity={appear(frame, T.risk)} />
    </PartScene>
  );
}
