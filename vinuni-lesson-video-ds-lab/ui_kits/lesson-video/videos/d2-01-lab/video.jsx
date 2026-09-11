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
import S17 from './s17.jsx';
import S18 from './s18.jsx';
import S19 from './s19.jsx';
import S20 from './s20.jsx';
import S21 from './s21.jsx';
import S22 from './s22.jsx';
import S23 from './s23.jsx';
import S24 from './s24.jsx';
import S25 from './s25.jsx';
import S26 from './s26.jsx';
import S27 from './s27.jsx';
import S28 from './s28.jsx';
import S29 from './s29.jsx';
import S30 from './s30.jsx';
import S31 from './s31.jsx';
import S32 from './s32.jsx';
import S33 from './s33.jsx';
import S34 from './s34.jsx';
import S35 from './s35.jsx';
import S36 from './s36.jsx';
import S37 from './s37.jsx';
import S38 from './s38.jsx';
import S39 from './s39.jsx';
import S40 from './s40.jsx';
import S41 from './s41.jsx';
import S42 from './s42.jsx';
import S43 from './s43.jsx';
import S44 from './s44.jsx';
import S45 from './s45.jsx';
import S46 from './s46.jsx';
import S47 from './s47.jsx';

/*
 * D2-01 (lab) · Tách yêu cầu giải pháp khỏi vấn đề cần giải quyết — 46 câu đọc + 1 khoảng dừng 5 giây.
 * Scenes are joined by hard cuts; within a part the same diagram carries over from câu to câu so the
 * viewer keeps their bearings (DAY02 feedback: scene changes felt too fast).
 */
const SCENES = [S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19, S20, S21, S22, S23, S24, S25, S26, S27, S28, S29, S30, S31, S32, S33, S34, S35, S36, S37, S38, S39, S40, S41, S42, S43, S44, S45, S46, S47];
const SEQUENCES = SCENES.map((component, i) => ({
  component,
  duration: TIMELINE[i].duration,
  authoredDuration: TIMELINE[i].duration !== TIMELINE[i].authored ? TIMELINE[i].authored : undefined,
  name: `Câu ${String(TIMELINE[i].n).padStart(2, '0')}`,
}));

export const meta = {
  id: 'd2-01-lab',
  title: 'D2-01 (lab) · Tách giải pháp khỏi vấn đề',
  pattern: VOICED ? 'Video bài giảng lab · 47 câu · có giọng đọc' : 'Video bài giảng lab · 47 câu',
  duration: PLAY_DURATION,
  markers: TIMELINE.map((t) => ({ frame: t.start, label: `Câu ${String(t.n).padStart(2, '0')} · ${t.screen}` })),
};

export default function D201LabVideo() {
  const frame = useFrame();
  return <Series sequences={SEQUENCES} frame={frame} />;
}
