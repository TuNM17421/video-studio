import React from 'react';
import { StaticPath } from '../../../../components/index.js';
import { ROLE, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';
import { BotA, QUESTION_ZONES, RequestPill } from './v2-pC.jsx';

/*
 * Câu 21 — what the name does not say: three empty amber zones open around the chatbot, one per
 * question, each on its words (ai sẽ dùng · vướng ở đâu · tham gia công việc nào).
 */
const N = 21;
const SAY = [spokenAt(N, 'ai sẽ dùng'), spokenAt(N, 'họ đang vướng'), spokenAt(N, 'chatbot cần tham gia')];
const T = { zones: SAY.map((t) => t - 8) };

export default function S21() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <RequestPill />
      {QUESTION_ZONES.map((z, i) => {
        const o = appear(frame, T.zones[i]);
        return (
          <g key={i}>
            <StaticPath points={[z.from, z.to]} color={ROLE.amber} strokeWidth={3} dashed opacity={o} />
            <RoleCard x={z.x} y={z.y} w={z.w} h={z.h} tone="unknown" dashed lines={[z.text]} size={28} opacity={o} hot={pulse(frame, T.zones[i] + 6)} />
          </g>
        );
      })}
      <BotA />
    </Scene>
  );
}
