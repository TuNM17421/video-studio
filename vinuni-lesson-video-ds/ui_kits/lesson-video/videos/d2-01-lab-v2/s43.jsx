import React from 'react';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene, ToneLabel, boardStep } from './shared.jsx';
import { BV, PainZone, ToneChip, WorkflowBoard } from './v2-pF.jsx';

/*
 * Câu 43 — the pain point is named first ("pain point, tức là điểm đau cụ thể…"): an orange zone opens
 * at one stuck step of the internal workflow and gathers three markers as they are said — khó khăn,
 * phàn nàn, tắc nghẽn. At "nhận diện trước khi đề xuất giải pháp" the zone pulses (same hue).
 */
const N = 43;
const T = {
  board: 0,
  zone: 2,
  label: 6,
  chips: [spokenAt(N, 'gặp khó khăn') - 4, spokenAt(N, 'phàn nàn') - 6, spokenAt(N, 'tắc nghẽn') - 6],
  point: spokenAt(N, 'nhận diện trước') - 8,
};
export const PAIN_STEP = boardStep(1, 1, BV);
export const PAIN_BOX = { x: PAIN_STEP.x - 50, y: PAIN_STEP.y - 74, w: PAIN_STEP.w + 100, h: PAIN_STEP.h + 92 };
export const CHIPS = ['khó khăn', 'phàn nàn', 'tắc nghẽn'].map((label, i) => ({ label, x: PAIN_STEP.x - 40 + i * 130, y: PAIN_STEP.y - 58, w: 120 }));

export function PainLayer({ frame, zone = 1, chips = [1, 1, 1], label = 1, hot = 0 }) {
  return (
    <>
      <PainZone box={PAIN_BOX} pad={0} grow={1} hot={hot} opacity={zone} />
      {CHIPS.map((c, i) => (
        <ToneChip key={c.label} {...c} tone="problem" label={c.label} opacity={chips[i]} />
      ))}
      <ToneLabel x={PAIN_BOX.x + 8} y={PAIN_BOX.y - 14} tone="problem" opacity={label}>
        PAIN POINT · điểm đau cụ thể
      </ToneLabel>
    </>
  );
}

export default function S43() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <WorkflowBoard
        opacity={appear(frame, T.board, 12)}
        under={<PainLayer frame={frame} zone={appear(frame, T.zone)} chips={T.chips.map((t) => appear(frame, t))} label={appear(frame, T.label)} hot={pulse(frame, T.point + 8)} />}
      />
      <RoleCard x={560} y={272} w={800} h={84} tone="problem" lines={['Nhận diện trước khi đề xuất giải pháp']} size={28} opacity={appear(frame, T.point)} hot={pulse(frame, T.point + 8)} />
    </Scene>
  );
}
