import { CUES } from './cues.js';
import { VOICE } from './voice.js';

/**
 * Playback timeline. Chưa có giọng thì mỗi cue chạy đúng số frame ước lượng của kịch bản; có
 * `voice.js` (do `tools/voice-timing.mjs --write-cues` sinh) thì mỗi cue dài đúng giọng đo được +
 * khoảng nghỉ. Giọng không bao giờ bị kéo giãn — phần co giãn nằm ở ANIMATION, xem `stage.jsx`.
 */
const aligned = Boolean(
  VOICE &&
    VOICE.cues.length === CUES.length &&
    VOICE.cues.every((v, i) => v.n === CUES[i].n && v.text === CUES[i].text.trim()),
);

let cursor = 0;
export const TIMELINE = CUES.map((c, i) => {
  const authored = c.end - c.start;
  const v = aligned ? VOICE.cues[i] : null;
  const duration = v ? v.durationInFrames : authored;
  const t = {
    n: c.n,
    text: c.text,
    screen: c.screen,
    scene: c.scene,
    section: c.section,
    start: cursor,
    end: cursor + duration,
    duration,
    authored,
    pause: v ? duration - v.speechFrames : Math.round((c.pauseAfter ?? 1) * 30),
  };
  cursor += duration;
  return t;
});
export const PLAY_DURATION = cursor;
export const VOICED = aligned;
