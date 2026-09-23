import React from 'react';
import { Series, useFrame } from '../../../../lib/index.js';
import { PLAY_DURATION, TIMELINE, VOICED } from './timeline.js';
import { Cue } from './shared.jsx';

/*
 * __ID__ · __TITLE__ — scaffold dòng poster.
 *
 * `SEQUENCES` dựng THẲNG TỪ `TIMELINE` — **một sequence mỗi cue, tự động**. KHÔNG cần một file
 * `sNN.jsx` cho mỗi cue: `Cue` (trong `shared.jsx`) tra `TIMELINE[n-1]` rồi giao cho đúng component
 * chương. Thêm cue vào `cues.js` là có thêm sequence, không phải sửa file này.
 * (Retro d05-v06 F8: `video-anatomy.md` từng ghi "một file mỗi cue" — sai, và bốn lane phải đọc
 * source mới biết. Scaffold cũ cũng chỉ dựng 1 sequence cho 3 cue nên cue 2–3 ra KHUNG RỖNG.)
 *
 * KHÔNG khai `transition` (dòng poster không dùng — cầu nối đã làm việc chuyển chương) và KHÔNG
 * khai `authoredDuration` (rescale tính trên biên CẢNH, do `stage.jsx`/`chapterTime()` làm — xem
 * `styles/poster.md`).
 */
const SEQUENCES = TIMELINE.map((t) => ({
  component: function CueSequence() { return <Cue n={t.n} />; },
  duration: t.duration,
  name: `Câu ${String(t.n).padStart(3, '0')} · ${t.scene}`,
}));

export const meta = {
  id: '__ID__',
  title: '__TITLE__',
  pattern: VOICED ? 'Poster vector · scaffold · có giọng đọc' : 'Poster vector · scaffold',
  duration: PLAY_DURATION,
  markers: TIMELINE.map((t) => ({ frame: t.start, label: `Câu ${String(t.n).padStart(2, '0')} · ${t.screen}` })),
};

export default function __COMPONENT_NAME__() {
  return <Series sequences={SEQUENCES} frame={useFrame()} />;
}
