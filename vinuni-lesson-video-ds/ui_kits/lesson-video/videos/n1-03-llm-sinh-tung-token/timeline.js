import { CUES } from './cues.js';
import { VOICE } from './voice.js';

/**
 * Playback timeline. Without a recording every câu plays for its authored (script-estimate) frames.
 * With voice.js (tools/voice-timing.mjs) each câu lasts exactly its measured narration + pause, and
 * Series rescales the scene's authored beats into that window — the voice is never stretched.
 *   { n, text, screen, start, end, duration, authored, pause }   (frames, output timeline)
 */
let cursor = 0;
export const TIMELINE = CUES.map((c, i) => {
  const authored = c.end - c.start;
  const v = VOICE ? VOICE.cues[i] : null;
  if (v && (v.n !== c.n || v.text !== c.text.trim())) throw new Error(`voice.js câu ${v.n} does not match cues.js — re-run tools/voice-timing.mjs`);
  const duration = v ? v.durationInFrames : authored;
  const t = { n: c.n, text: c.text, screen: c.screen, start: cursor, end: cursor + duration, duration, authored, pause: v ? duration - v.speechFrames : (c.silent ? duration : 42) };
  cursor += duration;
  return t;
});
export const PLAY_DURATION = cursor;
export const VOICED = Boolean(VOICE);
