# Mẫu · Griffin kể năm bước làm video — ghi chú dựng

- Kịch bản gốc: `kich-ban-goc.md` (viết cho video mẫu, 8 câu). Design system: `vinuni-lesson-video-ds`, style Lesson Lab.
- Video: `vinuni-lesson-video-ds/ui_kits/lesson-video/videos/mau-huong-dan/` · 8 câu, 37,97 giây.
- Giọng: ElevenLabs `eleven_turbo_v2_5`, nhân vật `Griffin` → giọng Nhật Phong, kiểu đọc theo từng câu (kể / giảng /
  chốt), nghỉ mặc định 1,4 giây. 518 ký tự (người dùng duyệt trước khi chạy).
- Nhạc nền: `bg-goc` — "bg (bản gốc)", nhạc nền mặc định của `music.json`. Phụ đề: có.
- Đầu ra: `render/mau-huong-dan.mp4` (5,3 MB), `transcripts/Day01/mau-huong-dan.txt`,
  `chapters/Day01/mau-huong-dan-chương.txt`.

## Mục đích

Video mẫu của chế độ tập trong tour hướng dẫn: một video đã đi đủ năm bước của Studio (Kế hoạch, Lời & cue,
Giọng đọc, Dựng cảnh, Render) để tour chỉ vào từng bước khi đã xong. Nội dung cũng chính là năm bước đó, do
Griffin kể — người mới xem video là hiểu quy trình.

## Cách đọc (`pronounce.json`)

"VinUni" → Vin Uni · "Griffin" → Gờ-ríp-phin · "Studio" → xờ-tiu-đi-ô · "style" → xờ-tai · "agent" → ây-giần.
Whisper nghe lại đủ tám câu đúng lời; các từ viết theo cách đọc cần người nghe lại để chốt độ tự nhiên.

## Hình

Dải năm bước (`StepRail`, trong `shared.jsx`) ở đầu vùng nội dung câu 03–07, bước đang kể sáng đỏ, bước sau mờ.
Griffin (component `Griffin`) đứng bên phải, đổi dáng/biểu cảm theo lời (xem `STORYBOARD.md`). Câu 05 vẽ dạng
sóng và hàng cảnh bằng chính độ dài đo được của tám câu — không có số liệu nào ngoài kịch bản.

## Lệnh

```console
node tools/voice-timing.mjs --clear vinuni-lesson-video-ds/ui_kits/lesson-video/videos/mau-huong-dan
node tts-elevenlabs/tts.mjs generate --cues vinuni-lesson-video-ds/ui_kits/lesson-video/videos/mau-huong-dan/cues.js --pronounce projects/mau-huong-dan/pronounce.json --dry-run
node tts-elevenlabs/tts.mjs generate --cues vinuni-lesson-video-ds/ui_kits/lesson-video/videos/mau-huong-dan/cues.js --pronounce projects/mau-huong-dan/pronounce.json --out voice/out/mau-huong-dan
node tools/voice-timing.mjs voice/out/mau-huong-dan/voice.cues.json vinuni-lesson-video-ds/ui_kits/lesson-video/videos/mau-huong-dan --write-cues
npm run build && npm run verify
node tools/render.mjs --scene mau-huong-dan --audio voice/out/mau-huong-dan/voice.wav --music-track bg-goc --out projects/mau-huong-dan/render/mau-huong-dan.mp4 --base http://127.0.0.1:8765
node tools/transcript.mjs voice/out/mau-huong-dan/voice.cues.json transcripts/Day01/mau-huong-dan.txt
```

## Giới hạn

- Mỏ Griffin không mấp máy theo lời (bộ ảnh chưa có).
- Cần mạng khi xem và render: ảnh Griffin ở R2.

## So sánh cách đọc từ tiếng Anh

Bốn câu có từ tiếng Anh (01, 03, 04, 06) được đọc thêm một lần bằng chữ nguyên gốc, không qua
`pronounce.json` (235 ký tự, người dùng duyệt), để so với bản hiện tại. File nghe ở
`projects/mau-huong-dan/so-sanh-phat-am/` (không vào git): `so-sanh-4-cau.wav` đọc mỗi câu hai lần — hiện tại
rồi nguyên gốc. Whisper nhận đúng "Griffin", "style", "studio", "agent" ở bản nguyên gốc, còn bản hiện tại bị
nghe thành "GoReapVin", "so tai", "so tiêu DIO", "Ê Gián". Chờ người dùng nghe và chốt.
