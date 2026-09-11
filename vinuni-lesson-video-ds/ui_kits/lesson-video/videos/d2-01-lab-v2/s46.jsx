import React from 'react';
import { Cross, Flow } from '../../../../components/index.js';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene, ToneLabel } from './shared.jsx';
import { MB, MiniBoard, RIGHT_X, laneC, metricBox } from './v2-pG.jsx';

/*
 * Câu 46 — each lane keeps its own metric card (different marker, no name, no value). A single
 * "BỘ ĐO MẶC ĐỊNH" tries to reach both lanes; both drags are stopped by a red cross.
 */
const N = 46;
const T = {
  board: 0,
  noName: spokenAt(N, 'không tự gán') - 6,
  meter: spokenAt(N, 'một bộ đo mặc định') - 8,
  drag: spokenAt(N, 'cho hai bài toán') - 14,
};
T.stop = T.drag + 30;
const meter = { x: RIGHT_X + 60, y: 510, w: 280, h: 140 };
const JX = RIGHT_X + 20; // vertical run between the meter and the metric cards
const stopY = [laneC(0) + 30, laneC(1) - 30];

export default function S46() {
  const frame = useFrame();
  const om = appear(frame, T.meter);
  return (
    <Scene n={N} frame={frame}>
      <MiniBoard opacity={appear(frame, T.board, 12)} stepsMuted={0.5} metricHot={[pulse(frame, T.noName), pulse(frame, T.noName + 8)]} />
      <ToneLabel x={metricBox(0).x + 6} y={MB.y + MB.h + 44} tone="unknown" opacity={appear(frame, T.noName)}>
        KHÔNG GÁN TÊN · KHÔNG GÁN GIÁ TRỊ
      </ToneLabel>
      <RoleCard {...meter} tone="neutral" dashed label="BỘ ĐO MẶC ĐỊNH" lines={['Một bộ đo', 'cho cả hai?']} size={24} opacity={om} />
      {[0, 1].map((l) => (
        <Flow
          key={l}
          points={[{ x: meter.x - 10, y: meter.y + meter.h / 2 + (l ? 24 : -24) }, { x: JX, y: meter.y + meter.h / 2 + (l ? 24 : -24) }, { x: JX, y: stopY[l] }]}
          frame={frame}
          start={T.drag + l * 6}
          end={T.stop + l * 6}
          dashed
          arrow={false}
          hideIn={[meter]}
        />
      ))}
      {[0, 1].map((l) => (
        <Cross key={l} x={JX} y={stopY[l] + (l ? -2 : 2)} size={40} opacity={appear(frame, T.stop + l * 6, 12)} />
      ))}
      <ToneLabel x={RIGHT_X + 30} y={meter.y + meter.h + 150} tone="problem" opacity={appear(frame, T.stop + 16)}>
        KHÔNG DÙNG CHUNG
      </ToneLabel>
    </Scene>
  );
}
