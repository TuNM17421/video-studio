import React from 'react';
import { appear, useFrame } from '../../../../lib/index.js';
import { speechEnd } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';
import { Board, settledLanes } from './v2-pD.jsx';

/*
 * Câu 33 (n 33, short) — "đi sâu thêm một bước": the board leaves (opacity) and the three-zone layout
 * that câu 34–39 fill appears zone by zone, empty: TÌNH HUỐNG 1 · 2 · 3. Never both full at once.
 */
const N = 33;
export const ZONES = [
  { x: 90, y: 300, w: 560, h: 620 },
  { x: 680, y: 300, w: 560, h: 620 },
  { x: 1270, y: 300, w: 560, h: 620 },
];
const T = { out: 0, zones: [18, 30, 42], end: speechEnd(N) };

export default function S33() {
  const frame = useFrame();
  const bo = 1 - appear(frame, T.out, 18);
  return (
    <Scene n={N} frame={frame}>
      <Board frame={frame} lanes={settledLanes()} extras={{ upsell: 1, gate: { o: 1, state: 'open' }, esc: { o: 1 } }} opacity={bo} />
      {ZONES.map((z, i) => (
        <RoleCard key={i} {...z} tone="neutral" dashed label={`TÌNH HUỐNG ${i + 1}`} opacity={appear(frame, T.zones[i])} />
      ))}
    </Scene>
  );
}
