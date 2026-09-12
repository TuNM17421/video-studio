# Claude-Design — lesson videos for VinUni "AI in Action 20K"

## One design system, experiments on a branch
`vinuni-lesson-video-ds/` is the only design system (the approved former "lab" direction: AgentLoop, Gate,
Swimlane, ChatWindow, CodeBlock, role hues…). Colors beyond the 9 base colors may only be declared in
`lib/tokens.js`; `tools/verify.mjs` must pass (warnings allowed, no problems).
- `main` — approved design system and official videos.
- `lab` — research, new components/colors/features. Merge into `main` only when the user approves.
Never keep a second copy of the design system in another folder. Commit before and after larger changes;
the repo is pushed to GitHub (private), `.env`, audio, MP4, `node_modules`, `ds-bundle/` are ignored.

Setup (see README "Setup lần đầu"): `npm install` (deps + links `node_modules/vinuni-lesson-video-ds`),
`npm run setup` (playwright Chromium), `npm run setup:voice` (only for imported voice: `voice/.venv` +
Whisper, see `docs/decisions/voice-align.md`), `tts-elevenlabs/.env` from `.env.example`. Tools find Chrome via
`$CHROME` → playwright's Chromium → system Chrome, and ffmpeg via `$FFMPEG` → ffmpeg-static → `ffmpeg` on PATH.
Read `vinuni-lesson-video-ds/README.md` (rules, tokens, components) and `vinuni-lesson-video-ds/SKILL.md`
before designing anything.

## Reference implementation
`vinuni-lesson-video-ds/ui_kits/lesson-video/videos/d2-01-lab/` (with `projects/d2-01-lab/`) is a complete,
QA'd video in the current style; `n2-00-gioi-thieu-ngay-2/` is a shorter one. Copy the structure:
- `cues.js` — one cue per narrated sentence: locked text (verbatim from the script), seconds, title
  (on-screen text). `spokenAt(n, phrase)` gives beat frames.
- `shared.jsx` — eyebrow, captions, common scene shell. `sNN.jsx` — one scene per cue, beats in `T`.
- `video.jsx` + `timeline.js` + `voice.js` — Series of scenes, retimed to the recorded voice.
- `STORYBOARD.md`, `card.html`, `player.html`.
Source script, notes and outputs live in `projects/<video-id>/` (kich-ban-goc.md, PROMPTS.md, render/).

## Pipeline for a new video (voice first) — skill `make-video`
`.claude/skills/make-video/SKILL.md` is the source of truth; the request is `projects/<id>/REQUEST.md`, the
style is `styles/<style>.json` (palette, showcase components, rules — they override defaults).
1. **cues** — script → `projects/<id>/kich-ban-goc.md`; `cues.js` (text verbatim; `createSpeech(RAW, VOICE)`
   from lib/speech.js); `voice-timing.mjs --clear`; TTS `--dry-run`.
2. **voice** — giọng đọc chọn trong `voices.json` (danh mục được commit: id, tên, giới tính, key file mẫu
   trên R2, một giọng `"default": true`). Studio có bộ chọn kèm nút nghe thử; CLI nhận `--voice <id|tên>`,
   thứ tự ưu tiên `--voice` → `ELEVENLABS_VOICE_ID` → mặc định trong danh mục. Hai nguồn audio, đều kết thúc ở `voice/out/<id>/{voice.wav, voice.cues.json}`:
   *ElevenLabs* — `node tts-elevenlabs/tts.mjs generate --cues <video>/cues.js --pronounce projects/<id>/pronounce.json --out voice/out/<id>`
   (dry-run first, ask before spending credit; key in `tts-elevenlabs/.env`, never print/commit it).
   *Recorded or local model* — `node tools/voice-export.mjs <video dir> --out projects/<id>/voice-script`
   gives the reading script + an OmniVoice batch JSONL; the member returns a folder of `01.wav, 02.wav …`
   and `node tools/voice-import.mjs --cues <video>/cues.js --from <folder>` (run `--scan` first) assembles
   it. Whisper checks each file against its câu and blocks a folder that is off by one.
   Then `node tools/voice-timing.mjs voice/out/<id>/voice.cues.json <video dir> --write-cues`
   (measured frames/speech into cues.js, word timestamps into voice.js).
3. **scenes** — author every scene at its recorded length; beats with `spokenAt(n, phrase)` (real word
   starts). Content zone y 250–960, captions ≤ 78 chars via lib/captions.js, colors from the style + lib/tokens.js,
   Montserrat, connectors: particle on the drawn path, hidden on card faces, one pulse per arrival; no
   numbers/results the script does not give. Parallel forks per scene group work well.
   `npm run build && npm run verify`; QA stills to `projects/<id>/qa/` with `node tools/shoot.mjs --batch`.
4. **render** — `node tools/render.mjs --scene <id> --audio voice/out/<id>/voice.wav --out projects/<id>/render/<id>.mp4`
   (+ `--base` of the preview server), QA the MP4; `node tools/transcript.mjs <voice.cues.json> transcripts/DayNN/<id>.txt`.
5. **deliver** — `chapters/DayNN/<id>-chương.txt` (`MM:SS: tên chương`, one per script section),
   `projects/<id>/PROMPTS.md`, final build + verify.
Optional: `/design-sync` pushes `vinuni-lesson-video-ds/` to the Claude Design project in
`.design-sync/config.json` — only after the user approves the file list (each member uses their own account;
`/design-login` if DesignSync reports an auth error).

## Video Studio (`studio/`, Next.js, `npm run studio` → http://127.0.0.1:3100)
Local web UI over the same pipeline: the form writes REQUEST.md + `projects/<id>/.studio/state.json`; stages
cues/scenes/deliver run headless `claude -p` (dontAsk, allowlist in `studio/src/lib/server/agent.ts`); the
server itself runs TTS (key in RAM only), the audio import, voice-timing, render and transcript. It serves the design system at
`/ds` (render/QA base). `STUDIO_TTS_MOCK=1` = silent mock voice for development. New styles = new
`styles/*.json`, no code change.

## Video có hội thoại
Nhiều người nói trong một video là **năng lực chọn thêm**, không phải style mới — vẫn Lesson hay Lesson Lab.
Mỗi cue khai `speaker` (tên/id một **nhân vật** — hoặc một giọng, cho video một người dẫn) và `delivery` (kiểu đọc trong
`voices.json → deliveries`, đổi tốc độ). `speaker` phải có sẵn trong danh mục, tên lạ thì `--dry-run` dừng
ngay trước khi tốn credit; thêm nhân vật mới là việc của dev. Đừng nhầm với `cue.voice` — trường đó đã có
từ trước và là audio tag của eleven_v3 (`[curious]`). `tts.mjs` gọi mỗi câu bằng giọng của người nói, và chỉ
nối `previous_text`/`next_text` trong một chuỗi câu cùng người. Một câu có thể khai `model` riêng (`model: 'eleven_v3'`) khi model mặc định đọc sai đúng câu đó — ba câu
còn lại vẫn trúng cache, chỉ câu ấy bị tính phí. Mẫu viết kịch bản:
`templates/kich-ban-hoi-thoai.md`; `npm run voices` in danh sách giọng và kiểu đọc.
Nhân vật là lớp riêng trong `voices.json → characters`: tên, avatar (key trên kho media), phía, màu, và
giọng nó mượn — vì avatar đặt theo nhân vật (Tới, Mai Anh, Tú) còn giọng đặt theo người thu (Nhật Phong,
Đô Trịnh, Viên, Cẩm Hồng). `voice.cues.json` ghi sẵn URL avatar cho từng câu để `DialogueCard` dùng thẳng.

## Media nặng (`media/`, Cloudflare R2)
Video/audio minh hoạ không nằm trong git. Chúng ở một bucket R2 **đọc công khai**; `media/manifest.json`
(được commit) giữ base URL + danh sách asset, nên ai clone repo về cũng xem được mà không cần cấu hình gì.
Chủ bucket bỏ file vào `media/files/<key>` (quy ước `styles/<mã style>/sample.mp4` = video mẫu của style),
`npm run media -- --dry-run` rồi `npm run media`, và commit manifest. Khoá nằm ở `media/.env` (không bao giờ
commit/in ra) — xem `media/README.md`. Mất mạng thì studio hiện card "không khả dụng", không vỡ giao diện.

## Notes
- Imported voice: `docs/decisions/voice-align.md` records why word timestamps come from Whisper alone and
  what would justify moving to forced alignment; `/voice-align-check` measures whether that day has come.
- `studio/AGENTS.md` / `studio/CLAUDE.md` are written by `next dev`; read the Next.js docs in
  `studio/node_modules/next/dist/docs/` before changing studio code.
- ElevenLabs is used only here; the Video-studio Remotion repo (the original style source) mandates Google
  Cloud TTS. This repo no longer depends on Video-studio.
- `node tools/voice-sample.mjs --text "…" "Tên=<voice id>" …` đọc thử một đoạn bằng nhiều giọng ElevenLabs,
  mỗi giọng một WAV trong `voice/samples/` — để chọn người dẫn hoặc lấy mẫu ~10 giây cho model local.
  Luôn `--dry-run` trước vì mỗi yêu cầu đều bị tính ký tự.
- **Sinh ảnh preview cho một component** (`styles/previews/<nhóm>__<Component>.png`, thứ Thư viện của Studio
  hiển thị): repo không có công cụ riêng, làm thủ công bằng `tools/shoot.mjs`. Viết một file HTML tạm **bên
  trong** `vinuni-lesson-video-ds/` (để nạp được `dist/vk.js` và `styles.css`) — đặt ở `ui_kits/lesson-video/demos/`,
  **đừng** đặt trong `components/<nhóm>/` vì verify chỉ cho đúng một file .html mỗi thư mục component.
  Dựng component bằng `VK.mountCard`, chạy `npm run build` trước nếu component vừa thêm, phục vụ thư mục DS
  (`npm run serve`, cổng 8765) rồi:
  `node tools/shoot.mjs "http://127.0.0.1:8765/ui_kits/lesson-video/demos/<file>.html" styles/previews/<nhóm>__<Component>.png 367 210`
  Cỡ chuẩn là rộng **367 px** (cao tuỳ component, 210–250). Hai cái bẫy đã vấp:
  shoot.mjs **cắt** trang theo viewport chứ không thu nhỏ, nên phải tự thu bằng
  `transform: scale(...)` với `transform-origin: top left` trên một div bọc có kích thước thật;
  và component tràn mép thì bị xén âm thầm — chụp xong **phải mở ảnh ra nhìn**, đừng tin exit code.
  Xoá file HTML tạm sau khi chụp.
- Reply to the user in Vietnamese.
