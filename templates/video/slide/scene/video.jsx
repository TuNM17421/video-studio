import React from 'react';
import { Series, useFrame } from '../../../../lib/index.js';
import { PLAY_DURATION, TIMELINE, VOICED } from './timeline.js';
import S01 from './s01.jsx';

/*
 * __ID__ · __TITLE__ — scaffold slide-vector. Thêm cue thì thêm một `sNN.jsx` (mẫu `s01.jsx`) +
 * import + phần tử vào `SCENES` dưới đây, theo đúng thứ tự `n` trong `cues.js`.
 */
const SCENES = [S01];
const SEQUENCES = SCENES.map((component, i) => ({
  component,
  duration: TIMELINE[i].duration,
  authoredDuration: TIMELINE[i].duration !== TIMELINE[i].authored ? TIMELINE[i].authored : undefined,
  name: `Câu ${String(TIMELINE[i].n).padStart(2, '0')}`,
}));

export const meta = {
  id: '__ID__',
  title: '__TITLE__',
  pattern: VOICED ? 'Video bài giảng · scaffold · có giọng đọc' : 'Video bài giảng · scaffold',
  duration: PLAY_DURATION,
  markers: TIMELINE.map((t) => ({ frame: t.start, label: `Câu ${String(t.n).padStart(2, '0')} · ${t.screen}` })),
};

export default function __COMPONENT_NAME__() {
  const frame = useFrame();
  return <Series sequences={SEQUENCES} frame={frame} />;
}
