import React from 'react';
import { spokenAt } from './cues.js';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';
import { QuestionBoard } from './v2-pA.jsx';

/*
 * Câu 01 — the question that holds the whole day: a large statement card at the centre, faint hint cards
 * (bài toán · giải pháp · nhu cầu · công nghệ) drifting in around it. No answer is suggested.
 */
const N = 1;
const T = {
  hints: [8, 30, 52, 74],
  question: spokenAt(N, 'có một câu hỏi') - 6,
};

export default function S01() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <QuestionBoard frame={frame} hintsAt={T.hints} questionAt={T.question} />
    </Scene>
  );
}
