import React from 'react';
import { DocumentSheet, Flow, FormSheet, Person, SpeechBubble, StatusDot, SvgText } from '../../../../components/index.js';
import { C, appear, linearProgress, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { PartScene } from './shared.jsx';

/*
 * Câu 05 — MINH HỌA. A learner opens three guide pages in turn (one search particle visits each, the
 * page writes its lines as it is reached) and stops at page 3. An observer notes where they searched and
 * where they stopped, then asks which step cost them time.
 */
const N = 5;
const PAGES = [360, 590, 820];
const PAGE_W = 170;
const PAGE_Y = 520;
const midY = PAGE_Y + 66;
const P = { x: 185, y: midY, r: 62 };
const path = [{ x: P.x + P.r + 8, y: midY }, { x: PAGES[2] + PAGE_W / 2, y: midY }];
const pathLen = path[1].x - path[0].x;

const T = {
  learner: spokenAt(N, 'một học viên') - 24,
  pages: 20,
  search: [34, 120],
  observer: spokenAt(N, 'quan sát') - 6,
  where: spokenAt(N, 'tìm ở đâu') - 4,
  stop: spokenAt(N, 'tìm ở đâu') + 30,
  ask: spokenAt(N, 'hỏi bước nào') - 4,
  clear: 250,
};
// Frame at which the particle reaches each page's left edge.
const reach = PAGES.map((x) => Math.round(T.search[0] + ((x - path[0].x) / pathLen) * (T.search[1] - T.search[0])));

const form = { x: 1110, y: 440, w: 710 };
const O = { x: 1210, y: 820, r: 50 };

export default function S05() {
  const frame = useFrame();
  const stopped = appear(frame, T.search[1] - 4);
  const row = frame >= T.clear ? -1 : frame >= T.stop ? 1 : frame >= T.where ? 0 : -1;
  return (
    <PartScene n={N} frame={frame}>
      <Person x={P.x} y={P.y} r={P.r} name="Học viên" opacity={appear(frame, T.learner)} />
      {frame >= T.search[0] ? (
        <Flow points={path} frame={frame} start={T.search[0]} end={T.search[1]} arrow={false} />
      ) : null}
      {PAGES.map((x, i) => (
        <DocumentSheet
          key={x}
          x={x}
          y={PAGE_Y}
          w={PAGE_W}
          label={`Trang ${i + 1}`}
          selected={i === 2 && frame >= T.search[1] - 4}
          fill={linearProgress(frame, reach[i], reach[i] + 14)}
          opacity={appear(frame, T.pages + i * 6)}
        />
      ))}
      <g opacity={stopped < 1 ? stopped : undefined}>
        <StatusDot x={PAGES[2] + 4} y={PAGE_Y - 34} active r={10} />
        <SvgText x={PAGES[2] + 22} y={PAGE_Y - 26} size={21} weight={700} anchor="start" color={C.red}>
          Dừng lại ở đây
        </SvgText>
      </g>

      <FormSheet
        {...form}
        rowH={82}
        labelW={300}
        title="GHI CHÉP QUAN SÁT"
        rows={[
          { label: 'Trang đã tìm', value: frame >= T.where ? 'Trang 1 · 2 · 3' : undefined },
          { label: 'Bước dừng lại', value: frame >= T.stop ? 'Trang 3' : undefined },
        ]}
        active={row}
        opacity={appear(frame, T.observer)}
      />
      <Person x={O.x} y={O.y} r={O.r} name="Người quan sát" active opacity={appear(frame, T.observer)} />
      <SpeechBubble x={1320} y={726} w={500} h={96} lines={['Bước nào làm bạn', 'mất thời gian?']} tone="red" tail="left" opacity={appear(frame, T.ask)} />
    </PartScene>
  );
}
