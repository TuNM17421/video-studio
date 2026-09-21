import React from 'react';
import { interpolate, CLAMP, EASE, useFrame } from '../../../../lib/index.js';
import { Griffin } from '../../../../components/index.js';
import { C } from '../../../../lib/tokens.js';
import { spokenAt } from './cues.js';
import { Headline, Scene } from './shared.jsx';

/*
 * Câu 01 — "Xin chào, mình là Griffin, linh vật của VinUni."
 * Griffin đi vào từ mép phải, dừng lại và vẫy cánh đúng lúc chào; tên hiện khi được đọc.
 */
const N = 1;
const T = {
  walk: [0, 22],
  wave: 24,
  name: spokenAt(N, 'Griffin') - 6,
  role: spokenAt(N, 'linh vật') - 6,
};

export default function S01() {
  const frame = useFrame();
  const x = interpolate(frame, T.walk, [2150, 1320], { ...CLAMP, easing: EASE.out });
  return (
    <Scene n={N} frame={frame}>
      <Headline frame={frame} at={[T.name, T.role]} lines={[{ text: 'Griffin', color: C.red }, { text: 'Linh vật VinUni' }]} />
      <Griffin
        x={x}
        y={930}
        h={560}
        frame={frame}
        pose={[{ at: 0, name: 'walk-left' }, { at: T.wave, name: 'wave' }]}
      />
    </Scene>
  );
}
