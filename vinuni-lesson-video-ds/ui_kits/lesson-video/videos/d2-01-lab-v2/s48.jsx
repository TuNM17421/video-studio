import React from 'react';
import { useFrame, appear, pulse } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene } from './shared.jsx';
import { MiniBoard, WarnOutline, WarningCard, chipsBounds, metricBounds, chip } from './v2-pG.jsx';

/*
 * Câu 48 — three more warning signs land on the board as each is named: the operating process (the
 * steps), the basis for judging results (the metric cards), and the boundary when AI is wrong / when a
 * person approves (lane 2, the internal flow that drafts replies for approval).
 */
const N = 48;
const SAY = [spokenAt(N, 'chưa làm rõ quy trình'), spokenAt(N, 'chưa có căn cứ'), spokenAt(N, 'chưa xác định ranh giới')];
const T = { board: 0, warn: SAY.map((t) => t - 6) };
const CARDS = [
  { lines: ['Chưa làm rõ', 'quy trình vận hành'], icon: 'triangle-alert' },
  { lines: ['Chưa có căn cứ', 'đánh giá hiệu quả'], icon: 'triangle-alert' },
  { lines: ['Chưa rõ ranh giới khi AI sai', 'và lúc con người phê duyệt'], icon: 'user-check' },
];
const lane2 = { x: chip(1, 0).x - 14, y: chip(1, 0).y - 16, w: 800, h: 124 };
const OUTLINES = [{ ...chipsBounds, h: chip(0, 0).h + 32 }, metricBounds, lane2];

export default function S48() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <MiniBoard opacity={appear(frame, T.board, 12)} />
      {OUTLINES.map((b, i) => (
        <WarnOutline key={i} b={b} opacity={appear(frame, T.warn[i] + 6) * (i < 2 && frame >= T.warn[i + 1] ? 0.55 : 1)} />
      ))}
      {CARDS.map((c, i) => (
        <WarningCard key={i} index={i + 1} y={316 + i * 182} h={160} lines={c.lines} icon={c.icon} opacity={appear(frame, T.warn[i])} hot={pulse(frame, T.warn[i] + 10)} />
      ))}
    </Scene>
  );
}
