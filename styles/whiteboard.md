---
style: whiteboard
---

# Whiteboard Style (lab) — dựng cảnh

Phần riêng của style bảng trắng cho bước 3 của skill `make-video`. Phần lõi (thời lượng theo giọng, beat
theo `spokenAt`, phụ đề, không bịa số, build/verify/QA) nằm trong `.claude/skills/make-video/SKILL.md`.
Style này **không** dùng hướng dẫn dựng cảnh của Lesson (không `sNN.jsx`, không `Series`).

Video mẫu: `vinuni-lesson-video-ds/ui_kits/lesson-video/videos/n2-00-bang-trang/` (`board.js`, `video.jsx`,
`STORYBOARD.md`). Component: `components/whiteboard/` — đọc `Whiteboard.prompt.md`.

## Dựng cảnh

- **Cả video là một tấm bảng, không cắt cảnh.** Files: `cues.js`, `timeline.js`, `voice.js` như mọi video;
  `board.js` khai mọi nét; `video.jsx` vẽ một `SceneFrame` (`header={false}`, eyebrow qua `overlay`, phụ đề
  `cueCaptions` của cả video) chứa `<Whiteboard frame marks camera />`; `meta.board = { marks, camera, lag }`;
  `card.html`, `player.html`, `STORYBOARD.md` (bố cục bảng + bảng theo câu).
- `board.js` dựng bằng `createBoard({ timeline: TIMELINE, spokenAt })` — không tự viết lại bộ xếp lượt:
  `draw(say(n, 'cụm từ'), mark)` cho nét theo lời, `draw(null, mark)` cho nét nối tiếp, `look(frame, { x, y, w })`
  cho camera, `boxText` / `clock` cho hình hay dùng. Bút vẽ một thứ một lúc; nét sau tự chờ nét trước.
- **Bố cục trước, nét sau.** Chia bảng thành vùng theo cấu trúc kịch bản (ví dụ hàng tiêu đề + một ô
  1760 × 760 cho mỗi phần, nửa trái / nửa phải cho hai câu của phần) và ghi sơ đồ đó ở đầu `board.js`.
- Mỗi câu 3–5 nét chính; chữ trên bảng là từ khoá, không chép cả câu (bút ~32 ký tự/giây).
  Chữ ≥ 40 px ở zoom 1; chữ chỉ đọc lúc lùi ra ≥ 110 px.
- Mực: navy `C.text` cho chữ, xanh `C.accent` cho vật / luồng / mũi tên, đỏ `C.red` cho câu hỏi, điểm nhấn,
  vòng khoanh. Nền nhạt `C.bgAlt` / `C.redSoft`. Không dùng màu vai trò của Lesson Lab.
- Chữ tay chỉ cho chữ trên bảng; eyebrow, phụ đề, footer giữ Montserrat. Ba font: `playpen` (Playpen Sans,
  mặc định), `shantell` (Shantell Sans), `pangolin` (Pangolin) — chọn cho cả bảng bằng
  `createBoard({ font })` hoặc cho một nét bằng `font:`. Thêm font: `tools/hand-fonts.mjs`.
- **Camera**: lia tới vùng mới trước nét đầu tiên của vùng (30–45 frame); đừng vẽ khi camera còn đang chạy
  (verify báo nét ngoài khung). Lùi ra để nhắc đang ở đâu; câu tổng kết lùi ra toàn bảng.
- **Lau bảng** (`erase`) khi một đoạn đã xong và cần chỗ; mọi nét trước đó trong vùng lau biến mất.
- **Hình minh hoạ**: `doodle` (icon vẽ tay: tên lửa, bóng đèn, máy bay giấy, bánh răng, biểu đồ, người, tiền…),
  `cloud` (mây cho tiêu đề hoặc suy nghĩ), `trail` nét đứt uốn lượn (đường bay, liên hệ lỏng), `fill: 'hachure'`
  để tô bóng, `outline: true` cho một chữ tiêu đề to. Xem `Whiteboard.prompt.md` và trang
  `ui_kits/lesson-video/demos/whiteboard-doodles.html`. Hình minh hoạ đi kèm chữ, không thay chữ; mỗi câu
  vẫn 3–5 nét chính.
- `id` mỗi nét duy nhất và cố định (seed của độ run nét) — không đổi id của nét đã duyệt.
- Xem `LAG` và cảnh báo `board —` của `npm run verify`: nét trễ > 45 frame thì bớt nét ở câu đó hoặc viết
  tiêu đề ngắn hơn, đừng dồn thêm.

## Năng lực hỗ trợ

Chưa hỗ trợ hội thoại, quiz và linh vật Griffin (`unsupportedModules` trong `styles/whiteboard.json`):
Studio làm mờ các card đó và REQUEST.md không bao giờ yêu cầu chúng.

## Tiêu chí QA

- Mỗi ảnh là một phần của cùng một tấm bảng: nét tay, chữ viết tay; không có thẻ bóng đổ, hạt hay hộp
  kính kiểu Lesson.
- Chữ trên bảng là từ khoá ngắn, đọc được; không có câu dài chép lại lời đọc.
- Không có nét nào bị xén ở mép khung hay nằm dưới thanh phụ đề / eyebrow.
- Vùng đang vẽ nằm giữa khung, không bị ô bên cạnh lấn vào.
