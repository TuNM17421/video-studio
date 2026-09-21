import React from 'react';
import { StaticPath, SvgText } from '../../../../components/index.js';
import { appear, useFrame } from '../../../../lib/index.js';
import { C } from '../../../../lib/tokens.js';
import { spokenAt } from './cues.js';
import { Guide, RAIL, Scene, STEPS, StepRail } from './shared.jsx';

/*
 * Câu 07 — "Xong mỗi bước, bạn duyệt rồi mới đi tiếp, nên không có gì chạy ngoài ý muốn."
 * Năm bước nối nhau; mỗi bước nhận một dấu duyệt lần lượt từ "duyệt" tới "đi tiếp". Dòng chốt hiện ở
 * "không có gì".
 */
const N = 7;
const first = spokenAt(N, 'duyệt') - 4;
const last = spokenAt(N, 'đi tiếp') + 4;
const T = {
  ticks: STEPS.map((_, i) => Math.round(first + ((last - first) * i) / (STEPS.length - 1))),
  line: spokenAt(N, 'không có gì') - 6,
  calm: spokenAt(N, 'ngoài ý muốn') - 4,
};

export default function S07() {
  const frame = useFrame();
  const cy = RAIL.y + RAIL.h / 2;
  return (
    <Scene n={N} frame={frame}>
      <StepRail frame={frame} done={STEPS.length} doneAt={T.ticks} />
      {STEPS.slice(1).map((_, i) => {
        const x = RAIL.x + (i + 1) * (RAIL.w + RAIL.gap);
        return <StaticPath key={i} points={[{ x: x - RAIL.gap + 3, y: cy }, { x: x - 3, y: cy }]} color={C.accent} strokeWidth={4} opacity={appear(frame, T.ticks[i + 1], 8)} />;
      })}
      <SvgText x={200} y={600} size={56} weight={800} color={C.text} anchor="start" opacity={appear(frame, T.ticks[0], 14)}>
        Duyệt xong mới đi tiếp
      </SvgText>
      <SvgText x={200} y={690} size={40} weight={700} color={C.red} anchor="start" opacity={appear(frame, T.line, 14)}>
        Không có gì chạy ngoài ý muốn
      </SvgText>
      <Guide frame={frame} pose={[{ at: 0, name: 'stand' }, { at: T.calm, name: 'wings' }]} mood="happy" />
    </Scene>
  );
}
