import React from 'react';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene } from './shared.jsx';
import { Chain, ZoneFrame } from './v2-pE.jsx';

/*
 * Câu 35 — tình huống 2: an internal chatbot. Support request → the chatbot looks up business
 * information → a draft reply. Zone 1 stays as it ended in câu 34.
 */
const N = 35;
const CHIP = spokenAt(N, 'tra cứu') - 8;
const DRAFT = spokenAt(N, 'nháp phản hồi') - 8;
const T = {
  title: spokenAt(N, 'chatbot phục vụ nội bộ') - 6,
  card: spokenAt(N, 'tiếp nhận') - 6,
  chip: CHIP,
  f1: [CHIP + 2, CHIP + 28],
  draft: DRAFT,
  f2: [DRAFT + 2, DRAFT + 28],
};

export default function S35() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <ZoneFrame z={0} title={1} />
      <ZoneFrame z={1} title={appear(frame, T.title)} hot={pulse(frame, T.title)} />
      <ZoneFrame z={2} />
      <Chain z={0} />
      <Chain
        z={1}
        frame={frame}
        vis={[appear(frame, T.card), appear(frame, T.chip), appear(frame, T.draft)]}
        flows={[T.f1, T.f2]}
        hot={[0, pulse(frame, T.f1[1]), pulse(frame, T.f2[1])]}
      />
    </Scene>
  );
}
