import React from 'react';
import { Flow, SvgText } from '../../../../components/index.js';
import { C, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt, speechEnd } from './cues.js';
import { BOT, GOAL, GOAL_LINES, LAN, PATH } from './p2-shared.jsx';
import { Lan, RoleCard, Scene } from './shared.jsx';

/*
 * Câu 07 — the job Lan wants done: one path from Lan to a green goal card. The proposed chatbot card
 * (purple, dashed) appears afterwards OFF that path: it is not part of the job itself.
 */
const N = 7;
const T = {
  lan: 4,
  goal: spokenAt(N, 'gửi đúng bài') - 8,
  flow: [spokenAt(N, 'gửi đúng bài') - 2, spokenAt(N, 'trước thời hạn') + 4],
  bot: speechEnd(N) - 10,
};

export default function S07() {
  const frame = useFrame();
  const ob = appear(frame, T.bot);
  return (
    <Scene n={N} frame={frame}>
      <Lan {...LAN} opacity={appear(frame, T.lan)} />
      <RoleCard {...GOAL} tone="job" label="CÔNG VIỆC CẦN HOÀN THÀNH" lines={GOAL_LINES} size={28} opacity={appear(frame, T.goal)} hot={pulse(frame, T.flow[1])} />
      {frame >= T.flow[0] ? <Flow points={PATH} frame={frame} start={T.flow[0]} end={T.flow[1]} color={C.accent} /> : null}
      <RoleCard {...BOT} tone="solution" dashed label="ĐỀ NGHỊ" lines={['Trợ lý hội thoại']} size={26} opacity={ob} muted={0.35} />
      <SvgText x={BOT.x + BOT.w / 2} y={BOT.y + BOT.h + 40} size={21} weight={600} color={C.textMuted} opacity={ob}>
        nằm ngoài đường từ Lan tới đích
      </SvgText>
    </Scene>
  );
}
