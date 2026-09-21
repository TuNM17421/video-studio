import React from 'react';
import { Griffin } from '../../../../components/index.js';
import { useFrame } from '../../../../lib/index.js';
import { C } from '../../../../lib/tokens.js';
import { spokenAt } from './cues.js';
import { Headline, Scene } from './shared.jsx';

/*
 * Câu 08 — "Giờ thì đến lượt bạn thử rồi đó!"
 * Griffin giơ hai cánh reo vui và nhảy một nhịp ở "lượt bạn"; dòng mời hiện bên trái.
 */
const N = 8;
const T = {
  line: spokenAt(N, 'đến lượt') - 6,
  hop: spokenAt(N, 'lượt bạn'),
};

export default function S08() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <Headline frame={frame} at={[T.line, T.line + 8]} lines={[{ text: 'Đến lượt bạn!', color: C.red }, { text: 'Mở Video mới và thử ngay' }]} />
      <Griffin x={1320} y={930} h={580} frame={frame} pose="wings" mood="happy" hops={[T.hop]} prop={[{ at: T.hop, name: 'sparkle' }]} />
    </Scene>
  );
}
