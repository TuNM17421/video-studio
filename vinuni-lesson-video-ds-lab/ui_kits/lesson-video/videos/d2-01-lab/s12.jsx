import React from 'react';
import { ChatWindow, Cross, DocumentSheet, Flow, Gate, gateStop, Pill } from '../../../../components/index.js';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';

/*
 * Câu 12 — the chatbot answers fast (typing at 60 cps) but the link is the guide of another class:
 * the path leads to "Hướng dẫn · Lớp B" (red cross) and stops at a blocked "ĐÚNG LỚP?" gate before
 * the green "Nơi nộp · Lớp A". Speed without the right guide does not reach the result.
 */
const N = 12;
const WIN = { x: 110, y: 290, w: 640, h: 560 };
const DOC = { x: 900, y: 470, w: 200 };
const DOC_H = (168 * DOC.w) / 215;
const GATE = { x: 1360, y: DOC.y + DOC_H / 2, h: 164 };
const GOAL = { x: 1470, y: GATE.y - 90, w: 340, h: 180 };
const T = {
  ask: 8,
  reply: spokenAt(N, 'trả lời nhanh') - 4,
  fast: spokenAt(N, 'nhanh') + 6,
  link: [spokenAt(N, 'gửi nhầm') - 4, spokenAt(N, 'gửi nhầm') + 24],
  wrong: spokenAt(N, 'gửi nhầm') + 24,
  gate: [spokenAt(N, 'Lan vẫn chưa') - 10, spokenAt(N, 'Lan vẫn chưa') + 22],
  goal: 30,
};
const y0 = DOC.y + DOC_H / 2;

export default function S12() {
  const frame = useFrame();
  const wr = appear(frame, T.wrong);
  return (
    <Scene n={N} frame={frame}>
      <ChatWindow {...WIN} title="Trợ lý hội thoại" subtitle="Lan · học viên mới đang hỏi" illustrative={false} frame={frame} cps={60}
        messages={[
          { role: 'user', text: 'Em nộp bài 1 theo hướng dẫn nào ạ?', at: T.ask },
          { role: 'assistant', text: 'Bạn xem hướng dẫn nộp bài tại đây: Hướng dẫn · Lớp B', at: T.reply },
        ]} />
      <Pill x={WIN.x + WIN.w - 200} y={WIN.y + WIN.h + 22} w={200} h={40} size={16} label="TRẢ LỜI NHANH" opacity={appear(frame, T.fast)} />
      <RoleCard {...GOAL} tone="job" label="KẾT QUẢ CẦN THIẾT" lines={['Nơi nộp · Lớp A', 'lớp của Lan']} size={25} opacity={appear(frame, T.goal)} />
      <DocumentSheet {...DOC} label="Hướng dẫn · Lớp B" detail="lớp khác" opacity={appear(frame, T.link[1] - 10)} selected={wr > 0.5} />
      {frame >= T.link[0] ? <Flow points={[{ x: WIN.x + WIN.w + 6, y: y0 }, { x: DOC.x - 6, y: y0 }]} frame={frame} start={T.link[0]} end={T.link[1]} /> : null}
      <Cross x={DOC.x + DOC.w / 2} y={DOC.y + DOC_H / 2 + 6} size={48} opacity={wr} />
      <Gate {...GATE} label="ĐÚNG LỚP?" state="blocked" frame={frame} at={T.gate[1]} opacity={appear(frame, T.gate[0] - 12)} />
      {frame >= T.gate[0] ? <Flow points={[{ x: DOC.x + DOC.w + 6, y: y0 }, gateStop(GATE, 'left')]} frame={frame} start={T.gate[0]} end={T.gate[1]} /> : null}
    </Scene>
  );
}
