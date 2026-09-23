import React from 'react';
import { SceneFrame } from '../../../../components/index.js';
import { cueCaptions, sliceCaptions } from '../../../../lib/index.js';
import { CUES } from './cues.js';
import { TIMELINE } from './timeline.js';

export const EYEBROW = '__TITLE__';
export const VIDEO_LABEL = '__ID__';

// Captions follow the playback timeline, mapped into each scene's authored frames (Series hands scenes
// authored time; with the measured cues.js the two are equal).
const CAPTIONS = cueCaptions(TIMELINE.map((t) => ({ start: t.start, end: t.end, text: t.text, pause: t.pause })));

export const cue = (n) => CUES[n - 1];
export const sceneLength = (n) => CUES[n - 1].end - CUES[n - 1].start;
export const captionsFor = (n) => {
  const t = TIMELINE[n - 1];
  if (!t.text) return [];
  const k = t.authored / t.duration;
  return sliceCaptions(CAPTIONS, t.start, t.duration).map((c) => ({
    start: Math.round(c.start * k),
    end: c.end === t.duration ? t.authored : Math.round(c.end * k),
    text: c.text,
  }));
};
export const footerFor = (n) => ({
  left: VIDEO_LABEL,
  right: `Câu ${String(n).padStart(2, '0')} / ${CUES.length}`,
});

/** Standard scene shell: header from cues.js (title, size, tag), footer, captions. */
export function Scene({ n, frame, overlay, title, tag, children }) {
  const c = cue(n);
  return (
    <SceneFrame
      frame={frame}
      eyebrow={EYEBROW}
      title={title ?? c.title}
      titleSize={c.titleSize}
      tag={tag === undefined ? c.tag : tag}
      footer={footerFor(n)}
      captions={captionsFor(n)}
      overlay={overlay}
    >
      {children}
    </SceneFrame>
  );
}
