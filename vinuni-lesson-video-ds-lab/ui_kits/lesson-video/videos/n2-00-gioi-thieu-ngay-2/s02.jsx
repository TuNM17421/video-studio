import React from 'react';
import { Card, Flow, Person, Pill, SceneFrame } from '../../../../components/index.js';
import { anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { EYEBROW, captionsFor, cue, footerFor } from './shared.jsx';

/*
 * Câu 02 — the day's title. A user is connected to the job they need to get done; "clarify the problem
 * first" is marked in red; the technology decision comes afterwards (dashed, "quyết định sau").
 */
const N = 2;
const T = {
  person: 6,
  flow: [30, 70],
  job: 40,
  clarify: 76, // "làm rõ vấn đề" ≈ f 70
  tech: 112, // "trước khi quyết định dùng công nghệ" ≈ f 110–170
  techFlow: [118, 162],
};
const P = { x: 330, y: 590, r: 70 };
const job = { x: 640, y: 510, w: 540, h: 160 };
const tech = { x: 1340, y: 530, w: 400, h: 120 };

export default function S02() {
  const frame = useFrame();
  const c = cue(N);
  return (
    <SceneFrame frame={frame} eyebrow={EYEBROW} title={c.title} footer={footerFor(N)} captions={captionsFor(N)}>
      <Person x={P.x} y={P.y} r={P.r} name="Người dùng" opacity={appear(frame, T.person)} />
      <Flow points={[{ x: P.x + P.r + 8, y: P.y }, anchor(job, 'left')]} frame={frame} start={T.flow[0]} end={T.flow[1]} hideIn={[job]} />
      <Card
        {...job}
        label="VIỆC CẦN HOÀN THÀNH"
        lines={['CÔNG VIỆC', 'người dùng cần làm xong']}
        size={28}
        lineHeight={40}
        opacity={appear(frame, T.job)}
        active={pulse(frame, T.flow[1])}
      />
      <Pill x={job.x + job.w / 2 - 170} y={job.y + job.h + 34} w={340} label="LÀM RÕ VẤN ĐỀ TRƯỚC" active opacity={appear(frame, T.clarify)} />
      <Flow points={[anchor(job, 'right'), anchor(tech, 'left')]} frame={frame} start={T.techFlow[0]} end={T.techFlow[1]} dashed hideIn={[job, tech]} />
      <Card {...tech} dashed label="SAU ĐÓ" lines={['CÔNG NGHỆ', 'quyết định sau']} size={26} lineHeight={36} opacity={appear(frame, T.tech)} />
    </SceneFrame>
  );
}
