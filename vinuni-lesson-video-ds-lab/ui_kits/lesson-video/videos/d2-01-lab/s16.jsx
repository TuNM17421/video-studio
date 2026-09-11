import React from 'react';
import { Flow, FormSheet, SvgText } from '../../../../components/index.js';
import { C, ROLE, anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt, speechEnd } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';

/*
 * Câu 16 — vướng ở bước nào? Three steps appear as they are named; the observation sheet (MINH HỌA)
 * records the step where Lan stalled, and that step turns orange (one same-hue pulse).
 */
const N = 16;
const T = {
  steps: [spokenAt(N, 'tìm hướng dẫn') - 6, spokenAt(N, 'chọn nơi nộp') - 6, spokenAt(N, 'tải tệp') - 6],
  sheet: spokenAt(N, 'mình xác định') - 6,
  mark: speechEnd(N) - 18,
};
export const STEPS = [
  { x: 160, y: 330, w: 460, h: 130, lines: ['Tìm hướng dẫn'] },
  { x: 730, y: 330, w: 460, h: 130, lines: ['Chọn nơi nộp'] },
  { x: 1300, y: 330, w: 460, h: 130, lines: ['Tải tệp'] },
];
export const SHEET = { x: 160, y: 600, w: 820 };

export default function S16() {
  const frame = useFrame();
  const marked = appear(frame, T.mark);
  const up = [{ x: 390, y: SHEET.y - 10 }, { x: 390, y: STEPS[0].y + STEPS[0].h + 10 }];
  return (
    <Scene n={N} frame={frame}>
      {STEPS.map((s, i) => (
        <RoleCard
          key={i}
          {...s}
          label={`BƯỚC ${i + 1}`}
          tone={i === 0 && marked > 0.5 ? 'problem' : 'neutral'}
          hot={i === 0 ? pulse(frame, T.mark + 20) : 0}
          size={30}
          opacity={appear(frame, T.steps[i])}
        />
      ))}
      {[0, 1].map((i) => (
        <Flow
          key={i}
          points={[anchor(STEPS[i], 'right'), anchor(STEPS[i + 1], 'left')]}
          frame={frame}
          start={T.steps[i + 1] - 4}
          end={T.steps[i + 1] + 14}
          hideIn={[STEPS[i], STEPS[i + 1]]}
        />
      ))}
      <FormSheet
        {...SHEET}
        title="PHIẾU QUAN SÁT · MINH HỌA"
        labelW={340}
        rows={[
          { label: 'Người được quan sát', value: 'Lan · học viên mới' },
          { label: 'Bước bị vướng', value: frame >= T.mark ? 'Tìm hướng dẫn' : undefined },
        ]}
        opacity={appear(frame, T.sheet)}
      />
      {marked > 0.001 ? (
        <rect x={SHEET.x + 10} y={SHEET.y + 56 + 9 + 76 + 4} width={SHEET.w - 20} height={68} rx={12} fill="none" stroke={ROLE.orange} strokeWidth={3} opacity={marked} />
      ) : null}
      <Flow points={up} frame={frame} start={T.mark} end={T.mark + 20} color={ROLE.orange} hideIn={[STEPS[0]]} />
      <SvgText x={1020} y={SHEET.y + 190} size={22} weight={600} anchor="start" color={C.textMuted} opacity={marked}>
        Phiếu ghi: Lan vướng ở bước 1
      </SvgText>
    </Scene>
  );
}
