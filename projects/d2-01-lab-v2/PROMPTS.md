# D2-01 (lab) v2 · "AI chatbot" chưa phải là một bài toán — ghi chú dựng

- Kịch bản gốc: `kich-ban-goc.md` (N2-M1-01, lời đọc đã duyệt — giữ nguyên văn). Design system: **lab**.
- Video: `vinuni-lesson-video-ds/ui_kits/lesson-video/videos/d2-01-lab-v2/` · 51 cue = 49 câu đọc + 2 khoảng dừng 3 giây
  (cue 2 = dừng sau câu 01, cue 27 = dừng sau câu 25). Số cue = số câu kịch bản + 1 (cue 3–26) và + 2 (cue 28–51).
- Giọng (bản hiện tại, 11/09): ElevenLabs mặc định `eleven_turbo_v2_5`, tiếng Việt, không thẻ cảm xúc → `tts-elevenlabs/out/d2-01-lab-v2-turbo/`. Bản giọng v3 cũ: `render/d2-01-lab-v2-giong-v3.mp4`.
- Giọng v3 (bản trước): ElevenLabs `eleven_v3`, **không ép `language_code`** (`ELEVENLABS_LANGUAGE=auto`) để thuật ngữ tiếng Anh
  (pain point, workflow, metric, Problem Statement, Double Diamond, AI) đọc theo giọng Anh; câu *đọc chậm* có thẻ `[slowly]`
  và nghỉ 1,6 giây; "Module 1" đọc "Mô-đun một" (`pronounce.json`). Câu 16 (cue) đã thu lại một lần vì nhịp bất thường.
- Luật riêng của kịch bản: không nhân vật, không số liệu, không tên hay giá trị chỉ số; thuật ngữ chỉ lên hình sau câu giải thích.

```console
cd tts-elevenlabs && ELEVENLABS_MODEL_ID=eleven_v3 ELEVENLABS_LANGUAGE=auto node tts.mjs generate --cues ../vinuni-lesson-video-ds/ui_kits/lesson-video/videos/d2-01-lab-v2/cues.js --pronounce ../projects/d2-01-lab-v2/pronounce.json --pause 1.4 --out out/d2-01-lab-v2
node tools/voice-timing.mjs tts-elevenlabs/out/d2-01-lab-v2/voice.cues.json vinuni-lesson-video-ds/ui_kits/lesson-video/videos/d2-01-lab-v2
node tools/render.mjs --scene d2-01-lab-v2 --audio tts-elevenlabs/out/d2-01-lab-v2/voice.wav --out projects/d2-01-lab-v2/render/d2-01-lab-v2.mp4
```
