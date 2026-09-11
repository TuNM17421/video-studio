import React from 'react';
import { Bracket, DocumentSheet, SvgText } from '../../../../components/index.js';
import { C, ROLE, appear, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene, ToneLabel } from './shared.jsx';

/*
 * Câu 17 — có lặp lại ở người khác? Lan's one observation sheet stays on the left; empty dashed sheets
 * for other learners slide out beside it (no data). A bracket marks the single case: chưa đủ cho cả lớp.
 */
const N = 17;
const T = {
  sheet: 4,
  others: spokenAt(N, 'những học viên khác') - 6,
  one: spokenAt(N, 'một trường hợp') - 6,
  whole: spokenAt(N, 'tình hình cả lớp') - 6,
};
const W = 250;
const H = (168 / 215) * W;
const Y = 430;
const SLOTS = [160, 480, 800, 1120, 1440];
const LABELS = ['Học viên 2', 'Học viên 3', 'Học viên 4', 'Học viên …'];

function EmptySheet({ x, y, label, opacity }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={W} height={H} rx={14} fill={C.bg} stroke={C.accent} strokeWidth={3} strokeDasharray="12 10" />
      <SvgText x={x + W / 2} y={y + H / 2 + 8} size={22} weight={600} color={C.textMuted}>
        chưa hỏi
      </SvgText>
      <SvgText x={x + W / 2} y={y + H + 40} size={22} weight={700} color={C.accent}>
        {label}
      </SvgText>
    </g>
  );
}

export default function S17() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <DocumentSheet x={SLOTS[0]} y={Y} w={W} label="Phiếu của Lan" fill={1} opacity={appear(frame, T.sheet)} />
      {LABELS.map((l, i) => {
        const t = T.others + i * 8;
        const a = appear(frame, t);
        const x = SLOTS[0] + (SLOTS[i + 1] - SLOTS[0]) * a;
        return <EmptySheet key={l} x={x} y={Y} label={l} opacity={a} />;
      })}
      <Bracket x={SLOTS[0]} y={Y - 30} w={W} h={24} direction="up" color={ROLE.amber} opacity={appear(frame, T.one)} />
      <SvgText x={SLOTS[0] + W / 2} y={Y - 66} size={22} weight={700} color={ROLE.amber} opacity={appear(frame, T.one)}>
        một trường hợp
      </SvgText>
      <ToneLabel x={960} y={850} anchor="middle" tone="unknown" size={24} opacity={appear(frame, T.whole)}>
        CHƯA NÓI LÊN TÌNH HÌNH CẢ LỚP
      </ToneLabel>
    </Scene>
  );
}
