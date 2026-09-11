import React from 'react';
import { Flow } from '../../../../components/index.js';
import { anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';

/*
 * Câu 12 — the whole day as one path: seven stages on a snake (four left→right, then three right→left),
 * each card appearing just before it is named and receiving the particle from the previous one. The
 * last stage — a decision clear enough to deploy — is the green goal.
 */
const N = 12;
const STAGES = [
  { say: 'nhận diện bài toán', lines: ['Nhận diện', 'bài toán'], tone: 'neutral' },
  { say: 'làm rõ điểm đau', lines: ['Làm rõ', 'điểm đau'], tone: 'problem' },
  { say: 'khả năng cần AI', lines: ['Khả năng', 'cần AI'], tone: 'unknown' },
  { say: 'xác định cấp độ giải pháp', lines: ['Cấp độ', 'giải pháp'], tone: 'solution' },
  { say: 'tiêu chí thành công', lines: ['Tiêu chí', 'thành công'], tone: 'neutral' },
  { say: 'cách ứng xử khi AI thất bại', lines: ['Ứng xử khi', 'AI thất bại'], tone: 'problem' },
  { say: 'quyết định triển khai', lines: ['Quyết định', 'triển khai'], tone: 'job' },
];
const W = 330;
const H = 130;
const XS = [130, 560, 990, 1420];
const boxes = [
  ...XS.map((x) => ({ x, y: 360, w: W, h: H })),
  ...[1420, 990, 560].map((x) => ({ x, y: 700, w: W, h: H })),
];
const SAY = STAGES.map((s) => spokenAt(N, s.say));
const T = {
  card: SAY.map((t, i) => (i === 0 ? t - 8 : t - 26)),
  flow: SAY.map((t) => [t - 22, t - 2]),
};

function link(i) {
  const a = boxes[i];
  const b = boxes[i + 1];
  if (i < 3) return [anchor(a, 'right'), anchor(b, 'left')];
  if (i === 3) return [anchor(a, 'bottom'), anchor(b, 'top')];
  return [anchor(a, 'left'), anchor(b, 'right')];
}

export default function S12() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      {boxes.slice(0, -1).map((_, i) => (
        <Flow key={i} points={link(i)} frame={frame} start={T.flow[i + 1][0]} end={T.flow[i + 1][1]} hideIn={[boxes[i], boxes[i + 1]]} />
      ))}
      {STAGES.map((s, i) => (
        <RoleCard
          key={i}
          {...boxes[i]}
          tone={s.tone}
          label={`CHẶNG ${i + 1}`}
          lines={s.lines}
          size={26}
          opacity={appear(frame, T.card[i])}
          hot={i === 0 ? pulse(frame, SAY[0]) : pulse(frame, T.flow[i][1])}
        />
      ))}
    </Scene>
  );
}
