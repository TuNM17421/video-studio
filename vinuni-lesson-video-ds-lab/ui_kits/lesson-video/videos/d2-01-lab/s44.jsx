import React from 'react';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Board } from './p6-shared.jsx';
import { Scene } from './shared.jsx';

/*
 * Câu 44 — the fourth question is filled (green: desired result) and an orange consequence zone opens
 * with three illustrative email errors.
 */
const N = 44;
const T = {
  result: spokenAt(N, 'kết quả mong muốn') - 6,
  conseq: spokenAt(N, 'hậu quả') - 6,
  emails: spokenAt(N, 'gửi thư điện tử sai') - 8,
};

export default function S44() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <Board
        frame={frame}
        zoneLabel="GIẢI PHÁP · CHƯA CHỌN"
        fills={[1, 1, 1, appear(frame, T.result)]}
        hots={[0, 0, 0, pulse(frame, T.result + 4)]}
        conseqIn={appear(frame, T.conseq)}
        emailIn={[0, 1, 2].map((i) => appear(frame, T.emails + i * 10))}
      />
    </Scene>
  );
}
