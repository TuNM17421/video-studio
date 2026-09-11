import React from 'react';
import { Flow, LineIcon, NumberBadge } from '../../../../components/index.js';
import { ROLE, appear, pulse, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene, ToneLabel } from './shared.jsx';
import { MiniBoard, WarningCard } from './v2-pG.jsx';

/*
 * Câu 49 — the warnings fold away; Problem Statement (green, the description is clear) comes first,
 * technology (purple) waits behind it, and the "chọn công nghệ" arrow is drawn only afterwards.
 */
const N = 49;
const T = {
  fold: [spokenAt(N, 'quay lại') - 20, spokenAt(N, 'quay lại') + 10],
  tech: spokenAt(N, 'quay lại'),
  ps: spokenAt(N, 'Problem Statement') - 6,
  desc: spokenAt(N, 'tức phần mô tả') - 4,
  choose: spokenAt(N, 'trước khi chọn công nghệ'),
};
T.arrive = T.choose + 30;
const ps = { x: 250, y: 440, w: 640, h: 230 };
const tech = { x: 1250, y: 485, w: 420, h: 140 };
const CARDS = [
  ['Chưa làm rõ', 'quy trình vận hành'],
  ['Chưa có căn cứ', 'đánh giá hiệu quả'],
  ['Chưa rõ ranh giới khi AI sai', 'và lúc con người phê duyệt'],
];

export default function S49() {
  const frame = useFrame();
  const fold = smooth(frame, T.fold[0], T.fold[1]);
  const board = 1 - appear(frame, T.fold[0], 20);
  const solid = appear(frame, T.arrive);
  return (
    <Scene n={N} frame={frame}>
      <MiniBoard opacity={board} />
      {CARDS.map((lines, i) => {
        const y0 = 316 + i * 182;
        const y = y0 + (500 - y0) * fold;
        return <WarningCard key={i} index={i + 1} y={y} h={160} lines={lines} opacity={1 - fold} />;
      })}
      <RoleCard {...ps} tone="job" label="PROBLEM STATEMENT" lines={frame >= T.desc ? ['Mô tả bài toán', 'cần giải quyết'] : []} size={32} opacity={appear(frame, T.ps)} hot={pulse(frame, T.desc)} />
      <NumberBadge x={ps.x} y={ps.y} value={1} opacity={appear(frame, T.ps)} />
      <RoleCard {...tech} tone="solution" dashed={solid < 0.5} muted={0.6 * (1 - solid)} label="CÔNG NGHỆ" lines={['Chọn sau']} size={28} opacity={appear(frame, T.tech)} hot={pulse(frame, T.arrive)}>
        <LineIcon name="bot" x={tech.x + 48} y={tech.y + 84} size={36} color={ROLE.purple} />
      </RoleCard>
      <NumberBadge x={tech.x} y={tech.y} value={2} opacity={appear(frame, T.tech)} />
      <Flow points={[{ x: ps.x + ps.w + 10, y: 555 }, { x: tech.x - 10, y: 555 }]} frame={frame} start={T.choose} end={T.arrive} color={ROLE.purple} />
      <ToneLabel x={(ps.x + ps.w + tech.x) / 2} y={520} anchor="middle" tone="solution" opacity={appear(frame, T.choose)}>
        CHỌN CÔNG NGHỆ
      </ToneLabel>
      <ToneLabel x={ps.x + 30} y={ps.y + ps.h + 50} tone="job" opacity={appear(frame, T.desc + 10)}>
        LÀM RÕ TRƯỚC
      </ToneLabel>
    </Scene>
  );
}
