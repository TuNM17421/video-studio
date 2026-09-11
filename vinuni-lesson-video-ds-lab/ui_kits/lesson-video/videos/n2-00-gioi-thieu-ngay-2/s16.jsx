import React from 'react';
import { DayMap, SceneFrame } from '../../../../components/index.js';
import { CLAMP, EASE, interpolate, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { CLOSING_ZONES, EYEBROW, captionsFor, cue, footerFor } from './shared.jsx';

/*
 * Câu 16 — back to the three cards, now carrying the questions the day answers. Each card lights once
 * as its question is spoken; no decision is shown. Final hold ≥ 100 f.
 */
const N = 16;
const T = {
  undock: [0, 40],
  pulses: [spokenAt(N, 'bài toán') - 4, spokenAt(N, 'AI nên') - 4, spokenAt(N, 'khi nào') - 4],
};

export default function S16() {
  const frame = useFrame();
  const c = cue(N);
  const dock = interpolate(frame, T.undock, [1, 0], { ...CLAMP, easing: EASE.inOut });
  return (
    <SceneFrame frame={frame} eyebrow={EYEBROW} title={c.title} footer={footerFor(N)} captions={captionsFor(N)}>
      <DayMap zones={CLOSING_ZONES} dock={dock} activePart={-1} visited={5} pulses={T.pulses.map((t) => pulse(frame, t, 64))} arrows={[1, 1]} />
    </SceneFrame>
  );
}
