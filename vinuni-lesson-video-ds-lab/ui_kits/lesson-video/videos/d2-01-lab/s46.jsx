import React from 'react';
import { SvgText } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { ProblemSlots, RoleCard, ToneLabel } from './shared.jsx';
import { Scene } from './shared.jsx';

/*
 * Câu 46 — exercise. The blank problem-sentence template (Người dùng… khó… khi… dẫn tới…) and an empty
 * metric slot. No answer is filled in.
 */
const N = 46;
const T = {
  head: spokenAt(N, 'viết lại') - 8,
  slots: spokenAt(N, 'một câu nêu rõ khó khăn') - 8,
  metric: spokenAt(N, 'chọn một con số') - 6,
};
const ROW = { x: 160, y: 380, w: 1600, h: 170 };
const METRIC = { x: 560, y: 650, w: 800, h: 150 };

export default function S46() {
  const frame = useFrame();
  const m = appear(frame, T.metric);
  return (
    <Scene n={N} frame={frame}>
      <ToneLabel x={ROW.x} y={ROW.y - 30} tone="user" opacity={appear(frame, T.head)}>
        CÂU VẤN ĐỀ CỦA BẠN
      </ToneLabel>
      <ProblemSlots
        box={ROW}
        show={[0, 1, 2].map((i) => appear(frame, T.slots + i * 8))}
        asks={['Người dùng…', 'khó… khi…', 'dẫn tới…']}
      />
      <RoleCard {...METRIC} tone="metric" label="CHỈ SỐ" dashed opacity={m} fill={C.bg}>
        <SvgText x={METRIC.x + METRIC.w / 2} y={METRIC.y + 96} size={26} weight={600} color={C.textMuted}>
          Con số theo dõi · ?
        </SvgText>
      </RoleCard>
    </Scene>
  );
}
