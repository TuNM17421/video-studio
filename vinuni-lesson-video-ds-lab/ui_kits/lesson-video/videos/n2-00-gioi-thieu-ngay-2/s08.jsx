import React from 'react';
import { Card, Flow, GlassBox, Person, Pill, SvgText } from '../../../../components/index.js';
import { C, anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { PartScene } from './shared.jsx';

/*
 * Câu 08 — part 3 opens with a question, not an answer: the user's job (the running example) on the
 * left, an AI machine on the right, joined only by a dashed, unconfirmed link carrying a red "?".
 */
const N = 8;
const T = {
  person: 40,
  job: 46,
  ai: spokenAt(N, 'trí tuệ nhân tạo') - 6, // 44
  link: [spokenAt(N, 'trí tuệ nhân tạo') + 40, spokenAt(N, 'có thực sự giúp ích') + 10],
  question: spokenAt(N, 'có thực sự giúp ích') - 4,
  jobPulse: spokenAt(N, 'công việc ấy') - 4,
};
const P = { x: 230, y: 665, r: 62 };
const job = { x: 380, y: 600, w: 470, h: 170 };
const ai = { x: 1190, y: 550, w: 560, h: 270 };
const MID_X = (job.x + job.w + ai.x) / 2;

function NeuralNet({ box, opacity }) {
  const cols = [
    { x: box.x + 150, ys: [-58, 0, 58] },
    { x: box.x + 280, ys: [-84, -28, 28, 84] },
    { x: box.x + 410, ys: [-58, 0, 58] },
  ];
  const cy = box.y + box.h / 2 + 10;
  const edges = [];
  for (let c = 0; c < cols.length - 1; c++) {
    for (const a of cols[c].ys) for (const b of cols[c + 1].ys) {
      edges.push(<line key={`${c}:${a}:${b}`} x1={cols[c].x} y1={cy + a} x2={cols[c + 1].x} y2={cy + b} stroke={C.dotInactive} strokeWidth={3} />);
    }
  }
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {edges}
      {cols.map((col) => col.ys.map((dy) => <circle key={`${col.x}:${dy}`} cx={col.x} cy={cy + dy} r={15} fill={C.bg} stroke={C.accent} strokeWidth={3} />))}
    </g>
  );
}

function QuestionBadge({ x, y, opacity }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <circle cx={x} cy={y} r={34} fill={C.bg} stroke={C.red} strokeWidth={4} />
      <SvgText x={x} y={y + 14} size={40} weight={700} color={C.red}>
        ?
      </SvgText>
    </g>
  );
}

export default function S08() {
  const frame = useFrame();
  const from = anchor(job, 'right');
  const to = { x: ai.x, y: from.y };
  const aiIn = appear(frame, T.ai);
  return (
    <PartScene n={N} frame={frame}>
      <Person x={P.x} y={P.y} r={P.r} name="Người dùng" opacity={appear(frame, T.person)} />
      <Card {...job} label="CÔNG VIỆC" lines={['Tìm đúng hướng dẫn', 'nộp bài']} size={28} lineHeight={40} opacity={appear(frame, T.job)} active={pulse(frame, T.jobPulse)} />
      <GlassBox {...ai} label="TRÍ TUỆ NHÂN TẠO (AI)" opacity={aiIn}>
        <NeuralNet box={ai} opacity={aiIn} />
      </GlassBox>
      <Flow points={[from, to]} frame={frame} start={T.link[0]} end={T.link[1]} dashed showParticle={false} arrow={false} color={C.accent} hideIn={[job, ai]} />
      <QuestionBadge x={MID_X} y={from.y} opacity={appear(frame, T.question)} />
      <Pill x={MID_X - 125} y={from.y + 62} w={250} label="CÓ GIÚP ÍCH?" active opacity={appear(frame, T.question + 6)} />
    </PartScene>
  );
}
