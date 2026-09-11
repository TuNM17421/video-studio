import React from 'react';
import { appear, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene, ToneLabel } from './shared.jsx';
import { BotA, RequestPill } from './v2-pC.jsx';

/*
 * Câu 20 — the request sounds complete because it names a solution shape: the chatbot outline glows
 * (purple, its own hue) and stays lit; a small label says what was named.
 */
const N = 20;
const T = {
  glow: spokenAt(N, 'đã gọi tên') - 10,
  label: spokenAt(N, 'hình hài giải pháp') - 8,
};

export default function S20() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <RequestPill />
      <BotA hot={smooth(frame, T.glow, T.glow + 20)} />
      <ToneLabel x={960} y={710} tone="solution" anchor="middle" opacity={appear(frame, T.label)}>
        ĐÃ GỌI TÊN MỘT HÌNH HÀI GIẢI PHÁP
      </ToneLabel>
    </Scene>
  );
}
