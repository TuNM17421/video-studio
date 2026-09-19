import React from 'react';
import { Series, useFrame } from '../../../../lib/index.js';
import { PLAY_DURATION, TIMELINE, VOICED } from './timeline.js';
import S01 from './s01.jsx';
import S02 from './s02.jsx';
import S03 from './s03.jsx';
import S04 from './s04.jsx';
import S05 from './s05.jsx';
import S06 from './s06.jsx';
import S07 from './s07.jsx';
import S08 from './s08.jsx';

/*
 * Mẫu · Griffin kể năm bước làm video trong Studio — 8 cue, một người dẫn (Griffin, giọng Nhật Phong).
 * Video mẫu của chế độ tập trong tour hướng dẫn. Mỗi cue là một cảnh, dài đúng bằng câu đọc đã đo.
 */
const SCENES = [S01, S02, S03, S04, S05, S06, S07, S08];
const SEQUENCES = SCENES.map((component, i) => ({
  component,
  duration: TIMELINE[i].duration,
  authoredDuration: TIMELINE[i].duration !== TIMELINE[i].authored ? TIMELINE[i].authored : undefined,
  name: `Câu ${String(TIMELINE[i].n).padStart(3, '0')}`,
}));

export const meta = {
  id: 'mau-huong-dan',
  title: 'Mẫu · Griffin kể năm bước làm video',
  pattern: VOICED ? 'Video mẫu · 8 câu · có giọng đọc' : 'Video mẫu · 8 câu',
  duration: PLAY_DURATION,
  markers: TIMELINE.map((t) => ({ frame: t.start, label: `Câu ${String(t.n).padStart(3, '0')} · ${t.screen}` })),
};

export default function Video() {
  const frame = useFrame();
  return <Series sequences={SEQUENCES} frame={frame} />;
}
