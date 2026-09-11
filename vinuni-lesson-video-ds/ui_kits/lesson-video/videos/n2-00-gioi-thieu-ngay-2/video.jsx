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
import S09 from './s09.jsx';
import S10 from './s10.jsx';
import S11 from './s11.jsx';
import S12 from './s12.jsx';
import S13 from './s13.jsx';
import S14 from './s14.jsx';
import S15 from './s15.jsx';
import S16 from './s16.jsx';

/*
 * N2-00 · Giới thiệu ngày 2 — the complete reference video (16 câu; 5 040 f authored = 02:48).
 * Scenes are joined by hard cuts; one day map persists and lights the part being introduced.
 * With voice.js bound, every câu lasts its measured narration and its authored beats are rescaled.
 */
const SCENES = [S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12, S13, S14, S15, S16];
const SEQUENCES = SCENES.map((component, i) => ({
  component,
  duration: TIMELINE[i].duration,
  authoredDuration: TIMELINE[i].duration !== TIMELINE[i].authored ? TIMELINE[i].authored : undefined,
  name: `Câu ${String(TIMELINE[i].n).padStart(2, '0')}`,
}));

export const meta = {
  id: 'n2-00-gioi-thieu-ngay-2',
  title: 'N2-00 · Giới thiệu ngày 2',
  pattern: VOICED ? 'Video tổng quan · 16 câu · có giọng đọc' : 'Video tổng quan · 16 câu',
  duration: PLAY_DURATION,
  markers: TIMELINE.map((t) => ({ frame: t.start, label: `Câu ${String(t.n).padStart(2, '0')} · ${t.screen}` })),
};

export default function N200Video() {
  const frame = useFrame();
  return <Series sequences={SEQUENCES} frame={frame} />;
}
