import React from 'react';
import { Flow, StaticPath, UIButton, uiButtonWidth } from '../../../../components/index.js';
import { C, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { BOT, GOAL, GOAL_LINES, LAN, PATH } from './p2-shared.jsx';
import { Lan, RoleCard, Scene } from './shared.jsx';

/*
 * Câu 08 — same layout as câu 07. A "Nộp đúng nơi" button sits on Lan's path; the chatbot only lights
 * up (loses its dashed, dimmed look) when its connector reaches that button: value = helping the job.
 */
const N = 8;
const T = {
  button: spokenAt(N, 'chỉ có ích') - 6,
  flow: [spokenAt(N, 'chỉ có ích'), spokenAt(N, 'hoàn thành') - 2],
};
const BW = uiButtonWidth('Nộp đúng nơi', { icon: 'send' });
const BTN = { x: BOT.x + BOT.w / 2 - BW / 2, y: PATH[0].y - 32, w: BW, h: 64 };
const botOut = { x: BOT.x + BOT.w / 2, y: BOT.y + BOT.h };

export default function S08() {
  const frame = useFrame();
  const lit = appear(frame, T.flow[1] - 4, 18);
  return (
    <Scene n={N} frame={frame}>
      <StaticPath points={PATH} color={C.accent} strokeWidth={5} />
      <Lan {...LAN} />
      <RoleCard {...GOAL} tone="job" label="CÔNG VIỆC CẦN HOÀN THÀNH" lines={GOAL_LINES} size={28} />
      <UIButton {...BTN} label="Nộp đúng nơi" icon="send" variant="secondary" opacity={appear(frame, T.button)} frame={frame} pressAt={T.flow[1]} />
      {frame >= T.flow[0] ? (
        <Flow points={[botOut, { x: botOut.x, y: BTN.y }]} frame={frame} start={T.flow[0]} end={T.flow[1]} hideIn={[BOT]} />
      ) : null}
      <RoleCard {...BOT} tone="solution" dashed={lit < 0.5} label="TRỢ LÝ HỘI THOẠI" lines={['Chỉ có ích khi', 'giúp Lan nộp đúng']} size={24} muted={0.35 * (1 - lit)} hot={pulse(frame, T.flow[1])} />
    </Scene>
  );
}
