import React from 'react';
import { DayMap, SceneFrame } from '../../../../components/index.js';
import { cueCaptions, pulse, sliceCaptions, smooth } from '../../../../lib/index.js';
import { CUES } from './cues.js';
import { TIMELINE } from './timeline.js';

export const EYEBROW = 'NGÀY 02 · XÁC ĐỊNH ĐÚNG VẤN ĐỀ';
export const VIDEO_LABEL = 'N2-00 · Giới thiệu ngày 2';

/*
 * The day map: the three questions of câu 03, each holding two of the six parts of câu 04–15.
 * Part labels shorten the script's part titles; nothing is added that the narration does not say.
 */
export const ZONES = [
  { title: 'XÁC ĐỊNH VIỆC', question: ['Cần cải thiện gì?'], parts: [{ n: 1, label: 'Tìm khó khăn' }, { n: 2, label: 'Mô tả và đo' }] },
  { title: 'CHỌN CÁCH', question: ['Làm thế nào?'], parts: [{ n: 3, label: 'AI có giúp?' }, { n: 4, label: 'Tổ chức việc' }] },
  { title: 'KIỂM TRA ĐIỀU KIỆN', question: ['Đã sẵn sàng chưa?'], parts: [{ n: 5, label: 'Kết quả và lỗi' }, { n: 6, label: 'Quyết định' }] },
];

/** Câu 16 brings the same three cards back with the questions the day answers. */
export const CLOSING_ZONES = [
  { ...ZONES[0], title: 'CẦN AI?', question: ['Bài toán có', 'cần AI?'] },
  { ...ZONES[1], title: 'AI LÀM GÌ?', question: ['AI làm thay', 'hay hỗ trợ?'] },
  { ...ZONES[2], title: 'LÀM TIẾP HAY DỪNG?', question: ['Làm tiếp, chuẩn bị', 'thêm hay dừng?'] },
];

/** Content area of câu 04–15, below the docked day map (strip bottom = 384). */
export const CONTENT = { top: 410, bottom: 960, left: 80, right: 1840 };

// Captions follow the playback timeline (measured narration when voice.js is bound) and are then mapped
// into the scene's authored frames, because Series hands scenes authored time.
const CAPTIONS = cueCaptions(TIMELINE.map((t) => ({ start: t.start, end: t.end, text: t.text, pause: t.pause })));

export const cue = (n) => CUES[n - 1];
export const captionsFor = (n) => {
  const t = TIMELINE[n - 1];
  const k = t.authored / t.duration;
  return sliceCaptions(CAPTIONS, t.start, t.duration).map((c) => ({
    start: Math.round(c.start * k),
    end: c.end === t.duration ? t.authored : Math.round(c.end * k),
    text: c.text,
  }));
};
export const footerFor = (n) => ({
  left: `${VIDEO_LABEL} — xác định đúng việc cần giải quyết`,
  right: `Câu ${String(n).padStart(2, '0')} / ${CUES.length}`,
});

/**
 * Shell for câu 04–15: header + the docked day map with the active part lit (+ a one-time glow on the
 * first scene of each part). `dockIn` animates the map from the full layout of câu 03 into the strip.
 */
export function PartScene({ n, frame, dockIn = false, overlay, children }) {
  const c = cue(n);
  const firstOfPart = CUES.findIndex((x) => x.mapPart === c.mapPart) === n - 1;
  const dock = dockIn ? smooth(frame, 0, 36) : 1;
  const glow = firstOfPart ? pulse(frame, dockIn ? 34 : 4, 60) : 0;
  return (
    <SceneFrame
      frame={frame}
      eyebrow={EYEBROW}
      title={c.title}
      titleSize={c.titleSize}
      tag={c.tag}
      footer={footerFor(n)}
      captions={captionsFor(n)}
      overlay={overlay}
    >
      <DayMap zones={ZONES} dock={dock} activePart={c.mapPart - 1} activeGlow={glow} />
      {children}
    </SceneFrame>
  );
}
