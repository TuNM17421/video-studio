# Claude Design — VinUni Lesson Video

Thư mục này chứa **design system của style video bài giảng hiện tại** (repo
`~/Coding/Video-studio`, khoá *AI in Action 20K*), đóng gói để dùng trong **Claude Design**.
Không file nào trong repo Video-studio bị sửa. Repo chỉ được đọc để trích xuất, và `node_modules`
của nó được dùng chỉ-đọc để build bundle.

## Có gì bên trong

| Đường dẫn | Nội dung |
|---|---|
| `vinuni-lesson-video-ds/` | **Design system ổn định** (9 màu): dùng cho video chính thức, đồng bộ với project Claude Design `2e5e9d7a…` |
| `vinuni-lesson-video-ds-lab/` | **Design system thử nghiệm**: hướng mới từ buổi brainstorm, có thêm màu và nhóm component. Đồng bộ với project `a72bc554…` |
| `vinuni-lesson-video-ds.zip` | Bản nén của thư mục trên, để tải lên nếu cần |
| `tools/` | Script build bundle (`build.mjs`), chụp ảnh QA (`shoot.mjs`), kiểm tra (`verify.mjs`). Không cần import |
| `tts-elevenlabs/` | Project phụ: gọi ElevenLabs TTS → `voice.wav` + `voice.cues.json` theo frame. Khoá đặt trong `.env`, không import |
| `projects/n2-00-gioi-thieu-ngay-2/` | Kịch bản gốc N2-00 và `PROMPTS.md`: prompt dán vào Claude Design |

**Video mẫu N2-00** (16 câu, 2:48) đã dựng sẵn trong design system:
<http://localhost:8765/ui_kits/lesson-video/videos/n2-00-gioi-thieu-ngay-2/player.html>, có menu nhảy tới
từng câu. Storyboard ở `STORYBOARD.md` cùng thư mục.

Bên trong design system:

- `README.md`: 12 luật cốt lõi, nội dung và giọng văn, màu, chữ, bố cục, chuyển động, icon, danh mục
  component và scene. Claude Design đọc file này khi thiết kế.
- `SKILL.md`: điểm vào dạng Agent Skill (`vinuni-lesson-video-design`).
- `styles.css` → `tokens/colors_and_type.css`: 9 màu `lightColors`, thang chữ Montserrat, bố cục,
  bo góc, nét, easing.
- `fonts/`: Montserrat variable (giấy phép OFL) · `assets/icons/`: 20 icon nét tay (SVG).
- `components/`: hơn 40 component React (cộng 20 icon) port từ primitives Remotion (Card,
  GlassBox, Flow có hạt, ProbabilityBars, Slider, TokenChip, Recap…). Mỗi file có `.d.ts` và
  `.prompt.md`.
- `lib/`: `interpolate`, `spring`, `Easing` tương thích Remotion, cùng các nhịp appear, pulse và hình
  học connector.
- `ui_kits/lesson-video/`: 10 scene mẫu động 1920×1080 · 30 fps (hook, thẻ tiêu đề, thẻ chương,
  so sánh hai luồng, glassbox, vòng lặp token, pipeline có kiểm soát, recap, câu hỏi kiểm tra,
  bản đồ platform kiểu Day28), kèm trình xem có phát, tua và chụp từng frame.
- `guidelines/`: tài liệu chuyên sâu (chuyển động và connector, nội dung và copy, quy trình Claude
  Design, port ngược về Remotion) và các card nền tảng.
- 28 card preview có marker `@dsCard` cho tab Design System, thuộc các nhóm Colors, Type, Spacing,
  Motion, Brand, Iconography, Components, Scenes và Lesson Video.

## Import vào Claude Design (Claude Desktop)

Theo hướng dẫn chính thức của Anthropic, design system được tạo trong bước onboarding của tổ chức,
hoặc sau đó từ **Organization settings**:

1. Mở **Claude Design** ở thanh bên Claude Desktop → phần thiết lập design system → tạo design
   system mới.
2. Ở bước đưa nguồn vào, cung cấp thư mục `vinuni-lesson-video-ds/`. Nếu giao diện cho phép *link
   thư mục cục bộ* hoặc *upload repository* thì chọn thư mục này. Nếu chỉ nhận file tải lên, thử
   `vinuni-lesson-video-ds.zip`.
3. Chờ Claude Design đọc và dựng hệ thống, rồi xem lại các card và file README.
4. Thử trong một project, sau đó bật **Published** để cả nhóm dùng được.

Tên menu có thể khác nhau giữa các phiên bản. Mình chưa xác minh được Claude Desktop có nhận
thẳng file `.zip` hay không, nên ưu tiên cách link hoặc upload thư mục.

**Cách khác:** đẩy thẳng thư mục vào một project design system trên claude.ai/design từ Claude Code
(công cụ DesignSync). Bước này ghi vào tài khoản của bạn nên cần bạn đồng ý trước.

## Xem trước trên máy

```console
cd ~/Claude-Design
python3 -m http.server 8765 --directory vinuni-lesson-video-ds
```

- Toàn bộ card: <http://localhost:8765/gallery.html>
- Scene kit (phát / tua / Space / ← →): <http://localhost:8765/ui_kits/lesson-video/index.html>
- Một frame chính xác 1:1 để chụp: `…/index.html?scene=flow-compare&frame=300`

Font không tải được khi mở trực tiếp bằng `file://`, nên cần chạy server HTTP như trên.

## Sửa và build lại

Sửa nguồn trong `lib/`, `components/`, `ui_kits/lesson-video/scenes/`, rồi chạy:

```console
node tools/build.mjs          # → vinuni-lesson-video-ds/dist/vk.js + assets/icons/*.svg
```

Script tự dùng `esbuild`/`react` trong `~/Coding/Video-studio/node_modules` (chỉ đọc). Nếu muốn build
độc lập: `cd tools && npm install`. Kiểm tra bằng ảnh: `node tools/shoot.mjs <url> out.png`.

## Giọng đọc và xuất MP4

```console
cd ~/Claude-Design
(cd tts-elevenlabs && npm run n2-00)                 # ElevenLabs → out/…/voice.wav + voice.cues.json
node tools/voice-timing.mjs tts-elevenlabs/out/n2-00-gioi-thieu-ngay-2/voice.cues.json \
     vinuni-lesson-video-ds/ui_kits/lesson-video/videos/n2-00-gioi-thieu-ngay-2   # co giãn hình theo giọng
node tools/build.mjs && node tools/verify.mjs
node tools/render.mjs --scene n2-00-gioi-thieu-ngay-2 \
     --audio tts-elevenlabs/out/n2-00-gioi-thieu-ngay-2/voice.wav \
     --out projects/n2-00-gioi-thieu-ngay-2/render/N2-00-gioi-thieu-ngay-2.mp4
```

- Cần server xem trước đang chạy ở cổng 8765.
- `render.mjs` chụp từng frame bằng Chrome headless (chạy song song nhiều tab), rồi ghép bằng ffmpeg
  lấy từ `~/Coding/Video-studio/node_modules/@remotion/compositor-linux-x64-gnu` (chỉ đọc).
- Nếu tiếng dài khác hình, script sẽ dừng và báo lỗi.
- Muốn quay về thời lượng theo kịch bản: `node tools/voice-timing.mjs --clear <thư mục video>`.

## Gợi ý khi dùng trong Claude Design

- Mở đầu prompt bằng: *"Dùng design system VinUni Lesson Video. Dựng scene 1920×1080 · 30 fps…"*,
  rồi đưa lời đọc của scene, câu hỏi dạy học và template gần nhất (xem
  `guidelines/claude-design-workflow.md` để có prompt mẫu đầy đủ).
- Mỗi scene ứng với một cue lời đọc. Mọi con số minh hoạ phải gắn nhãn `MINH HỌA`.
- Muốn đưa scene về pipeline Remotion hiện tại thì xem bảng ánh xạ trong
  `guidelines/claude-design-workflow.md`, mục 4.
