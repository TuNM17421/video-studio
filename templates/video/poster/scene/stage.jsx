/**
 * Bảng cảnh của RIÊNG video này + nối vào sân khấu poster dùng chung (`lib/poster/stage.jsx`).
 * Engine (ánh xạ frame→T, header chương, thanh phụ đề, scale 1600×900 → 1920×1080) sống ở đó —
 * KHÔNG port lại (retro 21/09/2026, mục 3.2).
 *
 * `dur` = giây authored của từng cảnh; thêm cảnh/chương mới thì thêm vào `CHAPTERS` bên dưới, khớp
 * `scene` đã khai trong `cues.js`. `key` = tên mà `shared.jsx` tra trong `CHAPTER_COMPONENT`.
 */
import { createPosterStage } from '../../../../lib/poster/stage.jsx';
import { spokenAt } from './cues.js';
import { PLAY_DURATION, TIMELINE } from './timeline.js';

export const CHAPTERS = [
  { id: 'intro', header: null, scenes: [{ id: 'intro', key: 'Intro', dur: 12 }] },
  // Ba câu trắc nghiệm ở cuối là LUẬT của series (`script-craft.md` §3i.3) — scaffold sinh sẵn
  // khung để `storyboard-gate` G7 xanh ngay; thay nội dung thật vào, đừng xoá cấu trúc.
  { id: 'quiz', header: 'Kiểm tra nhanh', scenes: [
    { id: 'quiz-1', key: 'Quiz1', dur: 13 },
    { id: 'quiz-2', key: 'Quiz2', dur: 13 },
    { id: 'quiz-3', key: 'Quiz3', dur: 13 },
  ] },
];

/*
 * THEME — trục THỨ HAI, độc lập với ngôn ngữ chuyển động (Thái chốt 22/09/2026).
 * `vinuni-light` (NỀN TRẮNG + bảng màu VinUni) là MẶC ĐỊNH của series và là thứ scaffold này sinh
 * ra. `night` (nền đêm) chỉ dùng khi `REQUEST.md` khai rõ `theme: night` VÀ owner xác nhận bằng
 * chữ — nó là thiết kế riêng của video demo, không phải nhận diện của series.
 * Bảng theme: `vinuni-lesson-video-ds/lib/poster/theme.jsx`.
 */
export const { SCENE_PLAN, sceneOf, chapterTime, beatT, PosterStage, theme } = createPosterStage({
  CHAPTERS,
  TIMELINE,
  spokenAt,
  theme: 'vinuni-light',
});
export { PLAY_DURATION };
