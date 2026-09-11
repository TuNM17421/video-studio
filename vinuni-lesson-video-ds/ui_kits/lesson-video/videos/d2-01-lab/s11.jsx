import React from 'react';
import { BrowserFrame, Cross, Flow, SvgText } from '../../../../components/index.js';
import { C, appear, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Lan, RoleCard, Scene } from './shared.jsx';

/*
 * Câu 11 — Lan's three steps on the course page. The chatbot card first covers the middle step (a team
 * busy building the chatbot does not look there); it slides out below the window on "bỏ qua chỗ…",
 * revealing where Lan picks the wrong class (orange step + red cross).
 */
const N = 11;
const WIN = { x: 330, y: 290, w: 1480, h: 500 };
const STEP_W = 380;
const STEP_H = 160;
const STEP_Y = 470;
const STEPS = [
  { x: 420, lines: ['1 · MỞ BÀI TẬP'] },
  { x: 880, lines: ['2 · CHỌN HƯỚNG DẪN', 'cho lớp của mình'] },
  { x: 1340, lines: ['3 · NỘP BÀI'] },
].map((s) => ({ ...s, y: STEP_Y, w: STEP_W, h: STEP_H }));
const T = {
  steps: 10,
  bot: spokenAt(N, 'xây phần mềm') - 6,
  flows: [30, 56],
  slide: [spokenAt(N, 'bỏ qua chỗ') - 4, spokenAt(N, 'bỏ qua chỗ') + 30],
  wrong: spokenAt(N, 'không tìm được') - 4,
};
const cover = { x: STEPS[1].x - 16, y: STEPS[1].y - 16, w: STEP_W + 32, h: STEP_H + 32 };
const aside = { x: 880, y: 815, w: STEP_W + 32, h: 130 };

export default function S11() {
  const frame = useFrame();
  const s = smooth(frame, T.slide[0], T.slide[1]);
  const bot = { x: cover.x + (aside.x - cover.x) * s, y: cover.y + (aside.y - cover.y) * s, w: cover.w, h: cover.h + (aside.h - cover.h) * s };
  const wr = appear(frame, T.wrong);
  const mid = (i) => STEPS[i].y + STEP_H / 2;
  return (
    <Scene n={N} frame={frame}>
      <Lan x={180} y={540} r={58} />
      <BrowserFrame {...WIN} title="Bài tập 1" url="khoahoc.truong.edu.vn/bai-tap-1" illustrative={false} opacity={appear(frame, 0)}>
        {STEPS.map((st, i) => (
          <RoleCard key={i} {...st} tone={i === 1 && wr > 0.5 ? 'problem' : 'neutral'} lines={st.lines} size={25} opacity={appear(frame, T.steps + i * 6)} hot={i === 1 ? wr * (1 - appear(frame, T.wrong + 30, 30)) : 0} />
        ))}
        {[0, 1].map((i) => (
          <Flow key={i} points={[{ x: STEPS[i].x + STEP_W, y: mid(i) }, { x: STEPS[i + 1].x, y: mid(i) }]} frame={frame} start={T.flows[0] + i * 12} end={T.flows[1] + i * 12} hideIn={[STEPS[i], STEPS[i + 1]]} />
        ))}
        <g opacity={wr < 1 ? wr : undefined}>
          <Cross x={STEPS[1].x + 40} y={STEPS[1].y + STEP_H + 40} size={34} />
          <SvgText x={STEPS[1].x + STEP_W / 2} y={STEPS[1].y + STEP_H + 50} size={25} weight={700} color={C.red}>chọn nhầm lớp</SvgText>
        </g>
      </BrowserFrame>
      <RoleCard {...bot} tone="solution" label="PHẦN MỀM TRÒ CHUYỆN" lines={['Trợ lý hội thoại']} size={26} opacity={appear(frame, T.bot)} />
    </Scene>
  );
}
