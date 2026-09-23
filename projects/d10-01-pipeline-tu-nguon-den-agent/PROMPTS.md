# Nhật ký sản xuất · D10-01 · Pipeline từ nguồn đến Agent (Bản hoàn thiện 44 cảnh · 17:57)

## Nguồn và phạm vi
- Kịch bản: 34 câu bài giảng chuẩn hóa + 4 câu chuyển tiếp + 6 câu hỏi trắc nghiệm tương tác trực quan (Live Visual Split-Screen).
- Cover các slide: 017–047 của bài học Day 10.
- Sợi chỉ đỏ: Hành trình của tài liệu `CHÍNH SÁCH NGHỈ PHÉP · V2` từ Source tới Agent qua 5 trạm liên hoàn.
- Style: `lesson`; import design system chung ở chế độ đọc (`vinuni-lesson-video-ds`).

## Voice & Timing
- Nguồn: OmniVoice local, giọng Nhật Phong (`voice-local`); hoàn toàn không dùng API trả phí.
- Tốc độ: `atempo=0.88` (truyền cảm, nhịp giảng bài tự nhiên, ngắt nghỉ thoải mái).
- Khoảng nghỉ giữa cue: 1,4 giây; các câu hỏi cách nhau 3 giây; đồng hồ đếm ngược 10 giây/câu hỏi.
- Từ điển phát âm: `pronounce.json` chuẩn hóa toàn bộ thuật ngữ chuyên ngành (ETL, ELT, CDC, PII, DLQ, Watermark, Offset, Cursor, Jitter, Backpressure, Medallion, Vector Store, Upsert, Cutover...).
- Kết quả: 44/44 cues, 32.315 frames, 1077,17 giây (17:57.17).

## Visual & Animation
- 44/44 cảnh tương tác trong `d10-01-pipeline-tu-nguon-den-agent`: 34 cảnh bài giảng (`s01`–`s34`), 4 cảnh chuyển tiếp (`t01`–`t04`), 6 cảnh trắc nghiệm trực quan (`q01`–`q06`).
- Bố cục trắc nghiệm: Split-screen tỉ lệ vàng — cột trái hiển thị câu hỏi & 4 phương án A/B/C/D với đồng hồ đếm ngược SVG; cột phải trực quan hóa bằng sơ đồ kiến trúc live sinh động (Data Cascade, Ingestion DLQ, Medallion Bronze-Silver-Gold, Atomic Cutover & Ghost Vectors).
- Linh vật VinUni từ `day10/linh vat` đồng hành ở 5 trạng thái cảm xúc/nhiệm vụ: `point`, `read`, `laptop`, `welcome`, `celebrate`.
- Bố cục thẻ nâng lên vùng an toàn (y từ 300 đến 820), cách xa thanh phụ đề chân trang (y >= 920).

## Kiểm tra & Nghiệm thu
- Build: `npm run build && npm run verify` hoàn tất hợp lệ.
- Visual QA: QA stills kiểm tra trực quan cho 44 cảnh.
- Render MP4: Render bằng `tools/render.mjs` với `voice.wav` đồng bộ frame 1:1 (32.315 frames, 17:57.2, -16.1 LUFS, -1.8 dBTP).
- Phụ đề: `day10/05-final-package/transcripts/d10-01-pipeline-tu-nguon-den-agent.txt` (218 dòng, phân đoạn chuẩn xác).
- Chương mục: `day10/05-final-package/chapters/d10-01-pipeline-tu-nguon-den-agent-chương.txt` (27 mốc chương chi tiết).

