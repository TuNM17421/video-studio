# Dựng video bài giảng trong Claude Design

## 1. Mô hình làm việc

- **Một video = chuỗi scene nối cắt thẳng.** Mỗi scene là một component React vẽ theo `frame`
  (30 fps), bọc trong `SceneFrame`, dùng component trong `components/`.
- **Một scene = một cue lời đọc = một câu hỏi dạy học**, 10–60 giây. Thời lượng scene theo lời đọc
  thật; khi đã có file âm thanh, thời lượng đo được là authority — co giãn hoạt ảnh theo lời, không
  kéo giãn giọng.
- Nếu dùng timeline engine riêng của Claude Design, đổi thời gian sang frame trước khi gọi các helper:
  `const frame = Math.round(timeInSeconds * 30);` — mọi mốc trong design system tính bằng frame.
- Xem trước: `ui_kits/lesson-video/index.html?scene=<id>`; khoá một frame ở tỉ lệ 1:1 để chụp hoặc
  review: thêm `&frame=<n>`; tắt phụ đề: `&captions=0`.

## 2. Prompt mẫu

**Dựng một scene mới**

```
Dùng design system "VinUni Lesson Video". Dựng scene 1920×1080 · 30 fps, dài ~20 giây.
Eyebrow: NGÀY 03 · TỪ MÔ HÌNH ĐẾN TÁC TỬ · Tiêu đề: "Agent gọi công cụ như thế nào?"
Lời đọc (một cue): <dán lời đọc>
Câu hỏi dạy học: người xem phải hiểu <…> sau scene này.
Hình: bắt đầu từ template `pipeline-guard`; hạt dữ liệu đi từ yêu cầu → mô hình (glassbox) → công cụ
→ kết quả; mỗi thẻ nhận hạt pulse một lần; nhánh bị chặn màu đỏ.
Phụ đề: chia lời đọc thành trang ≤ 78 ký tự theo mốc frame.
Gắn tag MINH HỌA vì dữ liệu là ví dụ.
```

**Chuyển một kịch bản thành storyboard**

```
Đọc kịch bản dưới đây, chia thành 5–7 scene (mỗi scene một cue lời đọc). Với mỗi scene cho: tiêu đề,
câu hỏi dạy học, visual proof, template gần nhất trong ui_kits/lesson-video, các mốc frame
(đầu vào / biến đổi / đầu ra). Sau đó dựng scene 1 hoàn chỉnh theo design system.
```

**Sửa một khung hình**

```
Scene <id>, frame <n>: <mô tả lỗi — chồng chữ / hạt đi xuyên thẻ / nhãn cắt connector>.
Muốn: <kết quả mong đợi>. Giữ nguyên toạ độ các thẻ khác; kiểm tra lại frame n−1, n, n+1 và khung
dày nhất của scene.
```

**Thumbnail / slide 16:9**

```
Thiết kế thumbnail 1920×1080 cho video "<tên>": header chuẩn (eyebrow + tiêu đề), một sơ đồ tối giản
lấy từ scene trọng tâm ở trạng thái cuối, watermark; không phụ đề.
```

**Dựng cả video từ một kịch bản nhiều câu**

Làm theo cấu trúc của `ui_kits/lesson-video/videos/n2-00-gioi-thieu-ngay-2/`:

1. `cues.js`: chép nguyên văn từng câu lời đọc, kèm thời lượng (theo bản thu nếu đã có, nếu chưa thì ước
   3 tiếng/giây cộng 1 giây nghỉ), tiêu đề (chữ trên màn hình), tag `MINH HỌA` nếu cần.
2. `shared.jsx`: eyebrow, phụ đề (`cueCaptions` rồi `sliceCaptions`) và khung scene chung. Video tổng
   quan thì thêm `DayMap`.
3. `sNN.jsx`: mỗi câu một scene. Mọi mốc đặt trong object `T` và lấy từ `spokenAt(n, 'cụm từ')`.
4. `video.jsx`: `Series` nối các scene, `markers` để nhảy câu. Khi có bản thu, đặt `duration` bằng số
   frame đo được và `authoredDuration` bằng số frame cũ. Hoạt ảnh sẽ co giãn theo lời; không kéo giãn giọng.

Prompt dán sẵn cho N2-00 nằm ở `projects/n2-00-gioi-thieu-ngay-2/PROMPTS.md`, ngoài design system.

## 3. Xuất bản

- Kiểm tra định dạng xuất video hiện có trong Claude Design (và giới hạn độ dài nếu có) trước khi
  lên kế hoạch; video bài giảng 3–7 phút nên xuất theo từng scene / từng đoạn rồi ghép.
- Muốn khung hình chính xác tuyệt đối: mở `…index.html?scene=<id>&frame=<n>` — trang hiển thị đúng
  frame đó ở 1920×1080, sẵn sàng để chụp (dấu hiệu: `<html data-vk-ready="1">`).
- Âm thanh / giọng đọc vẫn đi theo pipeline hiện có của team (Google Cloud TTS → `voice.wav` +
  `voice.cues.json`); mốc cue đo được là authority về thời lượng mỗi scene.

## 4. Port ngược về Remotion (repo Video-studio)

| Design system | Remotion (repo) |
|---|---|
| `useFrame()` | `useCurrentFrame()` · dưới `AuthoredFrameScale` dùng `useAuthoredFrame()` |
| `useVideoConfig()` | `useVideoConfig()` |
| `interpolate`, `spring`, `Easing` (`lib/motion.js`) | import từ `remotion` — cùng chữ ký |
| `appear`, `pulse`, `progress`, `linearProgress` | cùng tên trong `rebuild-v1/.../shared.tsx` |
| `C` (`lib/tokens.js`) | `lightColors` (`src/theme.ts`) |
| `SceneFrame` | `Canvas` (shared.tsx) + `BrandWatermark` + `SubtitleTrack` ở parent |
| `Card`, `GlassBox`, `Pill`, `NumberBadge`, `Flow`, `Check`, `Cross`, `Bracket`, `MiniBar` | cùng tên trong `Day05/rebuild-v1/.../shared.tsx` |
| `HookOverlay` · `SectionCard` · `BrandTitle` | `D28HookIntro` · `SectionNumberCard` · `BrandTitleScene` |
| `Icon name="database"` | `<DatabaseIcon />` từ `src/primitives/icons.tsx` |
| `GlassNode`, `ZoneLabel`, `Recap` | `GlassNode`, `ZoneLabel` (`D28V01Shared.tsx`), `D28RecapScene` |
| `captions` mảng frame | `createSubtitleCaptions` + `SubtitleTrack` (timing JSON) |

Khi port: giữ nguyên toạ độ và mốc frame; chuyển mảng `captions` thành transcript cue; chạy lint và
render still ở các frame đã kiểm tra.

## 5. Build lại bundle

`dist/vk.js` được build từ `lib/`, `components/`, `ui_kits/` bằng `tools/build.mjs` (nằm cạnh thư
mục design system, ngoài phạm vi import). Sau khi sửa nguồn: `node tools/build.mjs` rồi tải lại trang.
