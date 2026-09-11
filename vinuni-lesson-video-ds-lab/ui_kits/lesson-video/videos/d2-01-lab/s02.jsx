import React from 'react';
import { ChatWindow, SvgText } from '../../../../components/index.js';
import { C, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Dung, Lan, RoleCard, Scene, ToneLabel } from './shared.jsx';

/*
 * Câu 02 — the proposal becomes a concrete chat window (right, purple label = a solution) while the
 * box for the difficulty (left, orange dashed) stays empty: the name says nothing about what Lan is
 * stuck on. Characters keep their câu 01 spots.
 */
const N = 2;
const T = {
  chat: 4,
  msg1: 26,
  msg2: 50,
  name: spokenAt(N, 'trợ lý hội thoại') - 6,
  box: spokenAt(N, 'nhưng tên gọi') - 6,
  empty: spokenAt(N, 'học viên đang vướng') - 4,
};
const chat = { x: 1030, y: 360, w: 540, h: 440 };
const box = { x: 390, y: 400, w: 540, h: 360 };

export default function S02() {
  const frame = useFrame();
  const oBox = appear(frame, T.box);
  return (
    <Scene n={N} frame={frame}>
      <Lan x={250} y={560} />
      <Dung x={1670} y={560} />
      <ToneLabel x={chat.x + 10} y={chat.y - 22} tone="solution" opacity={appear(frame, T.name)}>
        TRỢ LÝ HỘI THOẠI · MỘT GIẢI PHÁP
      </ToneLabel>
      <ChatWindow
        {...chat}
        title="Trợ lý hội thoại"
        frame={frame}
        opacity={appear(frame, T.chat)}
        messages={[
          { role: 'user', text: 'Cho em hỏi về bài nộp ạ.', at: T.msg1 },
          { role: 'assistant', text: 'Mình có thể giúp gì cho bạn?', at: T.msg2 },
        ]}
      />
      <RoleCard {...box} tone="problem" dashed label="KHÓ KHĂN CẦN GIẢI QUYẾT" opacity={oBox} hot={pulse(frame, T.empty)} />
      <SvgText x={box.x + box.w / 2} y={box.y + box.h / 2 + 40} size={96} weight={700} color={C.red} opacity={oBox}>
        ?
      </SvgText>
      <SvgText x={box.x + box.w / 2} y={box.y + box.h - 36} size={24} weight={600} color={C.textMuted} opacity={appear(frame, T.empty)}>
        Học viên đang vướng điều gì?
      </SvgText>
    </Scene>
  );
}
