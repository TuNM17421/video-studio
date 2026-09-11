# Claude Design — VinUni Lesson Video

Repo dựng **video bài giảng** cho khoá *AI in Action 20K* (VinUni): design system React/SVG 1920×1080 · 30 fps,
bộ công cụ build / QA / render MP4, và giọng đọc ElevenLabs. Từ kịch bản đến MP4 kèm transcript và chapters
đều chạy được bằng **Claude Code (CLI)**. Design system đồng bộ được lên **Claude Design** (claude.ai/design).

## Có gì bên trong

| Đường dẫn | Nội dung |
|---|---|
| `vinuni-lesson-video-ds/` | **Design system** (bản đã duyệt): token màu và chữ, component, lib chuyển động, scene mẫu, video mẫu. Đọc `README.md` và `SKILL.md` bên trong trước khi thiết kế |
| `vinuni-lesson-video-ds/ui_kits/lesson-video/videos/<id>/` | Mã nguồn từng video: `cues.js`, `sNN.jsx`, `video.jsx`, `timeline.js`, `voice.js`, `STORYBOARD.md` |
| `projects/<id>/` | Kịch bản gốc (`kich-ban-goc.md`), ghi chú dựng (`PROMPTS.md`), `render/` (MP4, không đưa lên git) |
| `tts-elevenlabs/` | Tạo giọng ElevenLabs → `out/<id>/voice.wav` (không đưa lên git) + `voice.cues.json` (có trên git) |
| `tools/` | `build.mjs`, `verify.mjs`, `shoot.mjs` (chụp ảnh QA), `render.mjs` (MP4), `voice-timing.mjs`, `transcript.mjs` |
| `transcripts/DayNN/`, `chapters/DayNN/` | Sản phẩm đi kèm mỗi video |
| `.design-sync/`, `.ds-sync/` | Cấu hình và công cụ đồng bộ design system lên Claude Design (`/design-sync`) |

**Video mẫu nên xem trước:** `d2-01-lab`, gồm kịch bản `projects/d2-01-lab/`, mã nguồn
`vinuni-lesson-video-ds/ui_kits/lesson-video/videos/d2-01-lab/`, transcript và chapters trong `Day02/`.
File MP4 và WAV không có trên git. Muốn có thì gen lại theo các bước dưới đây.

## Branch

- `main` chứa design system đã duyệt, dùng cho video chính thức.
- `lab` dùng để research và thêm component, màu hoặc tính năng mới. Khi đã test và được duyệt thì
  merge vào `main` (qua Pull Request). Repo chỉ giữ **một** thư mục design system. Thử nghiệm nằm trên
  branch, không nhân đôi thư mục.

```console
git switch lab            # làm thử nghiệm
git switch main           # dựng video chính thức
```

## Setup lần đầu

Cần có: **Node ≥ 20**, **Python 3** (server xem trước), **git**, **Claude Code**
(`npm install -g @anthropic-ai/claude-code`, đăng nhập bằng tài khoản claude.ai) và một tài khoản
**ElevenLabs** (API key + voice ID) nếu tự tạo giọng.

```console
git clone <url repo> Claude-Design && cd Claude-Design
npm install          # esbuild, react, ffmpeg (ffmpeg-static), playwright… và link design system vào node_modules
npm run setup        # tải Chromium dùng để chụp frame và render (một lần)

cp tts-elevenlabs/.env.example tts-elevenlabs/.env
#   điền ELEVENLABS_API_KEY và ELEVENLABS_VOICE_ID (các biến còn lại có sẵn giá trị mặc định)
npm run tts:check    # kiểm tra key và giọng, không tốn ký tự

npm run build && npm run verify     # phải kết thúc bằng "all checks passed"
```

- `tts-elevenlabs/.env.example` là file cấu hình **duy nhất** cần điền. `.env` chứa khoá bí mật nên đã
  nằm trong `.gitignore`: không commit, không gửi lên chat.
- Trên Linux, nếu Chromium báo thiếu thư viện hệ thống thì chạy `npx playwright install-deps chromium`
  (cần sudo).
- Biến môi trường tuỳ chọn khi muốn dùng bản có sẵn trên máy: `CHROME=/đường/dẫn/chrome`,
  `FFMPEG=/đường/dẫn/ffmpeg`.

Xem trước (giữ terminal này chạy trong lúc làm video):

```console
npm run serve        # http://127.0.0.1:8765
```

- Toàn bộ card: <http://127.0.0.1:8765/gallery.html>
- Scene kit và video (phát / tua / Space / ← →): <http://127.0.0.1:8765/ui_kits/lesson-video/index.html>
- Trình phát một video: `…/ui_kits/lesson-video/videos/d2-01-lab/player.html`
- Một frame chính xác: `…/index.html?scene=d2-01-lab&frame=300`

## Gen video bằng Claude CLI

Mở Claude Code ở thư mục repo (`claude`). Claude tự đọc `CLAUDE.md` (pipeline, luật thiết kế) và
`vinuni-lesson-video-ds/README.md`. Bạn chỉ cần đưa kịch bản và yêu cầu, ví dụ:

> Dựng video mới `d3-02-...` từ kịch bản đính kèm (`projects/d3-02-.../kich-ban-goc.md`). Làm theo pipeline
> trong CLAUDE.md, lấy `d2-01-lab` làm mẫu. Tạo giọng ElevenLabs, render MP4, rồi xuất transcript và
> chapters vào `transcripts/Day03/` và `chapters/Day03/`.

Claude sẽ làm lần lượt (bạn duyệt từng bước khi được hỏi):

1. **Kịch bản → cues.** Chép kịch bản vào `projects/<id>/kich-ban-goc.md`, viết `cues.js`: mỗi câu đọc
   một cue, lời giữ **nguyên văn**.
2. **Dựng scene.** Mỗi cue một `sNN.jsx`, theo luật trong design system (vùng nội dung, phụ đề ≤ 78 ký tự,
   màu trong token, font Montserrat, connector…). Kèm `STORYBOARD.md`.
3. **Build và QA.** `npm run build && npm run verify`, chụp ảnh các frame quan trọng bằng
   `node tools/shoot.mjs` rồi xem lại.
4. **Giọng đọc.** Chạy dry-run trước (chưa tốn tiền), sau đó mới gọi API:
   ```console
   cd tts-elevenlabs
   node tts.mjs generate --cues ../vinuni-lesson-video-ds/ui_kits/lesson-video/videos/<id>/cues.js --pronounce pronounce.json --dry-run
   node tts.mjs generate --cues ../vinuni-lesson-video-ds/ui_kits/lesson-video/videos/<id>/cues.js --pronounce pronounce.json
   cd ..
   node tools/voice-timing.mjs tts-elevenlabs/out/<id>/voice.cues.json vinuni-lesson-video-ds/ui_kits/lesson-video/videos/<id>
   npm run build && npm run verify
   ```
   Kết quả được cache theo từng câu: chạy lại chỉ tốn ký tự cho câu đã sửa.
5. **Render MP4** (server xem trước phải đang chạy):
   ```console
   node tools/render.mjs --scene <id> --audio tts-elevenlabs/out/<id>/voice.wav --out projects/<id>/render/<id>.mp4
   ```
   Nếu độ dài giọng khác độ dài hình, script dừng và báo lỗi. Sau khi render, kiểm tra MP4: thời lượng,
   vài frame trích từ file, âm lượng.
6. **Sản phẩm đi kèm, bắt buộc cho mỗi video hoàn chỉnh:**
   ```console
   node tools/transcript.mjs tts-elevenlabs/out/<id>/voice.cues.json transcripts/DayNN/<id>.txt
   ```
   - `transcripts/DayNN/<id>.txt`: dạng `MM:SS - MM:SS: lời đọc`, sinh tự động từ giọng đã thu.
   - `chapters/DayNN/<id>-chương.txt`: dạng `MM:SS: tên chương`, mỗi chương ứng với một phần của kịch bản
     hoặc một ranh giới cảnh. Claude tóm tắt tên chương từ lời đọc.
   - `projects/<id>/PROMPTS.md`: ghi chú dựng (kịch bản nguồn, giọng, lệnh đã chạy, feedback đã áp dụng).
7. **Commit.** `git add -A && git commit` rồi push lên branch của bạn. `.gitignore` đã loại MP4, WAV,
   cache giọng và `.env`.

Muốn sửa một video có sẵn (ví dụ `d2-01-lab`) nhưng chưa có `voice.wav` thì gen lại giọng ở bước 4.
Nếu lời trong `cues.js` không đổi, `voice.cues.json` trên git vẫn khớp nên bước 4 có thể bỏ qua cho đến khi render.

## Đưa design system lên Claude Design (bằng tài khoản của bạn)

Claude Code có sẵn skill `/design-sync` (đồng bộ `vinuni-lesson-video-ds/` lên một project design system
trên claude.ai/design) và lệnh `/design-login` (cấp quyền truy cập Claude Design cho phiên CLI).

1. **Đăng nhập.** Claude Code đăng nhập bằng tài khoản claude.ai của bạn (`/login`). Khi lệnh sync báo lỗi
   quyền, hoặc bạn đang dùng API key thay vì tài khoản claude.ai, chạy `/design-login` và làm theo
   hướng dẫn trên màn hình.
2. **Chọn project đích.** `.design-sync/config.json` đang trỏ tới project của người tạo repo (`projectId`).
   Có hai cách:
   - **Dùng chung project của team:** nhờ chủ project chia sẻ project đó cho tài khoản của bạn (cùng
     organization). Giữ nguyên `projectId`.
   - **Project riêng của bạn:** tạo một project design system mới trên claude.ai/design, rồi sửa
     `projectId` trong `.design-sync/config.json` thành ID của project đó. ID nằm trên URL của project.
     Hoặc xoá dòng `projectId` để `/design-sync` hỏi bạn chọn hay tạo project.
     **Không commit** thay đổi `projectId` này lên `main`.
3. **Đồng bộ.** Trong Claude Code, gõ `/design-sync`. Skill sẽ build bundle (`ds-bundle/`, không lên git),
   so sánh với project trên Claude Design, rồi đưa **danh sách file sẽ ghi** để bạn duyệt. Chỉ khi bạn đồng ý
   nó mới đẩy lên. Những lần sau, gõ `/design-sync` lại để cập nhật phần đã thay đổi.
4. Mở project trên claude.ai/design để xem card và component. Bật **Published** nếu muốn cả organization
   dùng được.

Ghi chú kỹ thuật cho việc sync nằm trong `.design-sync/NOTES.md`: cấu hình converter, cách viết preview,
các rủi ro khi re-sync.

## Sửa design system

Sửa nguồn trong `vinuni-lesson-video-ds/` (`lib/`, `components/`, `ui_kits/lesson-video/scenes/`), rồi chạy
`npm run build && npm run verify`. Màu mới chỉ được khai báo trong `lib/tokens.js`. Thay đổi lớn làm trên
branch `lab`, duyệt xong mới merge vào `main`, sau đó `/design-sync` để cập nhật Claude Design.
