import React from 'react';
import { Flow, SvgText } from '../../../../components/index.js';
import { C, appear, interpolate, pulse, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { ChatbotBlock, RoleCard, Scene } from './shared.jsx';

/*
 * Câu 39 — one chatbot request, but not one problem description: a single "MÔ TẢ BÀI TOÁN" card under
 * the shared chatbot splits into BÊN NGOÀI and NỘI BỘ, each fed by its own connector, with "≠" between.
 * Card lines reuse câu 31's words for the two workflows.
 */
const N = 39;
const SPLIT = spokenAt(N, 'bên ngoài') - 4;
const T = {
  bot: spokenAt(N, 'cùng một yêu cầu') - 6,
  one: spokenAt(N, 'cùng một yêu cầu') + 8,
  split: [SPLIT, SPLIT + 30],
  flows: [SPLIT + 32, SPLIT + 60],
  neq: Math.max(spokenAt(N, 'không thể') - 4, SPLIT + 34),
};
const BOT = { x: 770, y: 290, w: 380, h: 110 };
const CARD_W = 720;
const CARD_Y = 560;
const CARD_H = 250;
const MID_X = 960 - CARD_W / 2;
const FINAL = [150, 1050];
const JOIN_Y = 480;

export default function S39() {
  const frame = useFrame();
  const s = smooth(frame, T.split[0], T.split[1]);
  const xs = FINAL.map((fx) => interpolate(s, [0, 1], [MID_X, fx]));
  const one = appear(frame, T.one) * (1 - appear(frame, T.split[0], 12));
  const two = appear(frame, T.split[0], 12);
  const boxes = xs.map((x) => ({ x, y: CARD_Y, w: CARD_W, h: CARD_H }));
  const bx = BOT.x + BOT.w / 2;
  const neq = appear(frame, T.neq);
  return (
    <Scene n={N} frame={frame}>
      <ChatbotBlock {...BOT} opacity={appear(frame, T.bot)} />
      {frame >= T.flows[0]
        ? boxes.map((b, i) => (
            <Flow
              key={i}
              points={[{ x: bx, y: BOT.y + BOT.h }, { x: bx, y: JOIN_Y }, { x: b.x + b.w / 2, y: JOIN_Y }, { x: b.x + b.w / 2, y: b.y }]}
              frame={frame}
              start={T.flows[0]}
              end={T.flows[1]}
              hideIn={[BOT, b]}
            />
          ))
        : null}
      <RoleCard x={MID_X} y={CARD_Y} w={CARD_W} h={CARD_H} label="MÔ TẢ BÀI TOÁN" lines={['Dùng chung một mô tả?']} size={30} opacity={one} />
      <RoleCard
        {...boxes[0]}
        tone="user"
        label="MÔ TẢ BÀI TOÁN · BÊN NGOÀI"
        lines={['Khách hàng bên ngoài', 'giải đáp · hỗ trợ mua hàng']}
        size={30}
        lineHeight={44}
        opacity={two}
        hot={pulse(frame, T.flows[1])}
      />
      <RoleCard
        {...boxes[1]}
        tone="metric"
        label="MÔ TẢ BÀI TOÁN · NỘI BỘ"
        lines={['Nhân sự nội bộ', 'yêu cầu hỗ trợ · tra cứu · soạn nháp']}
        size={30}
        lineHeight={44}
        opacity={two}
        hot={pulse(frame, T.flows[1])}
      />
      {neq > 0.001 ? (
        <g opacity={neq < 1 ? neq : undefined}>
          <circle cx={960} cy={CARD_Y + CARD_H / 2} r={40} fill={C.bg} stroke={C.red} strokeWidth={4} />
          <SvgText x={960} y={CARD_Y + CARD_H / 2 + 19} size={54} weight={700} color={C.red}>
            ≠
          </SvgText>
        </g>
      ) : null}
    </Scene>
  );
}
