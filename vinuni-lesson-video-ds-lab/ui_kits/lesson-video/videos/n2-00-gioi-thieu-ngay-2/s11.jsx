import React from 'react';
import { Card, Flow, Pill } from '../../../../components/index.js';
import { anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { PartScene } from './shared.jsx';

/*
 * Câu 11 — "đủ dùng và phù hợp": the job sits in the centre and weighs three criteria that flow into it
 * as each is spoken. No numbers, no chosen option.
 */
const N = 11;
const at = (p) => spokenAt(N, p);
const T = {
  job: 6,
  enough: at('đủ giải quyết') - 6, // 44
  cost: at('chi phí') - 6, // 134
  costFlow: [at('chi phí'), at('chi phí') + 26],
  wait: at('thời gian chờ') - 4, // 156
  waitFlow: [at('thời gian chờ') + 4, at('thời gian chờ') + 30],
  risk: at('rủi ro') - 14, // 186
  riskFlow: [at('rủi ro') - 10, at('rủi ro') + 12], // 190–212
};
const job = { x: 700, y: 490, w: 520, h: 170 };
const cost = { x: 140, y: 510, w: 380, h: 130 };
const wait = { x: 1400, y: 510, w: 380, h: 130 };
const risk = { x: 770, y: 790, w: 380, h: 130 };

export default function S11() {
  const frame = useFrame();
  // One short pulse per arrival (40 f) so the card is clean again for the final hold.
  const hot = Math.max(pulse(frame, T.costFlow[1], 40), pulse(frame, T.waitFlow[1], 40), pulse(frame, T.riskFlow[1], 40));
  return (
    <PartScene n={N} frame={frame}>
      <Pill x={960 - 170} y={414} w={340} label="ĐỦ DÙNG VÀ PHÙ HỢP" active opacity={appear(frame, T.enough)} />
      <Flow points={[anchor(cost, 'right'), anchor(job, 'left')]} frame={frame} start={T.costFlow[0]} end={T.costFlow[1]} hideIn={[cost, job]} />
      <Flow points={[anchor(wait, 'left'), anchor(job, 'right')]} frame={frame} start={T.waitFlow[0]} end={T.waitFlow[1]} hideIn={[wait, job]} />
      <Flow points={[anchor(risk, 'top'), anchor(job, 'bottom')]} frame={frame} start={T.riskFlow[0]} end={T.riskFlow[1]} hideIn={[risk, job]} />
      <Card {...job} label="CÔNG VIỆC CẦN LÀM" lines={['CHỌN CÁCH', 'đủ giải quyết công việc']} size={28} lineHeight={40} opacity={appear(frame, T.job)} active={hot} />
      <Card {...cost} icon="coin" label="CHI PHÍ" lines={['Tốn bao nhiêu?']} size={24} opacity={appear(frame, T.cost)} />
      <Card {...wait} icon="calendar-x" label="THỜI GIAN CHỜ" lines={['Chờ bao lâu?']} size={24} opacity={appear(frame, T.wait)} />
      <Card {...risk} icon="alert-bubble" label="RỦI RO" lines={['Sai thì sao?']} size={24} opacity={appear(frame, T.risk)} />
    </PartScene>
  );
}
