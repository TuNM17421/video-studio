import React from 'react';
import { Eyebrow, SceneFrame, Whiteboard } from '../../../../components/index.js';
import { cueCaptions, useFrame } from '../../../../lib/index.js';
import { CAMERA, MARKS } from './board.js';
import { PLAY_DURATION, TIMELINE, VOICED } from './timeline.js';

/*
 * N2-00 · Giới thiệu ngày 2 — bản bảng trắng (whiteboard style, lab). Same narration and voice as
 * n2-00-gioi-thieu-ngay-2, drawn as ONE board: no scene cuts, the marker draws each mark on its beat
 * (board.js), an eraser clears the hook in câu 03, the camera moves to each part and pulls back to the
 * whole board in câu 16. The video frame drives everything — there is no Series and no rescaling:
 * beats are measured-voice frames (spokenAt over voice.js).
 */
const EYEBROW = 'NGÀY 02 · XÁC ĐỊNH ĐÚNG VẤN ĐỀ';
const CAPTIONS = cueCaptions(TIMELINE.map((t) => ({ start: t.start, end: t.end, text: t.text, pause: t.pause })));

export const meta = {
  id: 'n2-00-bang-trang',
  title: 'N2-00 · Giới thiệu ngày 2 (bảng trắng)',
  pattern: VOICED ? 'Bảng trắng · 16 câu · có giọng đọc' : 'Bảng trắng · 16 câu',
  duration: PLAY_DURATION,
  markers: TIMELINE.map((t) => ({ frame: t.start, label: `Câu ${String(t.n).padStart(2, '0')} · ${t.screen}` })),
};

export default function N200Whiteboard() {
  const frame = useFrame();
  const cue = TIMELINE.find((t) => frame >= t.start && frame < t.end) ?? TIMELINE[TIMELINE.length - 1];
  return (
    <SceneFrame
      frame={frame}
      header={false}
      captions={CAPTIONS}
      footer={{ left: 'N2-00 · Giới thiệu ngày 2 — bản bảng trắng', right: `Câu ${String(cue.n).padStart(2, '0')} / ${TIMELINE.length}` }}
      overlay={<Eyebrow>{EYEBROW}</Eyebrow>}
    >
      <Whiteboard frame={frame} marks={MARKS} camera={CAMERA} />
    </SceneFrame>
  );
}
