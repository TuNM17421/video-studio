import React from 'react';
import { Card, Flow, Person } from '../../../../components/index.js';
import { anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { PartScene } from './shared.jsx';

/*
 * Câu 09 — each job gets a role for AI: two equal branches (same size, colour, weight — no preference),
 * "AI làm thay" and "AI hỗ trợ" where a person keeps the decision.
 */
const N = 9;
const T = {
  job: 8,
  replaceFlow: [spokenAt(N, 'giao AI làm thay') - 10, spokenAt(N, 'giao AI làm thay') + 26], // 70–106
  replace: spokenAt(N, 'giao AI làm thay') - 6,
  supportFlow: [spokenAt(N, 'AI nên hỗ trợ') - 10, spokenAt(N, 'AI nên hỗ trợ') + 26], // 150–186
  support: spokenAt(N, 'AI nên hỗ trợ') - 6,
  person: spokenAt(N, 'để con người') - 6,
};
const job = { x: 150, y: 560, w: 440, h: 170 };
const replace = { x: 1010, y: 440, w: 540, h: 170 };
const support = { x: 1010, y: 720, w: 540, h: 170 };
const JUNCTION_X = 800;

export default function S09() {
  const frame = useFrame();
  const out = anchor(job, 'right');
  const rIn = anchor(replace, 'left');
  const sIn = anchor(support, 'left');
  return (
    <PartScene n={N} frame={frame}>
      <Card {...job} label="TỪNG VIỆC" lines={['MỖI VIỆC', 'cân nhắc vai trò của AI']} size={26} lineHeight={38} opacity={appear(frame, T.job)} />
      <Flow
        points={[out, { x: JUNCTION_X, y: out.y }, { x: JUNCTION_X, y: rIn.y }, rIn]}
        frame={frame}
        start={T.replaceFlow[0]}
        end={T.replaceFlow[1]}
        hideIn={[job, replace]}
      />
      <Flow
        points={[out, { x: JUNCTION_X, y: out.y }, { x: JUNCTION_X, y: sIn.y }, sIn]}
        frame={frame}
        start={T.supportFlow[0]}
        end={T.supportFlow[1]}
        hideIn={[job, support]}
      />
      <Card {...replace} icon="robot" label="AI LÀM THAY" lines={['GIAO VIỆC', 'cho AI làm thay']} size={26} lineHeight={38} opacity={appear(frame, T.replace)} active={pulse(frame, T.replaceFlow[1])} />
      <Card {...support} icon="users" label="AI HỖ TRỢ" lines={['HỖ TRỢ', 'con người quyết định']} size={26} lineHeight={38} opacity={appear(frame, T.support)} active={pulse(frame, T.supportFlow[1])} />
      <Person x={1690} y={support.y + 70} r={52} name="Con người" opacity={appear(frame, T.person)} />
    </PartScene>
  );
}
