import React from 'react';
import { DayMap, SceneFrame } from '../../../../components/index.js';
import { appear, linearProgress, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { EYEBROW, ZONES, captionsFor, cue, footerFor } from './shared.jsx';

/*
 * Câu 03 — the day map opens: three cards, one per question, revealed as each is spoken. No answers
 * (the six parts stay hidden until câu 04 docks the map).
 */
const N = 3;
const Z = [spokenAt(N, 'xác định') - 6, spokenAt(N, 'chọn cách') - 6, spokenAt(N, 'kiểm tra') - 6];
const T = { zones: Z, links: [[Z[1] - 4, Z[1] + 22], [Z[2] - 4, Z[2] + 22]] };

export default function S03() {
  const frame = useFrame();
  const c = cue(N);
  return (
    <SceneFrame frame={frame} eyebrow={EYEBROW} title={c.title} footer={footerFor(N)} captions={captionsFor(N)}>
      <DayMap
        zones={ZONES}
        dock={0}
        reveal={T.zones.map((t) => appear(frame, t))}
        arrows={T.links.map(([a, b]) => linearProgress(frame, a, b))}
      />
    </SceneFrame>
  );
}
