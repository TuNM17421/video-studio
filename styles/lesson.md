---
style: lesson
---

# Lesson Style — dựng cảnh

Phần riêng của style Lesson cho bước 3 của skill `make-video`. Phần lõi (thời lượng theo giọng, beat theo
`spokenAt`, phụ đề, không bịa số, build/verify/QA) nằm trong `.claude/skills/make-video/SKILL.md`.
Lesson Lab kế thừa file này (`styles/lesson-lab.md` chỉ ghi phần thêm).

Video mẫu: `vinuni-lesson-video-ds/ui_kits/lesson-video/videos/d2-01-lab/` (+ `projects/d2-01-lab/PROMPTS.md`);
bản ngắn hơn: `n2-00-gioi-thieu-ngay-2/`.

## Dựng cảnh

- **Mỗi câu một cảnh.** Files như video mẫu: `shared.jsx` (eyebrow, phụ đề, khung chung), `sNN.jsx` (một
  file mỗi câu, mọi mốc trong object `T`), `video.jsx` (`Series` trên `TIMELINE`), `timeline.js`, `card.html`,
  `player.html`, `STORYBOARD.md`.
- Vùng nội dung y 250–960; chữ Montserrat; connector = hạt chạy trên đường đã vẽ, ẩn trên mặt thẻ, một
  pulse mỗi lần tới nơi.
- Nhiều nhóm cảnh có thể dựng song song bằng agent fork.

### Lỗi hay gặp (QA d1, 09/2026) — soát từng cảnh

1. `HookOverlay` che cảnh 1 dưới nền trắng 96–150 f đầu, còn `spokenAt` cố định theo giọng: kẹp mọi beat
   neo vào cụm từ đọc trong lúc hook (`Math.max(spokenAt(N, …), T.hook)`) hoặc rút ngắn hook cho tới khi cụm
   từ neo đầu tiên rơi sau lúc nền mờ đi.
2. Không vẽ connector hay hạt tới một ô trống: thẻ trước, hạt sau, một pulse.
3. Nhãn cách viền ≥ 24 px và cách chữ khác ≥ 32 px — không kẹp giữa hai viền hay chạm mép pill / thẻ; khái
   niệm chính của câu là chữ to nhất trong sơ đồ (pill `label` của `GlassBox`, không phải một nhãn rời 18 px).
4. Thẻ bắt đầu trong khung và đi theo một làn trống — không trượt từ ngoài vào ngang qua mặt thẻ khác.
5. Các câu liên tiếp trên cùng một sơ đồ giữ khung và chỉ đổi chữ — giữ vị trí, màu, tên nhãn; không xoá
   trắng rồi vẽ lại đúng chỗ đó (một giây trống).

## Tiêu chí QA

- Không có connector hay hạt nào chạy tới một ô còn trống.
- Nhãn không chạm viền thẻ / pill, không kẹp giữa hai viền.
- Hai câu liên tiếp trên cùng một sơ đồ giữ nguyên vị trí và màu của các thẻ.
