/**
 * Mẫu · Griffin kể năm bước làm video trong Studio — video mẫu của chế độ tập (tour hướng dẫn).
 * Source: projects/mau-huong-dan/kich-ban-goc.md, 8 câu đọc.
 *
 * Một cue = một câu được đọc = một cảnh. `text` là lời đọc đã khoá, chép nguyên văn từ kịch bản.
 * `speaker` Griffin mượn giọng Nhật Phong (voices.json). `delivery` là kiểu đọc (voices.json → deliveries).
 * `frames` / `speech` do tools ghi vào sau khi có giọng; trước đó dùng ước lượng `seconds`.
 */
import { VOICE } from './voice.js';
import { createSpeech } from '../../../../lib/speech.js';

const RAW = [
  // ── Phần 1 · Chào bạn ─────────────────────────────────────────────────────
  {
    n: 1, frames: 124, speech: 94, seconds: 5, section: 1, speaker: 'Griffin', delivery: 'ke',
    title: 'Griffin · Linh vật VinUni',
    text: 'Xin chào, mình là Griffin, linh vật của VinUni.',
    visual: 'Griffin bước vào từ mép phải và vẫy cánh chào; tên GRIFFIN · Linh vật VinUni',
  },
  {
    n: 2, frames: 139, speech: 109, seconds: 7, section: 1, speaker: 'Griffin', delivery: 'giang',
    title: 'Từ kịch bản thành video',
    text: 'Hôm nay mình kể bạn nghe một kịch bản trở thành video bài giảng như thế nào.',
    visual: 'Tệp kịch bản → mũi tên → khung video',
  },
  // ── Phần 2 · Năm bước ─────────────────────────────────────────────────────
  {
    n: 3, frames: 132, speech: 102, seconds: 5, section: 2, speaker: 'Griffin', delivery: 'ke',
    title: 'Bước 1 · Kế hoạch',
    text: 'Đầu tiên, bạn chọn style và thả kịch bản vào Studio.',
    visual: 'Bước 1 · Kế hoạch — chọn style, thả kịch bản',
  },
  {
    n: 4, frames: 159, speech: 129, seconds: 6, section: 2, speaker: 'Griffin', delivery: 'giang',
    title: 'Bước 2 · Lời & cue',
    text: 'Sau đó, agent cắt kịch bản thành từng câu và giữ nguyên văn từng chữ.',
    visual: 'Bước 2 · Lời & cue — kịch bản tách thành các dòng câu đánh số',
  },
  {
    n: 5, frames: 147, speech: 117, seconds: 7, section: 2, speaker: 'Griffin', delivery: 'giang',
    title: 'Bước 3 · Giọng đọc → Bước 4 · Dựng cảnh',
    text: 'Giọng đọc được thu trước, rồi mỗi cảnh được dựng đúng theo độ dài của giọng thật.',
    visual: 'Bước 3 · Giọng đọc và Bước 4 · Dựng cảnh — dạng sóng giọng, các cảnh xếp theo đúng độ dài',
  },
  {
    n: 6, frames: 164, speech: 134, seconds: 6, section: 2, speaker: 'Griffin', delivery: 'ke',
    title: 'Bước 5 · Render',
    text: 'Cuối cùng, Studio ghép hình, giọng và nhạc nền thành một tệp video.',
    visual: 'Bước 5 · Render — hình + giọng + nhạc nền → MP4',
  },
  // ── Phần 3 · Đến lượt bạn ─────────────────────────────────────────────────
  {
    n: 7, frames: 189, speech: 159, seconds: 7, section: 3, speaker: 'Griffin', delivery: 'nhan',
    title: 'Duyệt từng bước',
    text: 'Xong mỗi bước, bạn duyệt rồi mới đi tiếp, nên không có gì chạy ngoài ý muốn.',
    visual: 'Năm bước nối nhau, mỗi bước một dấu duyệt ✓',
  },
  {
    n: 8, frames: 79, speech: 49, seconds: 4, section: 3, speaker: 'Griffin', delivery: 'ke',
    title: 'Đến lượt bạn!',
    text: 'Giờ thì đến lượt bạn thử rồi đó!',
    visual: 'Griffin reo vui, hai cánh giơ cao',
  },
];

export const SECTIONS = [
  'Chào bạn',
  'Năm bước',
  'Đến lượt bạn',
];

const FPS = 30;
let cursor = 0;
export const CUES = RAW.map((c) => {
  const start = cursor;
  cursor += c.frames ?? c.seconds * FPS;
  return { ...c, screen: c.title, start, end: cursor };
});
export const DURATION = cursor;

export const { spokenAt, speechEnd, spokenWords } = createSpeech(RAW, VOICE);
