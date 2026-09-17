# Nhật ký sản xuất · D10-02 · Làm sao kéo và làm sạch dữ liệu mà không âm thầm làm sai? (26 cảnh · 07:05)

## Nguồn và phạm vi
- Kịch bản: `kich-ban-v2-cho-duyet.md`, 26 câu chuẩn hóa sư phạm chuyên sâu, đào sâu bản chất trạm Ingestion và Transform.
- Cover các slide: 024–040 của bài học Day 10 (Bộ 138 trang của VinUni).
- Trọng tâm bài học:
  1. Quản trị kiểu hỏng của 4 nguồn dữ liệu (Database, API, File, Event Stream) và rủi ro Data Cascade.
  2. Đồng bộ tăng dần an toàn: Bẫy phân trang Offset gây mất dữ liệu âm thầm vs Cursor neo mốc tăng dần & Change Data Capture (CDC) đọc từ Transaction Log.
  3. Cơ chế tự vệ hệ thống: Rate Limit 429, chống Retry Storm, Exponential Backoff, Jitter phân tán tải, Backpressure điều tiết nhịp độ và Dead-Letter Queue (DLQ) cách ly lỗi.
  4. Quản lý tệp tin: Content Hash vs Logical Version, bẫy tên file đánh lừa pipeline.
  5. 5 Dạng dữ liệu bẩn kinh điển & 3 nhánh phân luồng xử lý (Sửa tự động, Gắn cờ, Cách ly).
  6. Transform chuyên biệt cho Agent/RAG: Clean Text bóc tách rác, PII Redaction bảo vệ định danh, Semantic Chunking theo ranh giới ngữ nghĩa và Rich Metadata làm giàu xuất xứ.
  7. Nguyên tắc vàng: Sửa tay không phải Transform, Code tự động đảm bảo tính lặp lại (Idempotency), 3 câu hỏi truy xuất nguồn gốc và cầu nối sang D10-03 Quality Gates.
- Style: `lesson`; import design system chung ở chế độ đọc (`vinuni-lesson-video-ds`).

## Voice
- Nguồn: OmniVoice local, giọng Nhật Phong (`voice-local`); chạy hoàn toàn offline trên GPU, không dùng API trả phí.
- Tốc độ: `atempo=0.88` (truyền cảm, nhịp giảng bài công nghệ tự nhiên, ngắt nghỉ rõ ràng).
- Khoảng nghỉ giữa cue: 1,4 giây (khoảng thở lý tưởng để người học tiếp thu các khái niệm kỹ thuật nặng).
- Từ điển phát âm: `pronounce.json` chuẩn hóa toàn bộ thuật ngữ (CDC, PII, DLQ, API, RAG, HTML, CSS, H1/H2, ID, Offset, Cursor, Jitter, Backpressure, Idempotency...).
- Kết quả: 26/26 câu, 12.766 frame, 425,53 giây (07:05.53).

## Visual & Animation
- 26 cảnh tương tác trực quan thiết kế trong `IngestionScene.jsx`.
- Linh vật VinUni từ `day10/linh vat` đồng hành ở góc phải an toàn (`x = 1515, y = 500, w = 275`) trên nền trong suốt (floating transparent) với hiệu ứng nhún thở nhẹ (`bob` / `pulse`).
- Khung hình 1920×1080 px nền trắng chuẩn VinUni, dải banner chủ đề ở `y = 240`, thẻ nội dung nằm gọn trong vùng an toàn `y = 340..840`, bảo đảm cách xa thanh phụ đề chân trang (`y >= 960`).
- Tinh chỉnh hàm `wrap` ngắt dòng tự động nhận diện `\n`, loại bỏ hoàn toàn lỗi tràn chữ và lỗi hiển thị ký tự thoát.

## Kiểm tra & Nghiệm thu
- Build: Bundle runtime `day10.js` (1.399,7 KiB) đóng gói thành công.
- Visual QA: Toàn bộ 26 stills settled (`s01-settled.png` đến `s26-settled.png`) được chụp và mở kiểm tra trực quan chi tiết từng tấm bằng tool cdp và `view_file`.
- Render MP4: Render bằng `tools/render.mjs` với `voice.wav` đồng bộ frame 1:1 (12.766 frames, 425.53s).
- Phụ đề: `transcripts/Day10/d10-02-ingestion-transform.txt` (93 dòng phân trang theo đúng chuẩn burnt-in caption $\le 78$ ký tự/trang).
- Chương mục: `chapters/Day10/d10-02-ingestion-transform-chương.txt` (7 mốc chương chi tiết theo định dạng `MM:SS: Tiêu đề`).
