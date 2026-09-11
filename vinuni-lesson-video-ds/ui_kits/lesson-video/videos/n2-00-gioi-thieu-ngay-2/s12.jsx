import React from 'react';
import { Card, Check, Cross, Flow, GlassBox, Icon } from '../../../../components/index.js';
import { C, anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { PartScene } from './shared.jsx';

/*
 * Câu 12 — part 5 opens: the output of an AI system splits into two paths. An accent particle reaches
 * "Đạt yêu cầu" as the pass criterion is spoken; "Cần xử lý" appears at "cần làm gì" and a red particle
 * reaches it after "kết quả sai". No criteria or numbers are shown.
 */
const N = 12;
const T = {
  box: 8,
  ok: spokenAt(N, 'kết quả đạt yêu cầu') - 14, // 76
  okFlow: [spokenAt(N, 'kết quả đạt yêu cầu') - 10, spokenAt(N, 'kết quả đạt yêu cầu') + 24], // 80–114
  bad: spokenAt(N, 'cần làm gì') - 8, // 142
  badFlow: [spokenAt(N, 'kết quả sai') - 22, spokenAt(N, 'kết quả sai') + 4], // 228–254
};
const box = { x: 170, y: 520, w: 520, h: 300 };
const ok = { x: 1180, y: 450, w: 560, h: 170 };
const bad = { x: 1180, y: 740, w: 560, h: 170 };
const JX = 920;
const out = anchor(box, 'right');
const okPath = [out, { x: JX, y: out.y }, { x: JX, y: ok.y + ok.h / 2 }, anchor(ok, 'left')];
const badPath = [out, { x: JX, y: out.y }, { x: JX, y: bad.y + bad.h / 2 }, anchor(bad, 'left')];

function Layers({ opacity }) {
  // Three inner layers of the machine, each lit briefly as the result is produced.
  const rows = [0, 1, 2];
  return (
    <g opacity={opacity}>
      <Icon name="neural-net" x={box.x + 110} y={box.y + box.h / 2} size={96} />
      {rows.map((i) => (
        <rect key={i} x={box.x + 210} y={box.y + 80 + i * 60} width={250} height={36} rx={14} fill={C.dotInactive} />
      ))}
    </g>
  );
}

export default function S12() {
  const frame = useFrame();
  const okHit = pulse(frame, T.okFlow[1]);
  const badHit = pulse(frame, T.badFlow[1]);
  return (
    <PartScene n={N} frame={frame}>
      <GlassBox {...box} label="HỆ THỐNG AI" opacity={appear(frame, T.box)} active={pulse(frame, T.okFlow[0] - 10) + pulse(frame, T.badFlow[0] - 10)}>
        <Layers opacity={appear(frame, T.box + 6)} />
      </GlassBox>
      <Card {...ok} label="KẾT QUẢ" lines={['ĐẠT YÊU CẦU']} size={30} opacity={appear(frame, T.ok)} active={okHit}>
        <Check x={ok.x + ok.w - 70} y={ok.y + ok.h / 2 + 8} opacity={appear(frame, T.okFlow[1])} color={C.accent} />
      </Card>
      <Card {...bad} label="KẾT QUẢ SAI" lines={['CẦN XỬ LÝ']} size={30} accent={C.red} opacity={appear(frame, T.bad)} active={badHit}>
        <Cross x={bad.x + bad.w - 70} y={bad.y + bad.h / 2 + 8} opacity={appear(frame, T.badFlow[1])} />
      </Card>
      <Flow points={okPath} frame={frame} start={T.okFlow[0]} end={T.okFlow[1]} hideIn={[box, ok]} />
      <Flow points={badPath} frame={frame} start={T.badFlow[0]} end={T.badFlow[1]} color={C.red} hideIn={[box, bad]} />
    </PartScene>
  );
}
