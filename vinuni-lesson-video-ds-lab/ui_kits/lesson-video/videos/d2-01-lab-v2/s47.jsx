import React from 'react';
import { Flow, Gate, StaticPath, gateStop } from '../../../../components/index.js';
import { C, ROLE, appear, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { ChatbotBlock, RoleCard, Scene, ToneLabel } from './shared.jsx';
import { MiniBoard } from './v2-pG.jsx';

/*
 * Câu 47 — starting from the solution: the arrow leaves the chatbot and hits a warning gate before it
 * can reach the still-empty pain-point zone → the problem is not ready.
 */
const N = 47;
const T = {
  boardOut: 0,
  bot: spokenAt(N, 'bắt đầu từ giải pháp') - 8,
  pain: spokenAt(N, 'điểm đau') - 8,
  run: spokenAt(N, 'thay vì') - 4,
  sign: spokenAt(N, 'dấu hiệu') - 6,
};
T.hit = Math.max(T.run + 40, T.sign - 4);
const Y = 600;
const bot = { x: 170, y: Y - 70, w: 340, h: 140 };
const pain = { x: 1320, y: Y - 130, w: 460, h: 260 };
const gate = { x: 930, y: Y, h: 150 };

export default function S47() {
  const frame = useFrame();
  const stop = gateStop(gate, 'left');
  return (
    <Scene n={N} frame={frame}>
      <MiniBoard opacity={1 - appear(frame, T.boardOut, 16)} stepsMuted={0.5} />
      <ChatbotBlock {...bot} sub="giải pháp" opacity={appear(frame, T.bot)} />
      <RoleCard {...pain} tone="problem" dashed label="PAIN POINT" lines={['Còn trống']} size={30} opacity={appear(frame, T.pain)} />
      <StaticPath points={[gateStop(gate, 'right'), { x: pain.x - 12, y: Y }]} color={C.dotInactive} dashed opacity={appear(frame, T.hit)} />
      <Flow points={[{ x: bot.x + bot.w + 10, y: Y }, stop]} frame={frame} start={T.run} end={T.hit} color={ROLE.purple} hideIn={[bot]} />
      <Gate {...gate} state="error" label="CHƯA SẴN SÀNG" frame={frame} at={T.hit} opacity={appear(frame, T.run)} />
      <ToneLabel x={gate.x} y={Y + 190} anchor="middle" tone="problem" size={20} opacity={appear(frame, T.sign)}>
        DẤU HIỆU BÀI TOÁN CHƯA SẴN SÀNG
      </ToneLabel>
      <ToneLabel x={bot.x} y={bot.y - 26} tone="solution" opacity={appear(frame, T.bot + 10)}>
        BẮT ĐẦU TỪ ĐÂY
      </ToneLabel>
    </Scene>
  );
}
