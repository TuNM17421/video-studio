import React from 'react';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene } from './shared.jsx';
import { BotA, RequestPill } from './v2-pC.jsx';

/*
 * Câu 19 — the familiar request: the chatbot block lands at the center, then the request pill names it.
 * Layout A (chatbot at the center) holds through câu 23.
 */
const N = 19;
const T = {
  bot: 6,
  request: spokenAt(N, 'xây một chatbot AI') - 8,
};

export default function S19() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <RequestPill opacity={appear(frame, T.request)} />
      <BotA opacity={appear(frame, T.bot)} hot={pulse(frame, T.request + 6)} />
    </Scene>
  );
}
