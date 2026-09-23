/**
 * __ID__ · __TITLE__ — khung sinh bởi `tools/new-video.mjs`, style slide-vector.
 *
 * Đây chỉ là scaffold: MỘT cue placeholder để `build`/`verify` chạy được ngay sau khi sinh. Thay
 * `text`/`visual` bằng lời đọc thật đã khoá (script-craft.md), rồi thêm cue theo mẫu bên dưới —
 * mỗi cue một `section` (khớp `SECTIONS`, dùng cho chapters ở stage deliver).
 *
 * `pauseAfter` (giây) là khoảng nghỉ CUỐI cue — chỗ duy nhất harness đặt được nghỉ.
 */
import { VOICE } from './voice.js';
import { createSpeech } from '../../../../lib/speech.js';

const RAW = [
  {
    n: 1, frames: 200, speech: 160, seconds: 7, section: 1, voice: '[warmly]',
    title: '__TITLE__', tag: 'MỞ ĐẦU',
    text: '(placeholder — thay bằng câu đọc đầu tiên đã khoá)',
    visual: '(placeholder — mô tả bố cục cho câu 1)',
  },
];

export const SECTIONS = [
  { n: 1, title: 'Mở đầu' },
];

const FPS = 30;
let cursor = 0;
export const CUES = RAW.map((c) => {
  const start = cursor;
  cursor += c.frames ?? Math.round((c.seconds ?? 3) * FPS);
  return { ...c, screen: c.title, start, end: cursor };
});
export const DURATION = cursor;

export const { spokenAt, speechEnd } = createSpeech(RAW, VOICE);
