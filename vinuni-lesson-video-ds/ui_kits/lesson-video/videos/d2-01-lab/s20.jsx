import React from 'react';
import { Flow, SvgText } from '../../../../components/index.js';
import { C, anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Lan, RoleCard, Scene } from './shared.jsx';

/*
 * Câu 20 — hỏi việc đã xảy ra. The interview card asks where Lan looked first; a flow connects the
 * question to her actual chain of actions, and the first step is lit: điều thực sự xảy ra. MINH HỌA.
 */
const N = 20;
const T = {
  card: spokenAt(N, 'mình hỏi Lan') - 8,
  chain: spokenAt(N, 'ở đâu trước tiên') - 10,
  flow: [spokenAt(N, 'để biết') - 10, spokenAt(N, 'để biết') + 12],
  real: spokenAt(N, 'điều thực sự') - 4,
};
const Q = { x: 480, y: 300, w: 1060, h: 160 };
const CHIPS = ['1 · Trang bài học', '2 · Tài liệu', '3 · Hộp thư'].map((l, i) => ({ x: 480 + i * 380, y: 660, w: 300, h: 110, l }));

export default function S20() {
  const frame = useFrame();
  const c0 = CHIPS[0];
  return (
    <Scene n={N} frame={frame}>
      <RoleCard {...Q} tone="user" label="PHIẾU PHỎNG VẤN · MINH HỌA" lines={['“Bạn đã tìm hướng dẫn ở đâu trước tiên?”']} size={32} opacity={appear(frame, T.card)} />
      <Lan x={240} y={715} opacity={appear(frame, T.chain - 8)} />
      <SvgText x={860} y={630} size={18} weight={700} anchor="start" color={C.accentStrong} letterSpacing={1.2} opacity={appear(frame, T.chain)}>
        CHUỖI THAO TÁC CỦA LAN
      </SvgText>
      {CHIPS.map((c, i) => (
        <RoleCard key={c.l} x={c.x} y={c.y} w={c.w} h={c.h} tone="user" lines={[c.l]} size={24} hot={i === 0 ? pulse(frame, T.flow[1]) : 0} muted={i > 0 ? appear(frame, T.real) * 0.6 : 0} opacity={appear(frame, T.chain + i * 8)} />
      ))}
      {[0, 1].map((i) => (
        <SvgText key={i} x={CHIPS[i].x + CHIPS[i].w + 40} y={CHIPS[i].y + 66} size={34} weight={700} color={C.accent} opacity={appear(frame, T.chain + i * 8 + 8)}>
          →
        </SvgText>
      ))}
      <Flow points={[{ x: c0.x + c0.w / 2, y: Q.y + Q.h }, anchor(c0, 'top')]} frame={frame} start={T.flow[0]} end={T.flow[1]} hideIn={[Q, c0]} />
      <SvgText x={c0.x + c0.w / 2} y={c0.y + c0.h + 50} size={24} weight={700} color={C.accentStrong} opacity={appear(frame, T.real)}>
        điều thực sự xảy ra
      </SvgText>
    </Scene>
  );
}
