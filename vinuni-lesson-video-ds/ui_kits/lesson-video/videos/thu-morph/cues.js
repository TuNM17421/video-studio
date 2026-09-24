/**
 * THỬ NGHIỆM — clip 20 giây kiểm một câu hỏi kỹ thuật duy nhất: biến hình (morph) có gánh nổi phần
 * "toán học biến hình" kiểu 3Blue1Brown trên NỀN TRẮNG hiện tại hay không.
 *
 * Không có lời đọc: bốn cue đều `silent`, chữ trên màn hình là chữ của hình. Mục đích là tách biến số
 * cần duyệt (nền tối, bảng màu mới) ra khỏi biến số cần kỹ thuật (morph, thang độ đậm nhạt, nhịp chậm).
 */
import { createSpeech } from '../../../../lib/speech.js';
import { VOICE } from './voice.js';

const RAW = [
  { n: 1, seconds: 5, section: 1, silent: true, title: 'Một token là một dãy số', text: '', visual: 'Ô token và dải tám ô giá trị, khung bao quanh dải.' },
  { n: 2, seconds: 5, section: 1, silent: true, title: 'Dãy số ấy là một mũi tên', text: '', visual: 'Khung bao BIẾN HÌNH thành mũi tên từ gốc toạ độ; trục hiện ở 15%.' },
  { n: 3, seconds: 5, section: 1, silent: true, title: 'Token thứ hai, mũi tên thứ hai', text: '', visual: 'Dải thứ hai ở 40% biến hình thành mũi tên thứ hai.' },
  { n: 4, seconds: 5, section: 1, silent: true, title: 'Gần nghĩa thì góc nhỏ', text: '', visual: 'Cung góc giữa hai mũi tên; mũi tên thứ hai quay lại gần, góc hẹp dần.' },
];

export const SECTIONS = ['Thử biến hình'];

const FPS = 30;
let cursor = 0;
export const CUES = RAW.map((c) => {
  const start = cursor;
  cursor += c.frames ?? c.seconds * FPS;
  return { ...c, screen: c.title, start, end: cursor };
});
export const DURATION = cursor;

export const { spokenAt, speechEnd } = createSpeech(RAW, VOICE);
