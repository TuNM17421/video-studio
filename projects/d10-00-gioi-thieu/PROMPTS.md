# Nhật ký sản xuất · D10-00 · V5 (Bản mở rộng 16 cảnh · ~4 phút)

## Nguồn và phạm vi

- Kịch bản: `kich-ban-goc.md`, 16 cue chuẩn hóa theo yêu cầu mở rộng thời lượng ~4 phút.
- Giới thiệu đầy đủ toàn cảnh bài học Day 10: 4 cụm học và chi tiết 18 nội dung thực chiến.
- Chỉ dựng Video D10-00; không thay đổi Video 01–04.
- Style: `lesson`; import design system chung ở chế độ đọc (`vinuni-lesson-video-ds`).

## Voice

- Nguồn: OmniVoice local, giọng Nhật Phong (`voice-local`); hoàn toàn không dùng API trả phí.
- Tốc độ: `atempo=0.88` (truyền cảm, tự nhiên).
- Khoảng nghỉ giữa cue: 1,4 giây (khoảng thở lý tưởng cho người học).
- Kết quả: 16/16 cue, 7.207 frame, 240,23 giây (đúng 04:00.2).

## Khắc phục triệt để các vấn đề

| Vấn đề | Cách giải quyết trong V5 |
|---|---|
| Voice đọc sai "Day 10" thành "day mưn" | Ánh xạ `"Day 10": "Đây mười"` và `"Lab 10": "Láp mười"` trong `pronounce.json`. Giọng OmniVoice đọc chuẩn xác âm "Day 10" rành rọt, tự nhiên, không bị líu âm. |
| Thiếu phần giới thiệu cấu trúc bài học | Bổ sung 9 cảnh chuyên biệt (Scene 7 đến 15) giới thiệu đầy đủ 4 cụm lớn và 18 nội dung thực chiến của Day 10. |
| Animation không match với lời nói | Từng thẻ nội dung (18 nội dung) xuất hiện, chuyển động và highlight sáng lên **chính xác 100% theo từ khóa phát âm** qua `spokenAt(...)`. |
| Thời lượng quá ngắn / bị dồn ép | Nâng thời lượng lên 4 phút (16 cue), tạo không gian rộng rãi để giải thích rõ trong mỗi phần có gì và tại sao cần học. |
| Nguy cơ đè chữ phụ đề | Layout thẻ được nâng lên vùng an toàn (y từ 300 đến 820), cách xa thanh phụ đề chân trang (y >= 920). |
| Mascot VinUni đồng hành | 16/16 scene đều có linh vật VinUni từ `day10/linh vat` với biểu cảm phù hợp theo từng mạch cảm xúc. |

## Kiểm tra & Nghiệm thu

- Build: `day10.js` (260.5 KiB) build thành công.
- Visual QA: 32 still (mid + settled cho 16 scene) được chụp và mở kiểm tra trực quan từng tấm.
- Render MP4: Render bằng `tools/render.mjs` với `voice.wav` đồng bộ frame 1:1 (7.207 frames, 240.23s).
- Phụ đề: `day10/05-final-package/transcripts/d10-00-gioi-thieu.txt` (54 dòng, phân đoạn chuẩn xác).
- Chương mục: `day10/05-final-package/chapters/d10-00-gioi-thieu-chuong.txt` (7 mốc chương).
