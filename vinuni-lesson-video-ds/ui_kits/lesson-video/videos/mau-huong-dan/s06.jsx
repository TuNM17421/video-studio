import React from 'react';
import { Card, Flow } from '../../../../components/index.js';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Guide, Scene, StepRail } from './shared.jsx';

/*
 * Câu 06 — "Cuối cùng, Studio ghép hình, giọng và nhạc nền thành một tệp video."
 * Bước 5. Ba nguồn hiện đúng lúc được gọi tên rồi cùng chảy vào một tệp MP4; Griffin nhảy một nhịp
 * khi tệp video xuất hiện.
 */
const N = 6;
const T = {
  image: spokenAt(N, 'hình') - 6,
  voice: spokenAt(N, 'giọng') - 6,
  music: spokenAt(N, 'nhạc nền') - 6,
  flow: [spokenAt(N, 'thành một') - 4, spokenAt(N, 'tệp video') + 4],
  mp4: spokenAt(N, 'tệp video') - 6,
};

const SOURCES = [
  { key: 'image', label: 'HÌNH', line: 'Các cảnh đã dựng', icon: 'layers', y: 450 },
  { key: 'voice', label: 'GIỌNG', line: 'Bản thu giọng đọc', icon: 'chat-bubble', y: 600 },
  { key: 'music', label: 'NHẠC NỀN', line: 'Chọn ở bước Render', icon: 'trend-up', y: 750 },
];
const SRC_W = 420;
const SRC_H = 120;
const MP4 = { x: 900, y: 570, w: 400, h: 160 };

export default function S06() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <StepRail frame={frame} active={4} />
      {SOURCES.map((s) => {
        const box = { x: 200, y: s.y, w: SRC_W, h: SRC_H };
        return (
          <g key={s.key}>
            <Card {...box} label={s.label} icon={s.icon} lines={[s.line]} size={22} opacity={appear(frame, T[s.key])} />
            <Flow
              points={[
                { x: box.x + box.w + 14, y: box.y + box.h / 2 },
                { x: 780, y: box.y + box.h / 2 },
                { x: 780, y: MP4.y + MP4.h / 2 },
                { x: MP4.x - 14, y: MP4.y + MP4.h / 2 },
              ]}
              frame={frame}
              start={T.flow[0]}
              end={T.flow[1]}
              hideIn={[box, MP4]}
            />
          </g>
        );
      })}
      <Card {...MP4} label="RENDER" icon="check" lines={['Một tệp video', 'MP4']} opacity={appear(frame, T.mp4)} active={pulse(frame, T.flow[1])} />
      <Guide frame={frame} mood="happy" hops={[T.flow[1]]} />
    </Scene>
  );
}
