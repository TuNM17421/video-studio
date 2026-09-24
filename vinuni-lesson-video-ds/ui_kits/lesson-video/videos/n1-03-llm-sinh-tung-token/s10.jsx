import React from 'react';
import { AttentionLines, anchorsAbove, anchorsBelow } from '../../../../components/index.js';
import { appear, linearProgress, useFrame } from '../../../../lib/index.js';
import { Note, Row, Scene, cells, rowAt } from './shared.jsx';

/* Câu 10 — các dãy số kết hợp thông tin từ phần văn bản mô hình được phép dùng: ô trống nhìn về sau. */
const N = 10;
const LINKS = [
  { from: 0, to: 0, w: 0.2 }, { from: 0, to: 1, w: 0.25 }, { from: 0, to: 2, w: 0.45 },
  { from: 0, to: 3, w: 0.3 }, { from: 0, to: 4, w: 0.5 }, { from: 0, to: 5, w: 0.85 },
];
export default function S10() {
  const frame = useFrame();
  const top = rowAt({ y: 300, tokens: ['ô trống'] });
  return (
    <Scene n={N} frame={frame}>
      <Row over={{ y: 300, tokens: ['ô trống'], x: 900 }} color={undefined} highlight={0} />
      <Row over={{ y: 640 }} />
      <AttentionLines
        from={anchorsBelow(cells({ y: 300, tokens: ['ô trống'], x: 900 }))}
        to={anchorsAbove(cells({ y: 640 }))}
        links={LINKS} maxWidth={12} reveal={linearProgress(frame, 40, 160)}
      />
      <Note y={880} opacity={appear(frame, 170)}>Mảnh tiếp theo dựa vào phần đã có</Note>
    </Scene>
  );
}
