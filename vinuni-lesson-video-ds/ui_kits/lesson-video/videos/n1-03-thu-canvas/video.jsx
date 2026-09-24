import React from 'react';
import { Eyebrow, SceneFrame } from '../../../../components/index.js';
import { cueCaptions, useFrame } from '../../../../lib/index.js';
import { PLAY_DURATION, TIMELINE, VOICED } from './timeline.js';
import CanvasLayer, { CAMERA, ZONES } from './canvas.jsx';

/*
 * THỬ NGHIỆM — N1-03 câu 05–10 trên MỘT mặt phẳng + camera.
 * Không Series, không cảnh, không tiêu đề cảnh: chỉ một SceneFrame header={false} bọc lấy canvas.jsx.
 * Chữ cần thấy nằm trên chính mặt phẳng, cạnh thứ nó chú thích. Dựng để đặt cạnh bản
 * n1-03-llm-sinh-tung-token (25 cảnh có khung) mà so xem cơ chế có làm nên khác biệt thị giác không.
 */
const EYEBROW = 'NGÀY 01 · CÁCH MÔ HÌNH TẠO VĂN BẢN';
const CAPTIONS = cueCaptions(TIMELINE.map((t) => ({ start: t.start, end: t.end, text: t.text, pause: t.pause })));

export const meta = {
  id: 'n1-03-thu-canvas',
  title: 'N1-03 (thử) · Một mặt phẳng + camera',
  pattern: VOICED ? 'Illustrated canvas · 6 câu · có giọng đọc' : 'Illustrated canvas · 6 câu · chưa có giọng',
  duration: PLAY_DURATION,
  markers: TIMELINE.map((t) => ({ frame: t.start, label: `Câu ${String(t.n).padStart(2, '0')} · ${t.screen}` })),
  // Illustrated: mặt phẳng + camera giao cho tools/verify.mjs soát (checkCanvas: cụm bị chrome đè khi lia/zoom).
  canvas: { zones: ZONES, camera: CAMERA },
};

export default function N103CanvasThu() {
  const frame = useFrame();
  const cue = TIMELINE.find((t) => frame >= t.start && frame < t.end) ?? TIMELINE[TIMELINE.length - 1];
  return (
    <SceneFrame
      frame={frame}
      header={false}
      captions={CAPTIONS}
      footer={{ left: 'N1-03 (thử) · một mặt phẳng + camera', right: `Câu ${String(cue.n).padStart(2, '0')} / ${TIMELINE.length}` }}
      overlay={<Eyebrow>{EYEBROW}</Eyebrow>}
    >
      <CanvasLayer frame={frame} />
    </SceneFrame>
  );
}
