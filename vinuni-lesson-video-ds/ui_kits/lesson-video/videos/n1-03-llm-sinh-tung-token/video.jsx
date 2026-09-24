import React from 'react';
import { Eyebrow, SceneFrame } from '../../../../components/index.js';
import { cueCaptions, useFrame } from '../../../../lib/index.js';
import { PLAY_DURATION, TIMELINE, VOICED } from './timeline.js';
import CanvasLayer, { CAMERA, ZONES } from './canvas.jsx';

/*
 * N1-03 · Mô hình tạo văn bản từng mảnh — style ILLUSTRATED (lab), 25 câu (phần 1–3).
 *
 * MỘT mặt phẳng cho cả video, camera đi trên nó: không Series, không cảnh, không tiêu đề cảnh. Chữ cần
 * thấy nằm trên chính mặt phẳng, cạnh thứ nó chú thích. Bố cục và mốc camera ở canvas.jsx.
 * Bản dựng trước (25 SceneFrame rời) đọc ra giống Lesson Lab vì cái vỏ quyết định thị giác mạnh hơn nội
 * dung bên trong; xem lịch sử git nếu cần đối chiếu.
 *
 * CHƯA CÓ GIỌNG: mốc camera và nhịp đang tính theo `seconds` ước tính trong kịch bản. Khi có bản thu,
 * tools/voice-timing.mjs --write-cues ghi độ dài đo được vào cues.js; mốc camera tự dịch theo vì chúng
 * lấy từ CUES, nhưng PHẢI chụp lại QA — câu nào đọc nhanh hơn dự tính sẽ làm một vài nhịp hụt.
 */
const EYEBROW = 'NGÀY 01 · CÁCH MÔ HÌNH TẠO VĂN BẢN';
const CAPTIONS = cueCaptions(TIMELINE.map((t) => ({ start: t.start, end: t.end, text: t.text, pause: t.pause })));

export const meta = {
  id: 'n1-03-llm-sinh-tung-token',
  title: 'N1-03 · Tạo văn bản từng mảnh',
  pattern: VOICED ? 'Illustrated · 25 câu · có giọng đọc' : 'Illustrated · 25 câu · chưa có giọng',
  duration: PLAY_DURATION,
  markers: TIMELINE.map((t) => ({ frame: t.start, label: `Câu ${String(t.n).padStart(2, '0')} · ${t.screen}` })),
  // giao mặt phẳng cho tools/verify.mjs soát: cụm nào bị eyebrow / thanh phụ đề đè khi camera lia hoặc zoom
  canvas: { zones: ZONES, camera: CAMERA },
};

export default function N103Video() {
  const frame = useFrame();
  const cue = TIMELINE.find((t) => frame >= t.start && frame < t.end) ?? TIMELINE[TIMELINE.length - 1];
  return (
    <SceneFrame
      frame={frame}
      header={false}
      captions={CAPTIONS}
      footer={{ left: 'N1-03 · Tạo văn bản từng mảnh', right: `Câu ${String(cue.n).padStart(2, '0')} / ${TIMELINE.length}` }}
      overlay={<Eyebrow>{EYEBROW}</Eyebrow>}
    >
      <CanvasLayer frame={frame} />
    </SceneFrame>
  );
}
