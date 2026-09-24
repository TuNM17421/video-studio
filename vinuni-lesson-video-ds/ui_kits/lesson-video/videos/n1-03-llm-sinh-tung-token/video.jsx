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

/*
 * N1-03 · Mô hình ngôn ngữ tạo văn bản từng mảnh — style ILLUSTRATED (lab), 25 câu (phần 1–3).
 * Cảnh nối nhau bằng cắt cứng, nhưng hàng token "Tôi mang ô vì trời" đi xuyên suốt từ câu 05 tới câu 25:
 * mỗi cảnh chỉ biến đổi nó (đánh dấu, mọc mã số, mọc dãy số, nối thêm viên), không cảnh nào vẽ lại.
 * CHƯA CÓ GIỌNG: mỗi câu đang chạy theo `seconds` ước tính trong kịch bản; khi có bản thu,
 * tools/voice-timing.mjs --write-cues sẽ đổi sang độ dài đo được và Series tự co giãn nhịp trong cảnh.
 */
const SCENES = [S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19, S20, S21, S22, S23, S24, S25];
const SEQUENCES = SCENES.map((component, i) => ({
  component,
  duration: TIMELINE[i].duration,
  authoredDuration: TIMELINE[i].duration !== TIMELINE[i].authored ? TIMELINE[i].authored : undefined,
  name: `Câu ${String(TIMELINE[i].n).padStart(2, '0')}`,
}));

export const meta = {
  id: 'n1-03-llm-sinh-tung-token',
  title: 'N1-03 · Tạo văn bản từng mảnh',
  pattern: VOICED ? 'Video bài giảng illustrated · 25 câu · có giọng đọc' : 'Video bài giảng illustrated · 25 câu · chưa có giọng',
  duration: PLAY_DURATION,
  markers: TIMELINE.map((t) => ({ frame: t.start, label: `Câu ${String(t.n).padStart(2, '0')} · ${t.screen}` })),
};

export default function N103Video() {
  const frame = useFrame();
  return <Series sequences={SEQUENCES} frame={frame} />;
}
