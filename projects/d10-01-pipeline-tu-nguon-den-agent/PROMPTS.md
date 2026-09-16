# Nhật ký sản xuất · D10-01 · Pipeline từ nguồn đến Agent (Bản mở rộng 34 cảnh · 11:03)

## Nguồn và phạm vi
- Kịch bản: `kich-ban-v2-cho-duyet.md`, 34 câu chuẩn hóa theo yêu cầu giải thích sâu, rõ ràng cấu trúc bài học và định nghĩa thuật ngữ tại chỗ.
- Cover các slide: 017–047 của bài học Day 10.
- Sợi chỉ đỏ: Hành trình của tài liệu `CHÍNH SÁCH NGHỈ PHÉP · V2` từ Source tới Agent qua 5 trạm liên hoàn.
- Style: `lesson`; import design system chung ở chế độ đọc (`vinuni-lesson-video-ds`).

## Voice
- Nguồn: OmniVoice local, giọng Nhật Phong (`voice-local`); hoàn toàn không dùng API trả phí.
- Tốc độ: `atempo=0.88` (truyền cảm, nhịp giảng bài tự nhiên, ngắt nghỉ thoải mái).
- Khoảng nghỉ giữa cue: 1,4 giây (khoảng thở lý tưởng cho người học tiếp thu kiến thức nặng).
- Từ điển phát âm: `pronounce.json` chuẩn hóa toàn bộ thuật ngữ chuyên ngành (ETL, ELT, CDC, PII, DLQ, Watermark, Offset, Cursor, Jitter, Backpressure, Medallion, Vector Store, Upsert, Cutover...).
- Kết quả: 34/34 câu, 19.895 frame, 663,17 giây (11:03.17).

## Visual & Animation
- 34/34 cảnh tương tác trong `PipelineScene.jsx`.
- Cấu trúc rõ ràng: Scene 2 mở bản đồ 4 module lớn; từng module thông báo các tiểu mục con trước khi đi vào chi tiết.
- Linh vật VinUni từ `day10/linh vat` đồng hành ở 5 trạng thái cảm xúc/nhiệm vụ: `point`, `read`, `laptop`, `welcome`, `celebrate`.
- Bố cục thẻ nâng lên vùng an toàn (y từ 300 đến 820), cách xa thanh phụ đề chân trang (y >= 920).

## Kiểm tra & Nghiệm thu
- Build: `day10.js` (345.3 KiB) build thành công.
- Visual QA: 68 stills (mid + settled cho 34 scene) được chụp và mở kiểm tra trực quan từng tấm.
- Render MP4: Render bằng `tools/render.mjs` với `voice.wav` đồng bộ frame 1:1 (19.895 frames, 663.17s).
- Phụ đề: `day10/05-final-package/transcripts/d10-01-pipeline-tu-nguon-den-agent.txt` (146 dòng, phân đoạn chuẩn xác).
- Chương mục: `day10/05-final-package/chapters/d10-01-pipeline-tu-nguon-den-agent-chuong.txt` (6 mốc chương chi tiết).
