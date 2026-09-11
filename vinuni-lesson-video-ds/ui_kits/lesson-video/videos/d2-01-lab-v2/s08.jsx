import React from 'react';
import { DecisionNode, Flow, decisionPorts } from '../../../../components/index.js';
import { anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene, ToneLabel } from './shared.jsx';

/*
 * Câu 08 — "ba bước để xác định AI có đáng làm hay không": one question node, three exits that appear on
 * their words — AI làm thay con người · AI hỗ trợ con người · cấp độ đơn giản nhất vẫn đủ. None is chosen.
 */
const N = 8;
const SAY = [spokenAt(N, 'làm thay con người'), spokenAt(N, 'hỗ trợ con người'), spokenAt(N, 'cấp độ đơn giản nhất')];
const T = {
  node: spokenAt(N, 'xác định AI') - 8,
  cards: SAY.map((t) => t - 12),
  flows: SAY.map((t) => [t - 18, t + 4]),
};
const D = { x: 520, y: 610, size: 250 };
const P = decisionPorts(D);
const CARDS = [
  { x: 1120, y: 330, w: 640, h: 130, tone: 'solution', lines: ['AI làm thay', 'con người'] },
  { x: 1120, y: 545, w: 640, h: 130, tone: 'user', lines: ['AI hỗ trợ', 'con người'] },
  { x: 1120, y: 760, w: 640, h: 130, tone: 'job', lines: ['Cấp độ đơn giản nhất', 'vẫn đủ giải quyết bài toán'] },
];
const JX = 880;

export default function S08() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <ToneLabel x={330} y={410} tone="unknown" opacity={appear(frame, T.node)}>
        BA BƯỚC XÁC ĐỊNH
      </ToneLabel>
      <DecisionNode {...D} label={['AI CÓ', 'ĐÁNG LÀM?']} tone="memory" opacity={appear(frame, T.node)} />
      {CARDS.map((c, i) => {
        const to = anchor(c, 'left');
        return (
          <Flow key={`f${i}`} points={[P.right, { x: JX, y: P.right.y }, { x: JX, y: to.y }, to]} frame={frame} start={T.flows[i][0]} end={T.flows[i][1]} hideIn={[c]} />
        );
      })}
      {CARDS.map((c, i) => (
        <RoleCard key={i} {...c} size={30} opacity={appear(frame, T.cards[i])} hot={pulse(frame, T.flows[i][1])} />
      ))}
    </Scene>
  );
}
