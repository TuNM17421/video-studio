import React from 'react';
import { Card, Flow } from '../../../../components/index.js';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Guide, Scene, StepRail } from './shared.jsx';

/*
 * Câu 03 — "Đầu tiên, bạn chọn style và thả kịch bản vào Studio."
 * Bước 1 sáng trên dải năm bước. Hai việc của người dùng (chọn style, thả kịch bản) chảy vào Studio.
 */
const N = 3;
const T = {
  style: spokenAt(N, 'chọn style') - 6,
  script: spokenAt(N, 'thả kịch bản') - 6,
  flow: [spokenAt(N, 'vào Studio') - 4, spokenAt(N, 'Studio') + 10],
  studio: spokenAt(N, 'Studio') - 6,
};

const STYLE = { x: 200, y: 460, w: 420, h: 130 };
const SCRIPT = { x: 200, y: 660, w: 420, h: 130 };
const STUDIO = { x: 860, y: 540, w: 440, h: 170 };

export default function S03() {
  const frame = useFrame();
  const into = (from) => [
    { x: from.x + from.w + 14, y: from.y + from.h / 2 },
    { x: 760, y: from.y + from.h / 2 },
    { x: 760, y: STUDIO.y + STUDIO.h / 2 },
    { x: STUDIO.x - 14, y: STUDIO.y + STUDIO.h / 2 },
  ];
  return (
    <Scene n={N} frame={frame}>
      <StepRail frame={frame} active={0} />
      <Card {...STYLE} label="BẠN CHỌN" icon="layers" lines={['Style hình ảnh']} opacity={appear(frame, T.style)} />
      <Card {...SCRIPT} label="BẠN THẢ VÀO" icon="document" lines={['Tệp kịch bản']} opacity={appear(frame, T.script)} />
      <Flow points={into(STYLE)} frame={frame} start={T.flow[0]} end={T.flow[1]} hideIn={[STYLE, STUDIO]} />
      <Flow points={into(SCRIPT)} frame={frame} start={T.flow[0]} end={T.flow[1]} hideIn={[SCRIPT, STUDIO]} />
      <Card {...STUDIO} label="VIDEO STUDIO" icon="gear" lines={['Hồ sơ video mới']} opacity={appear(frame, T.studio)} active={pulse(frame, T.flow[1])} />
      <Guide frame={frame} mood="happy" />
    </Scene>
  );
}
