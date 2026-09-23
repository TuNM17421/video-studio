# __ID__ — __TITLE__

> Khung sinh bởi `tools/new-video.mjs`. Điền các mục dưới trước khi mở cue đầu tiên — đọc
> `templates/briefs/owner-checklist.md` §Cổng 0 trước khi khoá.

- **motion**: `slide`
  TRỤC 1 — NGÔN NGỮ CHUYỂN ĐỘNG. `poster` (full-frame, carrier đi xuyên phim, mốc nhấn neo vào từ
  được nói thật) hoặc `slide` (cắt thẳng giữa scene, không nảy chữ). Doctrine: `styles/poster.md`
  cho `poster`, DS `README.md` §"Mười hai luật cốt lõi" cho `slide`.
- **theme**: `vinuni-light`
  TRỤC 2 — MÀU VÀ NỀN, độc lập với trục 1. `vinuni-light` = **NỀN TRẮNG + bảng màu VinUni**, nhận
  diện BẤT BIẾN của series, và là mặc định. `night` (nền đêm) là thiết kế riêng của video demo:
  chỉ dùng khi dòng này ghi `night` **VÀ** owner đã xác nhận bằng chữ trong mục "Ghi chú".
  **Hai trục này ĐỘC LẬP** — "poster" KHÔNG có nghĩa là nền đêm. Hiểu lẫn hai trục ngày 22/09/2026
  tốn ≈0,75M token và 1h50 để re-theme lại 36 cảnh.
- **prev**: `<id video liền trước>` — ý/hình ảnh sẽ gọi lại: `<một câu>`
  (`KHÔNG CÓ (video đầu series)` nếu không có). Mở phải NỐI, không phải tóm tắt — `script-craft.md` §3i.
- **next**: `<tên nguyên văn mục kế tiếp>` — nguồn: `<URL LMS>`, đọc `<ngày>`
  (`KHÔNG RÕ` nếu không xác định được — lane script viết câu gợi mở trung tính. **Không bịa tên bài sau.**)
- **quiz**: `3` · **quiz-track**: `<id trong music.json>`
  Ba câu trắc nghiệm ở cuối, không giải thích (`script-craft.md` §3i.3). CÁCH VIẾT trong kịch bản đi
  theo `templates/modules/quiz.md`: mục `### Dừng N` + `- **Dừng:** 30 giây` → cue `silent` mang
  `quiz: true`; `render.mjs` đặt nhạc quiz đúng các khoảng đó. `quiz-track` KHÔNG khai thì
  `stage:render` mất nhạc quiz mà không báo gì (`tools/lib/quiz-track.mjs` chặn).
- **Ngày**: __DAY__
- **Voice**: `omnivoice`
  Chọn backend giọng — `omnivoice` hoặc `zerotts:<giọng>` (8 giọng: baotrang · giahuy · hamy ·
  huuduc · kimoanh · maichi · quangminh · tiendat). **Thái chốt 21/09/2026**: video kiểu DẪN, không
  tương tác với người nghe → `zerotts:baotrang`; còn lại → `omnivoice`. Các tool đọc thẳng dòng này
  (`voice-export` · `voice-import` · `voice-risk`); xem `.claude/skills/make-video/voice-zerotts.md`.
- **Phạm vi / độ dài**: (điền — không có độ dài mặc định; xem `script-craft.md` §3b)
- **Kịch bản**: xem `kich-ban-goc.md`
- **Feedback / video cũ liên quan**: (điền hoặc để trống)

## Cổng 0 — trước khi viết cue đầu tiên

Đọc kịch bản trọn vẹn, dừng hỏi owner nếu rơi vào một trong bốn ca ở
`templates/briefs/owner-checklist.md` §Cổng 0. Ghi câu trả lời ở đây.

## Ghi chú

(để trống nếu chưa có)
