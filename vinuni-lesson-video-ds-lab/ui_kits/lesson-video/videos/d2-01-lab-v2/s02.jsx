import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';
import { QuestionBoard } from './v2-pA.jsx';

/* Câu 02 — silent 3 s pause after câu 01: the final frame of câu 01 held exactly, no narration. */
const N = 2;

export default function S02() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <QuestionBoard frame={10000} />
    </Scene>
  );
}
