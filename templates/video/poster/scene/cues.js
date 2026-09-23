/**
 * __ID__ · __TITLE__ — khung sinh bởi `tools/new-video.mjs`, style poster-vector.
 *
 * Đây chỉ là scaffold: MỘT cue placeholder để `build`/`verify` chạy được ngay sau khi sinh. Thay
 * `text`/`visual` bằng lời đọc thật đã khoá (script-craft.md), rồi thêm cue theo mẫu bên dưới —
 * mỗi cue một `scene` (khớp `CHAPTERS` trong `stage.jsx`) và một `section` (khớp `SECTIONS`).
 *
 * `pauseAfter` (giây) là khoảng nghỉ CUỐI cue — chỗ duy nhất harness đặt được nghỉ.
 * Không còn dấu "(nghỉ…)" trong lời đọc: tách cue riêng, nghỉ nằm ở `pauseAfter`.
 */
import { VOICE } from './voice.js';
import { createSpeech } from '../../../../lib/speech.js';

/*
 * BA cue mẫu, KHÔNG phải một. Lý do (retro d05-v06, F7): `text-gate` đòi script có đủ nhịp câu
 * ngắn/vừa/dài và có connector, nên scaffold một cue luôn ĐỎ ngay lúc mới sinh — lane đầu tiên mất
 * thời gian tưởng mình làm sai. Ba cue dưới đây qua được mọi gate chữ; thay lời thật vào rồi chạy
 * lại `npm run text-gate -- <vdir>/cues.js`.
 */
const RAW = [
  {
    n: 1, frames: 150, speech: 150, pauseAfter: 0.8, section: 1, scene: 'intro',
    title: '__TITLE__',
    text: 'Placeholder câu dài: thay bằng câu mở đầu thật, câu nối vào video liền trước đấy, đừng để nguyên dòng này khi khoá lời.',
    visual: '(placeholder — mô tả hình cho câu 1)',
  },
  {
    n: 2, frames: 120, speech: 120, pauseAfter: 0.6, section: 1, scene: 'intro',
    text: 'Rồi placeholder câu vừa: thay bằng câu thứ hai, câu này phải bắt vào ý của câu trước.',
    visual: '(placeholder — mô tả hình cho câu 2)',
  },
  {
    n: 3, frames: 78, speech: 78, pauseAfter: 1.0, section: 1, scene: 'intro',
    text: 'Thì placeholder câu ngắn nhé.',
    visual: '(placeholder — mô tả hình cho câu 3)',
  },
  // ── Câu trắc nghiệm 1 ── §3i.3: tình huống sản phẩm · ba lựa chọn · MỘT khe lặng · đáp án gọn.
  {
    n: 4, frames: 165, speech: 165, pauseAfter: 0.5, section: 9, scene: 'quiz-1',
    text: 'Câu số một, placeholder tình huống sản phẩm thật: lựa chọn một, placeholder lỗi thật thứ nhất; lựa chọn hai, placeholder lỗi thật thứ hai.',
    visual: 'thẻ câu hỏi 1, hai lựa chọn đầu hiện ra',
  },
  {
    n: 5, frames: 72, speech: 72, pauseAfter: 0.4, section: 9, scene: 'quiz-1',
    text: 'Hoặc ba, placeholder lựa chọn đúng.',
    visual: 'lựa chọn ba hiện ra',
    tag: 'CÂU HỎI',
  },
  {
    n: 6, frames: 90, speech: 0, pauseAfter: 0, section: 9, scene: 'quiz-1',
    text: '',
    visual: 'ba thẻ đứng yên — khe lặng ba giây cho người xem nghĩ',
    silent: true, quiz: true,
  },
  {
    n: 7, frames: 66, speech: 66, pauseAfter: 0.8, section: 9, scene: 'quiz-1',
    text: 'Vậy đáp án là số ba nhé.',
    visual: 'thẻ ba sáng lên, hai thẻ kia mờ đi',
  },
  // ── Câu trắc nghiệm 2 ── §3i.3: tình huống sản phẩm · ba lựa chọn · MỘT khe lặng · đáp án gọn.
  {
    n: 8, frames: 165, speech: 165, pauseAfter: 0.5, section: 9, scene: 'quiz-2',
    text: 'Câu số hai, placeholder tình huống sản phẩm thật: lựa chọn một, placeholder lỗi thật thứ nhất; lựa chọn hai, placeholder lỗi thật thứ hai.',
    visual: 'thẻ câu hỏi 2, hai lựa chọn đầu hiện ra',
  },
  {
    n: 9, frames: 72, speech: 72, pauseAfter: 0.4, section: 9, scene: 'quiz-2',
    text: 'Hoặc ba, placeholder lựa chọn đúng.',
    visual: 'lựa chọn ba hiện ra',
    tag: 'CÂU HỎI',
  },
  {
    n: 10, frames: 90, speech: 0, pauseAfter: 0, section: 9, scene: 'quiz-2',
    text: '',
    visual: 'ba thẻ đứng yên — khe lặng ba giây cho người xem nghĩ',
    silent: true, quiz: true,
  },
  {
    n: 11, frames: 66, speech: 66, pauseAfter: 0.8, section: 9, scene: 'quiz-2',
    text: 'Vậy đáp án là số ba nhé.',
    visual: 'thẻ ba sáng lên, hai thẻ kia mờ đi',
  },
  // ── Câu trắc nghiệm 3 ── §3i.3: tình huống sản phẩm · ba lựa chọn · MỘT khe lặng · đáp án gọn.
  {
    n: 12, frames: 165, speech: 165, pauseAfter: 0.5, section: 9, scene: 'quiz-3',
    text: 'Câu số ba, placeholder tình huống sản phẩm thật: lựa chọn một, placeholder lỗi thật thứ nhất; lựa chọn hai, placeholder lỗi thật thứ hai.',
    visual: 'thẻ câu hỏi 3, hai lựa chọn đầu hiện ra',
  },
  {
    n: 13, frames: 72, speech: 72, pauseAfter: 0.4, section: 9, scene: 'quiz-3',
    text: 'Hoặc ba, placeholder lựa chọn đúng.',
    visual: 'lựa chọn ba hiện ra',
    tag: 'CÂU HỎI',
  },
  {
    n: 14, frames: 90, speech: 0, pauseAfter: 0, section: 9, scene: 'quiz-3',
    text: '',
    visual: 'ba thẻ đứng yên — khe lặng ba giây cho người xem nghĩ',
    silent: true, quiz: true,
  },
  {
    n: 15, frames: 66, speech: 66, pauseAfter: 0.8, section: 9, scene: 'quiz-3',
    text: 'Vậy đáp án là số ba nhé.',
    visual: 'thẻ ba sáng lên, hai thẻ kia mờ đi',
  },
];

export const SECTIONS = [
  { n: 1, title: 'Mở đầu' },
  { n: 9, title: 'Kiểm tra nhanh' },
];

const FPS = 30;
let cursor = 0;
export const CUES = RAW.map((c) => {
  const start = cursor;
  cursor += c.frames ?? Math.round((c.seconds ?? 3) * FPS);
  return { ...c, screen: c.title ?? c.text.slice(0, 52), start, end: cursor };
});
export const DURATION = cursor;

export const { spokenAt, speechEnd } = createSpeech(RAW, VOICE);
