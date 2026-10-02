# D2-01 (lab) · Tách yêu cầu giải pháp khỏi vấn đề — ghi chú dựng

- Kịch bản gốc: `kich-ban-goc.md` (N2-01, bản rà 07/09/2026). Design system: `vinuni-lesson-video-ds` (bản lab đã được chọn làm bản chính).
- Video: `vinuni-lesson-video-ds/ui_kits/lesson-video/videos/d2-01-lab/` · 47 câu (46 câu đọc + 1 khoảng dừng 5 giây).
- Giọng: ElevenLabs `eleven_v3` (thẻ cảm xúc từng câu, trường `voice` trong `cues.js`), nghỉ 1,4 giây sau mỗi câu, 2 giây cuối mỗi phần. Giọng `6adFm46eyy74snVn6YrT`, stability 0,5, similarity 0,75, speed 1. Tổng 316,4 giây (9491 khung, 30 fps).
- Style: `lesson-lab` (Day02), không bật module nào (không hội thoại, không quiz nhạc, không Griffin); phụ đề đốt vào MP4; nhạc nền/quiz: không.
- Đầu ra: `render/d2-01-lab.mp4` + `render/manifest.json` (build 1, item_id `d2-01-lab`), `transcripts/Day02/d2-01-lab.txt`, `chapters/Day02/d2-01-lab-chương.txt` (6 chương, mốc lấy từ `voice.cues.json`, làm tròn xuống giây).
- Câu 41–43 là bộ ba câu hỏi–dừng 5 giây–đáp án (câu 42 `silent`); không có câu đệm chen giữa.

## Lượt Studio 26/09 (Stage 5 · deliver)

- Bản dựng lại trong Video Studio (`baseline-upstream-2026-09-25`), voice/scenes/render đã xong, review AI cảnh (47 ảnh trong `qa/auto/`) chạy trước đó.
- Lượt deliver chỉ viết file chương và cập nhật ghi chú này; build/verify do runner chạy (final gate).
- File cũ `chapters/Day02/d2-01-lab-chapters.txt` là bản trước, mốc làm tròn lên (02:36, 04:32); file `-chương.txt` mới là bản chuẩn. Có thể xoá file cũ nếu không còn dùng.
- Giới hạn: agent lượt này không chạy được lệnh shell (chế độ dontAsk), nên chưa tự đối chiếu `transcripts/Day02/d2-01-lab.txt` với voice; chỉ dựa vào `voice.cues.json` và `manifest.json`.

## Áp dụng feedback DAY02 (bản cũ d02-r1-v01)

| Feedback | Cách xử lý trong bản này |
|---|---|
| Giọng đều đều, nhạt; cần ngoặc vuông chỉ cảm xúc, tính từ tiếng Anh cho câu cần nhấn | Chuyển sang `eleven_v3`, mỗi câu có thẻ `[curious]`, `[serious]`, `[confident]`, `[warmly]`… (chỉ gửi cho TTS, không vào phụ đề). Câu ý chính (06, 14, 28, 30, 40) dùng `[confident]` |
| Đọc tiếng Anh sai giọng | Kịch bản không còn từ tiếng Anh cần đọc; `pronounce.json` để trống |
| Tên "Minh" dễ lẫn với "mình" | Đổi thành **Dũng** trong lời đọc câu 05, 32, 38 và mọi hình |
| Không rõ Lan là ai, Minh là ai | Câu 04: "Lan là học viên mới, …"; câu 05 giữ "Dũng là nhân viên hỗ trợ…"; mọi lần nhân vật xuất hiện đều có nhãn vai trò |
| Câu "học viên mới có thể vướng ở chỗ người cũ đã quen" tối nghĩa | Câu 15: "…vì học viên mới có thể vướng những chỗ mà học viên cũ không gặp." |
| "Chờ lâu" — ai chờ? | Câu 18: "…như Lan phải chờ lâu, nộp nhầm nơi, hoặc Dũng phải trả lời lại." |
| Nhịp chuyển cảnh gấp | Nghỉ dài hơn giữa câu; các câu cùng một ý dùng chung một bố cục (phần 4: câu vấn đề 24–28, trục thời gian 31–33; phần 6: bố cục câu hỏi 41–45) |
| Thẻ giữa bị tô đỏ | Thẻ nhấp nháy bằng chính màu vai trò (`RoleCard hot`), đỏ chỉ cho dấu hỏi, sai, và phán quyết của cổng |

## Màu vai trò (lab)

xanh lá = công việc / đúng / kết quả mong muốn · cam = trở ngại / hậu quả · tím = giải pháp · vàng đậm = giả định / chưa xác nhận / đang chờ · xanh dương = người dùng, dữ liệu · đỏ = nhấn, sai, dấu hỏi.

## Lệnh

```console
cd tts-elevenlabs && ELEVENLABS_MODEL_ID=eleven_v3 node tts.mjs generate --cues ../vinuni-lesson-video-ds/ui_kits/lesson-video/videos/d2-01-lab/cues.js --pronounce pronounce.json --pause 1.4 --out out/d2-01-lab
node tools/voice-timing.mjs tts-elevenlabs/out/d2-01-lab/voice.cues.json vinuni-lesson-video-ds/ui_kits/lesson-video/videos/d2-01-lab
node tools/build.mjs && node tools/verify.mjs
node tools/render.mjs --scene d2-01-lab --audio tts-elevenlabs/out/d2-01-lab/voice.wav --out projects/d2-01-lab/render/d2-01-lab.mp4
```
