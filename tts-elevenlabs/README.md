# TTS ElevenLabs cho video bài giảng

Project phụ, không cần cài package (Node ≥ 20). Script đọc `cues.js` của một video, gọi ElevenLabs
cho từng câu rồi ghép thành **một file giọng liền mạch** kèm **bảng mốc chính xác theo frame**:

```
out/<video>/voice.wav          một file master, mono PCM 16-bit
out/<video>/voice.cues.json    frame bắt đầu/kết thúc từng câu, thời lượng lời, hash lời gốc và text TTS
```

> Repo Video-studio có quy định riêng: sản xuất chính dùng Google Cloud TTS, không dùng ElevenLabs
> cho video mới trong repo (AGENTS.md). Project này nằm ngoài repo, dùng cho các bản dựng bằng Claude
> Design. Muốn đưa giọng ElevenLabs vào repo thì cần thống nhất lại quy định đó trước.

## Cài đặt (một lần)

```console
cd ~/Claude-Design/tts-elevenlabs
cp .env.example .env        # điền ELEVENLABS_API_KEY và ELEVENLABS_VOICE_ID
npm run check               # kiểm tra key và giọng, không tốn ký tự
```

`.env` chứa khoá bí mật: không gửi, không commit, không đưa vào design system.

## Tạo giọng cho N2-00

```console
npm run n2-00:dry           # xem text sẽ gửi + số ký tự bị tính phí, không gọi API
npm run n2-00               # gọi API, ghép master → out/n2-00-gioi-thieu-ngay-2/
```

Video khác:
`node tts.mjs generate --cues <đường dẫn tới cues.js> [--out thư-mục] [--pause 1] [--only 3,7] [--force]`.

- **Cache:** mỗi câu được cache theo hash của text, giọng, model và cài đặt. Chạy lại chỉ gọi API cho câu
  đã đổi. Muốn thu lại một câu thì dùng `--only 5 --force`.
- **Liền mạch:** mỗi request gửi kèm câu trước và câu sau (`previous_text` / `next_text`) để ngữ điệu nối
  tiếp nhau.
- **Nghỉ giữa câu:** mặc định 1 giây (`--pause`). Mỗi câu bắt đầu đúng biên frame (30 fps).
- **Cách đọc:** `pronounce.json` (`{ "AI": "ây ai" }`) chỉ đổi text gửi đi, lời gốc giữ nguyên. Cả hai
  hash đều được ghi lại.
- **Thử quy trình:** `--mock` tạo âm thanh im lặng đúng độ dài ước tính, không gọi API.

## Cài đặt giọng (`.env`)

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `ELEVENLABS_MODEL_ID` | `eleven_turbo_v2_5` | model phải hỗ trợ tiếng Việt, kiểm tra theo gói tài khoản |
| `ELEVENLABS_LANGUAGE` | `vi` | để trống nếu model không nhận `language_code` |
| `ELEVENLABS_OUTPUT_FORMAT` | `pcm_24000` | phải là `pcm_*` để ghép chính xác; `pcm_44100` cần gói cao hơn |
| `ELEVENLABS_STABILITY` · `SIMILARITY` · `STYLE` · `SPEED` | 0.5 · 0.75 · 0 · 1 | tinh chỉnh giọng |

## Đưa giọng vào video

`voice.cues.json` → `cues[].durationInFrames` là thời lượng đo được của từng câu. Trong `video.jsx`,
mỗi sequence nhận `duration` = số frame đo được và `authoredDuration` = số frame đã dựng (`Series` sẽ
co giãn hoạt ảnh theo lời, không kéo giãn giọng). Phụ đề lấy mốc mới từ cùng bảng này.
