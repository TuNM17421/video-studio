# Claude Design — VinUni Lesson Video

Repo dựng **video bài giảng** cho khoá *AI in Action 20K* (VinUni): design system React/SVG 1920×1080 · 30 fps,
bộ công cụ build / QA / render MP4, và giọng đọc ElevenLabs. Từ kịch bản đến MP4 kèm transcript và chapters
chạy được bằng web **Video Studio** (`studio/`) với **Claude Code hoặc Codex**, hoặc trực tiếp bằng CLI. Design system
đồng bộ được lên **Claude Design** (claude.ai/design).

## Có gì bên trong

| Đường dẫn | Nội dung |
|---|---|
| `vinuni-lesson-video-ds/` | **Design system** (bản đã duyệt): token màu và chữ, component, lib chuyển động, scene mẫu, video mẫu. Đọc `README.md` và `SKILL.md` bên trong trước khi thiết kế |
| `vinuni-lesson-video-ds/ui_kits/lesson-video/videos/<id>/` | Mã nguồn từng video: `cues.js`, `sNN.jsx`, `video.jsx`, `timeline.js`, `voice.js`, `STORYBOARD.md`; video mới là dữ liệu theo lần dựng và không đưa lên git |
| `projects/<id>/` | Kịch bản gốc (`kich-ban-goc.md`), ghi chú dựng (`PROMPTS.md`), QA và `render/`; đều giữ trên máy |
| `tts-elevenlabs/` | Tạo giọng ElevenLabs → `out/<id>/voice.wav` + `voice.cues.json`; toàn bộ output giữ trên máy |
| `tools/` | `build.mjs`, `verify.mjs`, `shoot.mjs` (chụp ảnh QA), `render.mjs` (MP4), `voice-timing.mjs`, `transcript.mjs` |
| `studio/` | **Video Studio**: web local chọn style, tạo video và điều khiển Claude Code hoặc Codex theo từng bước |
| `styles/` | Danh sách style (`lesson.json`, `lesson-lab.json`: màu, component tiêu biểu, luật) và ảnh preview component |
| `.claude/skills/make-video/` | Skill `/make-video`: quy trình dựng video, dùng chung cho Video Studio và CLI |
| `transcripts/DayNN/`, `chapters/DayNN/` | Sản phẩm đi kèm mỗi video, giữ trên máy |
| `.design-sync/`, `.ds-sync/` | Cấu hình và công cụ đồng bộ design system lên Claude Design (`/design-sync`) |

**Video mẫu nên xem trước:** `d2-01-lab`, gồm kịch bản `projects/d2-01-lab/`, mã nguồn
`vinuni-lesson-video-ds/ui_kits/lesson-video/videos/d2-01-lab/`, transcript và chapters trong `Day02/`.
File MP4 và WAV không có trên git. Muốn có thì gen lại theo các bước dưới đây.

Git chỉ lưu core dùng chung: Studio, pipeline, design system, style, component và các template Day02 đã
được duyệt. Kịch bản, mã cảnh, giọng, QA, MP4, transcript và chapter của video mới đều bị `.gitignore` loại.

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

Cần có: **Node ≥ 20**, **Python 3** (server xem trước), **git**, ít nhất một trong hai CLI **Claude Code**
hoặc **Codex** (đã đăng nhập trên máy), và một tài khoản
**ElevenLabs** (API key + voice ID) nếu tự tạo giọng.

```console
git clone <url repo> Claude-Design && cd Claude-Design
npm install          # esbuild, react, ffmpeg (ffmpeg-static), playwright… và link design system vào node_modules
npm run setup        # tải Chromium dùng để chụp frame và render (một lần)

cp tts-elevenlabs/.env.example tts-elevenlabs/.env
#   điền ELEVENLABS_API_KEY và ELEVENLABS_VOICE_ID (các biến còn lại có sẵn giá trị mặc định)
npm run tts:check    # kiểm tra key và giọng, không tốn ký tự

npm run build && npm run verify     # phải kết thúc bằng "all checks passed"
npm run studio:install              # cài Video Studio (một lần)
```

- `tts-elevenlabs/.env` chỉ cần khi **tạo giọng bằng CLI**. Video Studio không dùng file này: key được
  nhập trên web và chỉ nằm trong RAM. Người chỉ dùng Video Studio thì bỏ qua bước `cp … .env`, và nếu máy
  đã có `.env` thì nên xoá đi (agent chạy trong repo có thể đọc được file trên đĩa). `.env` đã nằm trong
  `.gitignore`: không commit, không gửi lên chat.
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

## Video Studio (web)

```console
npm run studio       # http://127.0.0.1:3100 — chỉ nghe trên máy này
```

Studio mặc định dùng Claude để tương thích với video cũ. Có thể cấu hình trước khi chạy:

```console
cp studio/.env.example studio/.env
# sửa STUDIO_AGENT_PROVIDER=claude hoặc codex
# đặt STUDIO_AGENT_PROVIDER_LOCKED=1 nếu không muốn hiện lựa chọn agent khi tạo video
npm run studio
```

`studio/.env` chỉ nên chứa các công tắc không bí mật như file mẫu; không đặt API key vào đó. Video mới được
gắn với agent ngay khi tạo và luôn tiếp tục bằng agent đó, kể cả sau khi khởi động lại máy. Studio không có
nút đổi agent cho video đang làm. Video Studio cũ chưa có trường provider được xem là video Claude.

Mỗi video đi qua 5 bước. Agent đã gắn (Claude Code hoặc Codex chạy nền bằng tài khoản đang đăng nhập trên máy) làm các bước
dựng; bạn duyệt hoặc gửi góp ý ở mỗi điểm dừng:

1. **Kế hoạch.** Chọn style (xem dải màu, component tiêu biểu, video mẫu), nhập mã video, ngày, kịch bản
   (.md/.txt), thư mục feedback và video cũ nếu có, ghi chú, phạm vi. Bấm **Tạo video**. Nút **Copy prompt**
   cho prompt tương đương để dán vào Claude Code hoặc Claude Design.
2. **Lời & cue.** Agent viết `cues.js` (lời nguyên văn), dừng lại cho bạn đọc. Gửi góp ý hoặc **Duyệt**.
3. **Giọng đọc.** Nhập API key ElevenLabs (chỉ giữ trong RAM của server, `Ctrl + C` là mất), Voice ID,
   model, khoảng nghỉ → **Kiểm tra** (dry-run, miễn phí: số câu mới, số ký tự sẽ gửi) → **Tạo giọng**. Nút
   tạo giọng bị khoá khi chưa có key hoặc chưa kiểm tra. Server tự chạy TTS; agent không bao giờ thấy key.
4. **Dựng cảnh.** Agent dựng cảnh theo độ dài giọng thật và mốc từng từ, build + verify, chụp ảnh QA.
   Xem ảnh, gửi góp ý hoặc **Duyệt**.
5. **Render.** Server render MP4 và transcript, sau đó agent viết file chương và `PROMPTS.md`.

- Trang **Các video** mở lại video đang làm dở (trạng thái lưu ở `projects/<id>/.studio/`, không lên git).
- Trang **Thư viện** xem style, toàn bộ component (tài liệu `.prompt.md`) và các video mẫu.
- Agent chạy ở chế độ không hỏi. Claude dùng allowlist/denylist của Studio; Codex dùng sandbox
  `workspace-write` và policy không xin quyền, đồng thời tuân theo `AGENTS.md`. Cả hai đều không nhận key
  ElevenLabs đang giữ trong RAM; không được đọc `.env`, tạo giọng tốn phí, commit/push hay `/design-sync`.
- Khi phát triển Video Studio: `STUDIO_TTS_MOCK=1 npm run studio` tạo giọng im lặng thay vì gọi ElevenLabs.

## Gen video bằng Claude CLI

Mở Claude Code ở thư mục repo (`claude`). Cách nhanh nhất là bấm **Copy prompt** ở bước Kế hoạch của
Video Studio rồi dán vào. Hoặc gõ thẳng, ví dụ:

> /make-video d3-02-... — kịch bản ở `~/Downloads/...md`, Day03, style Lesson Lab Style. Làm đủ giọng,
> render, transcript và file chương.

Skill `make-video` (`.claude/skills/make-video/SKILL.md`) làm theo thứ tự **tạo giọng trước** (bạn duyệt
từng bước khi được hỏi):

1. **Kịch bản → cues.** Chép kịch bản vào `projects/<id>/kich-ban-goc.md`, viết `cues.js`: mỗi câu đọc
   một cue, lời giữ **nguyên văn**. Chốt lời trước khi tạo giọng.
2. **Giọng đọc.** Chạy dry-run trước (chưa tốn tiền), sau đó mới gọi API, rồi gắn giọng vào video:
   ```console
   node tts-elevenlabs/tts.mjs generate --cues vinuni-lesson-video-ds/ui_kits/lesson-video/videos/<id>/cues.js --pronounce projects/<id>/pronounce.json --out tts-elevenlabs/out/<id> --dry-run
   node tts-elevenlabs/tts.mjs generate --cues vinuni-lesson-video-ds/ui_kits/lesson-video/videos/<id>/cues.js --pronounce projects/<id>/pronounce.json --out tts-elevenlabs/out/<id>
   node tools/voice-timing.mjs tts-elevenlabs/out/<id>/voice.cues.json vinuni-lesson-video-ds/ui_kits/lesson-video/videos/<id> --write-cues
   ```
   ElevenLabs trả về mốc thời gian từng ký tự. `--write-cues` ghi độ dài thật của từng câu vào `cues.js`,
   và `voice.js` giữ mốc từng từ. Kết quả được cache theo từng câu: sửa một câu chỉ tốn ký tự cho câu đó.
3. **Dựng scene.** Mỗi cue một `sNN.jsx`, dựng đúng độ dài giọng thật; hoạt ảnh đặt theo
   `spokenAt(n, 'cụm từ')` = lúc cụm từ thật sự được đọc. Theo luật của style và design system (vùng nội
   dung, phụ đề ≤ 78 ký tự, font Montserrat, connector…). Kèm `STORYBOARD.md`.
4. **Build và QA.** `npm run build && npm run verify`, chụp ảnh các frame quan trọng bằng
   `node tools/shoot.mjs` vào `projects/<id>/qa/` rồi xem lại.
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
7. **Commit core.** Chỉ stage pipeline, Studio, design system, style và component dùng chung. `.gitignore`
   loại dữ liệu theo từng video: kịch bản, mã cảnh, output giọng, QA, MP4, transcript và chapter.

Muốn sửa một video có sẵn (ví dụ `d2-01-lab`) nhưng chưa có `voice.wav` thì gen lại giọng ở bước 2.
Nếu lời trong `cues.js` không đổi, `voice.cues.json` cục bộ vẫn khớp nên chỉ cần `voice.wav` khi render.

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

## Thêm style mới

1. Tạo `styles/<id>.json` theo mẫu `styles/lesson-lab.json`: `name`, `summary`, `extends` (style gốc, nếu có),
   `palette`, `showcase` (component tiêu biểu + ảnh trong `styles/previews/`), `rules`, `sampleVideo`.
2. Màu mới khai báo trong `vinuni-lesson-video-ds/lib/tokens.js`; component mới thêm vào design system
   (trên branch `lab`).
3. Ảnh preview component lấy từ lần `/design-sync` gần nhất: `python3 studio/scripts/make-previews.py`.

Video Studio và skill `make-video` đọc thẳng các file này, không cần sửa code.

## License

Copyright 2026 Nguyễn Mạnh Tú.

Project này được phát hành theo [Apache License 2.0](LICENSE).
