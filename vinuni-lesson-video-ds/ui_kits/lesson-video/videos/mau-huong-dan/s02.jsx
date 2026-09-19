import React from 'react';
import { Card, Flow } from '../../../../components/index.js';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Guide, Scene } from './shared.jsx';

/*
 * Câu 02 — "Hôm nay mình kể bạn nghe một kịch bản trở thành video bài giảng như thế nào."
 * Tệp kịch bản → mũi tên → khung video. Griffin nghiêng đầu nghĩ, dấu hỏi hiện ở "như thế nào".
 */
const N = 2;
const T = {
  script: spokenAt(N, 'kịch bản') - 6,
  flow: [spokenAt(N, 'trở thành') - 2, spokenAt(N, 'video bài giảng') + 2],
  video: spokenAt(N, 'video bài giảng') - 4,
  ask: spokenAt(N, 'như thế nào') - 4,
};

const SCRIPT = { x: 200, y: 520, w: 380, h: 200 };
const VIDEO = { x: 820, y: 470, w: 520, h: 300 };

export default function S02() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <Card {...SCRIPT} label="KỊCH BẢN" icon="document" lines={['kich-ban-goc.md', 'Lời đọc nguyên văn']} opacity={appear(frame, T.script)} />
      <Flow
        points={[{ x: SCRIPT.x + SCRIPT.w + 14, y: SCRIPT.y + SCRIPT.h / 2 }, { x: VIDEO.x - 14, y: SCRIPT.y + SCRIPT.h / 2 }]}
        frame={frame}
        start={T.flow[0]}
        end={T.flow[1]}
        hideIn={[SCRIPT, VIDEO]}
      />
      <Card {...VIDEO} label="VIDEO BÀI GIẢNG" icon="eye" lines={['Hình · giọng · phụ đề', '16:9 · MP4']} opacity={appear(frame, T.video)} active={pulse(frame, T.flow[1])} />
      <Guide frame={frame} mood={[{ at: 0, name: 'happy' }, { at: T.ask, name: 'thinking' }]} prop={[{ at: T.ask, name: 'question' }]} />
    </Scene>
  );
}
