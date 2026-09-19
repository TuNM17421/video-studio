# VinUni Lesson Video — Design System

**VinUni · AI in Action 20K** — video bài giảng tiếng Việt · 16:9 · 1920×1080 · 30 fps · nền trắng.

Design system này được trích xuất từ repo Remotion **Video-studio** (các video Day01–Day05 bản
`rebuild-v1` và Day28) để Claude Design dựng **scene động, video giải thích, storyboard, slide 16:9,
thumbnail, poster** đúng style của khoá học. Mọi kích thước là px trên khung 1920×1080
(1 px CSS = 1 px video); mọi thời gian là **frame ở 30 fps**.

> Đọc hết **Mười hai luật** và **VISUAL FOUNDATIONS** trước khi thiết kế. Khi cần một bố cục, mở
> template gần nhất trong `ui_kits/lesson-video/scenes/` rồi sửa chữ, toạ độ, mốc frame.

---

## Mười hai luật cốt lõi

1. **Khung**: 1920×1080, 30 fps, nền trắng. Sơ đồ dùng **toạ độ px tuyệt đối** — không để flex/grid
   tự co giãn khi phần tử xuất hiện lần lượt (chỗ của mọi phần tử được giữ sẵn, chỉ đổi opacity).
2. **Màu**: **9 token** `lightColors` cho mọi thứ (bảng ở mục Màu), cộng **4 màu vai trò** (tím, xanh lá, cam,
   vàng đậm) chỉ cho nhãn vùng / viền / nền nhạt khi kịch bản mã hóa vai trò bằng màu. Không thêm hex khác,
   không gradient, không màu thương hiệu khác (trừ logo `Brand`). Tint, bóng, glow = chính các màu đó ở alpha.
3. **Chữ**: chỉ **Montserrat 500 / 600 / 700** (có subset tiếng Việt). Monospace chỉ cho code.
4. **Nghĩa của màu**: xanh `accent` = dữ liệu / trung tính / chưa xử lý · đỏ `red` = điểm nhấn / đã
   chọn / đã biến đổi / hành động / rủi ro / đáp án · `bgAlt` = thân thẻ và "cỗ máy kính" ·
   `dotInactive` = đường ray, divider, trạng thái chưa kích hoạt.
5. **Header chuẩn**: eyebrow đỏ IN HOA giãn chữ `NGÀY 0N · CHỦ ĐỀ NGÀY` (top 70) → tiêu đề 50 px đậm
   căn giữa (baseline 176) → divider 3 px (y 220, x 96→1824) → tag đỏ góc phải (`VÍ DỤ`, `CÂU HỎI`,
   `SO SÁNH`, `GLASSBOX`…).
6. **Luôn có**: watermark `● VinUni · AI in Action 20K` ở góc phải trên và **phụ đề burned-in** =
   thanh navy cao 96 px ở đáy, chữ trắng 29 px, một dòng ≤ 78 ký tự mỗi trang.
7. **Vùng an toàn**: nội dung dạy học nằm trong **y 250–960, x 80–1840**. Không đặt gì quan trọng
   dưới y 984 (vùng của thanh phụ đề).
8. **Kỹ thuật dựng hình kiểu 3Blue1Brown**: hạt dữ liệu chảy trên connector, "cỗ máy kính"
   (glassbox) mở hộp đen ra, biểu đồ / ma trận co giãn liên tục theo tham số. Không kể một khái
   niệm cốt lõi chỉ bằng icon-trong-vòng-tròn + mũi tên.
9. **Mỗi vật thể có một việc**: phải nói được "nó tồn tại để thể hiện ___ trong lời đọc". Không nói
   được thì bỏ hoặc vẽ lại.
10. **Connector là authority**: hạt chạy đúng trên đường đã vẽ, cùng một progress với nét vẽ; ẩn khi
    đi qua mặt thẻ; thẻ nhận hạt nhấp nháy (`pulse`) đúng một lần; thẻ phải hiện trước khi hạt tới.
11. **Chuyển động tất định**: mọi thứ là hàm thuần của frame (không `Math.random`, không CSS
    transition, không đồng hồ thật). Reveal 24 f, pulse 54 f, hook 150 f. Trạng thái cuối giữ đủ
    lâu để đọc (≥ 60 f).
12. **Trung thực**: số liệu, tỉ lệ, model, log trong hình là ví dụ biên tập, không trình bày như kết quả thật.
    Không dùng logo làm "bằng chứng". **Lab (11/09/2026): không vẽ card / tag / con dấu `MINH HỌA`** —
    `CornerTag`, `IllustrativeStamp` và prop `illustrative` của component bỏ qua mọi nhãn chứa "MINH HỌA"
    (`isHiddenIllustrativeLabel`). Các tag khác (`VÍ DỤ`, `CÂU HỎI`, `BÀI TẬP`, `CHƯA CHẠY THẬT`…) vẫn hiện.

---

## Sources — nguồn trích xuất

| Nguồn trong repo Video-studio | Đã trích |
|---|---|
| `src/theme.ts` | `lightColors` (9 token) · `colors` dark (legacy) |
| `src/primitives/lightScene.tsx` | Montserrat 500/600/700 + subset vietnamese, `Scene`, `Eyebrow`, `Headline`, `IconCard`, `FlowArrow`, `HubDiagram`, `BrandTitleScene`, `FooterCaptionTrack`, `useEnter` |
| `src/primitives/scenes.tsx` | `BrandWatermark`, `SectionNumberCard`, `ResearchCard` |
| `src/primitives/icons.tsx` | 20 icon nét tay |
| `src/primitives/gptVisuals.tsx`, `AnimatedPath`, `CountUp`, `layout.ts`, `arc.ts` | `Block3D`, `ProbabilityBars`, `HighlightedText`, đo polyline, count-up, xếp chip |
| `src/videos/Day05/rebuild-v1/*/shared.tsx`, `geometry.ts` | **bản chuẩn mới nhất**: `Canvas`, `Card`, `GlassBox`, `Pill`, `NumberBadge`, `CornerTag`, `Flow`, `Check`, `Cross`, `Bracket`, `MiniBar`, `StatusDot`, `progress/appear/pulse` |
| `src/videos/Day01–Day04/rebuild-v1/**` | token chip + phân bố + vector (Day01), double diamond (Day02), glassbox 4 khối, chip, `MockBadge` (Day03–04) |
| `src/videos/Day0*/rebuild-v1/SubtitleTrack.tsx` | thanh phụ đề + phân trang 78 ký tự |
| `src/videos/Day28/*` | biến thể editorial: lưới 120 px, header trái, `GlassNode`, `ZoneLabel`, `DataParticle`, recap rail, hook 150 f |
| `src/videos/Day01/Day01-345-LlmTransformerCost.tsx` | ví dụ 3B1B gốc (`S1DefScene`), thẻ chương nền navy, câu chốt |
| `docs/visualization-style.md` | triết lý 3B1B, 3 nhịp, checklist |
| `.agents/skills/video-studio-production-qa/references/visual-motion-contracts.md` | luật connector / hạt / reveal / layout |
| 8 MP4 đã render (Day01, 02, 03, 04, 05, 28) | đối chiếu khung hình thật |

---

## CONTENT FUNDAMENTALS

**Khán giả & giọng.** Sinh viên và người đi làm học AI ứng dụng. Lời đọc tiếng Việt tự nhiên, xưng
"mình" – "bạn", câu ngắn, ví dụ đời thường (công tắc đèn, bát phở, tóm tắt thư, hỏi lịch học). Giữ
thuật ngữ tiếng Anh mà người Việt vẫn nói (token, prompt, API, agent, temperature, context) và giải
nghĩa ở lần đầu: "độ ngẫu nhiên (temperature)". Không chèn tiếng Anh khi đã có từ Việt tự nhiên.

**Cấu trúc một video** (3–7 phút, 5–7 scene):
1. **Hook** — một câu hỏi 72 px trong 150 frame đầu, là một phần của scene 1.
2. **Mỗi scene = đúng một cue lời đọc = một câu hỏi dạy học.** Tiêu đề scene là câu hỏi hoặc mệnh
   đề chốt.
3. **Nhịp trong scene**: đầu vào (15–20 %) → biến đổi (50–60 %, phần trọng tâm) → đầu ra (20–25 %).
4. **Scene cuối**: recap + câu hỏi kiểm tra; các lựa chọn giữ trung lập tới đúng frame đáp án.

**Chữ trên màn hình rất ngắn** — lời đọc gánh phần giải thích, hình chỉ giữ từ khoá và trạng thái.

| Vị trí | Quy tắc | Ví dụ thật trong repo |
|---|---|---|
| Eyebrow | IN HOA · `NGÀY 0N · CHỦ ĐỀ NGÀY` | `NGÀY 05 · THIẾT KẾ SẢN PHẨM AI` · `NGÀY 03 · TỪ MÔ HÌNH ĐẾN TÁC TỬ` |
| Tiêu đề scene | câu hỏi hoặc mệnh đề, viết thường như câu, ≤ 40 ký tự | "Mô hình chọn token như thế nào?" · "Lớp 1: tách nhiệm vụ khỏi dữ liệu" |
| Nhãn thẻ (micro) | IN HOA, 1–3 từ | `YÊU CẦU` · `KẾT QUẢ` · `BẢN A` · `NHẬN THỨC` |
| Nội dung thẻ | tối đa 2–3 dòng; dòng 1 IN HOA/đậm (danh từ chính), dòng 2 thường (giải thích) | `ĐÈN SÁNG` / cùng trạng thái |
| Pill / chip | IN HOA rất ngắn, có thể dùng → | `CHỌN → NỐI → LẶP LẠI` · `CHẶN` · `ĐỌC` |
| Tag góc | IN HOA, nói rõ tính chất hình | `VÍ DỤ` · `CÂU HỎI` · `SO SÁNH` (lab: không dùng `MINH HỌA`) |
| Ghi chú | câu thường, màu muted | "Cách chia token và số liệu minh họa" · "Model A (giả định)" |
| Phụ đề | câu nói thật, ≤ 78 ký tự / trang, ngắt ở dấu câu | "Thường là không: họ chọn từ khác nhưng vẫn giữ ý chính." |

**Ký hiệu & số.** Ngăn cách bằng ` · `; quan hệ bằng `→`; số theo kiểu Việt (`8.192`, `1,2 tỷ`);
phần trăm `50%`; ngoặc kép cong `“…”`; khoảng thời gian `21:00`.

**Không dùng**: emoji, dấu chấm than, câu dài viết IN HOA, thuật ngữ không giải nghĩa, số liệu
không nguồn trình bày như kết quả thật, logo công nghệ để "chứng minh" một kết luận.

Chi tiết và danh mục copy mẫu: [`guidelines/content-and-copy.md`](guidelines/content-and-copy.md).

---

## VISUAL FOUNDATIONS

### 1 · Khung hình & bố cục

```
   0 ┌────────────────────────────────────────────────────────────────────── 1920
  46 │                                               ● VinUni · AI in Action 20K   watermark · right 56
  70 │                  N G À Y  0 5  ·  T H I Ế T  K Ế  S Ả N  P H Ẩ M  A I       eyebrow 26 px đỏ
 176 │                           Hai kiểu kỳ vọng                                   tiêu đề 50 px · baseline
 220 │   ────────────────────────────────────────────────────────────────────       divider 3 px · x 96→1824
 228 │                                                         (  VÍ DỤ  )         tag · mép phải x 1792
 250 │   ┌ vùng nội dung · x 80 → 1840 ───────────────────────────────────┐
     │   │  thẻ · glassbox · flow · biểu đồ — toạ độ tuyệt đối            │
 960 │   └────────────────────────────────────────────────────────────────┘
1032 │   01 / 06 · Tên video                                     (footer)           ẩn dưới phụ đề
 984 │████████ thanh phụ đề 96 px · navy · chữ trắng 29 px · ≤ 78 ký tự ████████
1080 └──────────────────────────────────────────────────────────────────────
```

| Phần tử | Vị trí | Quy cách |
|---|---|---|
| Watermark | top 46 · right 56 | chấm đỏ 9 px + "VinUni · AI in Action 20K" 21 px/700, chữ 75 % opacity; có ở mọi scene |
| Eyebrow | top 70 · căn giữa | 26 px/700 · IN HOA · giãn chữ 5 px · đỏ |
| Tiêu đề | baseline 176 · căn giữa | 50 px/700 navy (40–56 px tuỳ độ dài) |
| Divider | y 220 · x 96→1824 | 3 px `dotInactive` |
| Tag góc | top 228 · mép phải 1792 | pill cao 42 px, nền `redSoft`, viền đỏ 2 px, 17 px/700 đỏ |
| Nội dung | y 250–960 · x 80–1840 | toạ độ tuyệt đối; chừa làn cho nhãn và connector |
| Footer | bottom 48 · x 120→1800 | "01 / 06 · Tên video" 17 px/600 muted; bị thanh phụ đề che khi có lời |
| Phụ đề | y 984–1080 | nền `text` navy, viền trên 2 px `accent`, chữ trắng 29 px/600, căn giữa, 1 dòng |

### 2 · Màu

| Token | Hex | CSS var | Vai trò | Dùng cho |
|---|---|---|---|---|
| `bg` | `#ffffff` | `--color-bg` | nền canvas | nền mọi scene, thân pill, nền GlassNode |
| `bgAlt` | `#f2f7fc` | `--color-bg-alt` | cỗ máy / thân thẻ | Card, GlassBox (68 %), track bar Day01, nền câu chốt |
| `text` | `#0b2a4d` | `--color-text` | mực chính | tiêu đề, nội dung, **nền thanh phụ đề** |
| `textMuted` | `#4a4a4a` | `--color-text-muted` | chữ phụ | phụ đề thẻ, ghi chú, footer, nhãn cực |
| `accent` | `#1d6199` | `--color-accent` | dữ liệu / trung tính | viền thẻ, hạt, flow mặc định, cột bar ứng viên |
| `accentStrong` | `#134d8b` | `--color-accent-strong` | nhãn xanh đậm | nhãn nhóm, tiêu đề cột, node đang active (editorial) |
| `red` | `#c72127` | `--color-red` | nhấn / chọn / rủi ro | eyebrow, tag, flow được chọn, token được chọn, check/cross, đáp án |
| `redSoft` | `#ffe0e1` | `--color-red-soft` | nền active / cảnh báo | lớp phủ khi `pulse`, thẻ cảnh báo, nền tag |
| `dotInactive` | `#e0edf8` | `--color-dot-inactive` | ray / chưa kích hoạt | đường ray connector, divider, track bar, lưới, badge nghỉ |

- Tần suất trong repo: `red` 1 190 lần · `accent` 632 · `text` 502 · `bg` 494 · `accentStrong` 405
  · `textMuted` 349 · `bgAlt` 231 · `dotInactive` 170 · `redSoft` 98 → đỏ xuất hiện dày ở **nét
  và nhãn nhỏ**, không phải mảng lớn. Mảng lớn luôn là trắng / `bgAlt`.
- Công thức alpha được phép: bóng navy `rgba(11,42,77,.16)`; glow xanh `rgba(29,97,153,.25)`;
  glow đỏ `rgba(199,33,39,.24)`; heatmap = đỏ ở 8–100 % opacity.
- Không dùng: gradient, nền tối cho scene nội dung. Bảng màu nền tối `colors` là legacy — **không dùng cho video mới**.

**Màu vai trò (duyệt 11/09/2026, phương án B)** — `ROLE` / `ROLE_OF` trong `lib/tokens.js`, `--role-*` trong CSS.
Chỉ dùng cho **nhãn vùng, viền và nền nhạt** gọi tên một vai trò mà kịch bản mã hóa màu; không dùng cho chữ thân,
số liệu hay hạt. Đỏ vẫn giữ nghĩa nhấn / chặn / rủi ro.

| Vai trò (`ROLE_OF`) | Viền | Nền nhạt | Kịch bản dùng cho |
|---|---|---|---|
| `input` | `#1d6199` (accent) | `#e0edf8` | đầu vào, nhận thức |
| `process` / `reasoning` | `#5b4b9a` tím | `#e8e6f1` | xử lý, suy luận, khối "vai trò" |
| `output` | `#2f7d57` xanh lá | `#e1ede7` | đầu ra, đã duyệt / đạt |
| `check` / `action` | `#c8641e` cam | `#f7e9e0` | cần kiểm tra, hành động, lỗi công cụ |
| `memory` | `#a87a0c` vàng đậm | `#f3ecdd` | trí nhớ, ngữ cảnh, đang chờ |

### 3 · Chữ

Montserrat, weight **500 / 600 / 700** (bản render chỉ nạp 3 weight này; code gốc ghi 800/900 nhưng
hiển thị thành 700 — `@font-face` ở đây khai báo dải 500–700 để tái tạo đúng).

| Vai trò | px · weight · line-height · tracking | Màu | Dùng cho |
|---|---|---|---|
| section-number | 92 · 700 · 1 | `red` | số chương |
| hook | 72 · 700 · 1.16 · −1.2 | `text` | câu hỏi mở đầu (≤ 2 dòng) |
| display | 62 · 700 · 1.25 | `text` | thẻ tiêu đề thương hiệu |
| section-label | 54 · 700 | `text` | nhãn chương cạnh số |
| title-editorial | 54 · 700 · 1.08 · −1.4 | `text` + cụm `red` | tiêu đề biến thể editorial |
| **title** | **50 · 700 · 1.16** | `text` | tiêu đề scene (40–56 cho phép) |
| question | 44 · 700 · 1.25 | `text` | câu hỏi kiểm tra |
| headline | 40 · 700 · 1.25 | `text` | tiêu đề gọn (Day02–Day04) |
| statement | 40 · 500 · 1.5 | `text` | câu chốt cuối video |
| token | 36 · 700 | `text` / `red` | chữ trong token chip |
| caption | 29 · 600 · 1.3 | trắng trên `text` | phụ đề |
| card-title | 28 · 700 · 1.18 | `text` | tiêu đề thẻ HTML |
| eyebrow | 26 · 700 · IN HOA · +5 | `red` | eyebrow |
| icon-label | 25 · 600 | `text` | nhãn dưới icon badge |
| body | 24 · 600 · 33 px | `text` | dòng trong thẻ SVG, sơ đồ |
| kicker | 22 · 700 · IN HOA · +4 | `red` | kicker editorial |
| card-sub | 21 · 600 · 1.22 | `textMuted` | dòng phụ trong thẻ |
| watermark | 21 · 700 · +0.5 | `text` 75 % | watermark |
| label | 18 · 700 · IN HOA · +1.2 | `accentStrong` | pill, nhãn nhóm |
| micro | 17 · 700 · IN HOA | `accent` / `red` | nhãn thẻ, tag, số badge |
| footer | 17 · 600 | `textMuted` | footer scene |
| mono | 22 · 600 · ui-monospace | `text` | code, tên hàm |

Quy tắc: tiêu đề viết như câu; IN HOA chỉ cho eyebrow / nhãn / pill / tag; không chữ nào dưới 16 px
(trừ nhãn trục heatmap 14 px); mỗi thẻ tối đa 3 dòng; weight 500 chỉ cho câu chốt dài.

### 4 · Hình khối, nét, độ nổi

| | Giá trị |
|---|---|
| Bo góc | 9 mini-bar · 14 chip · 16 token · 18 thẻ HTML · **22 thẻ SVG / GlassNode / recap** · 30 glassbox · 32 enclosure · pill tròn hẳn |
| Nét | 2 hairline / tag / badge · 2.5 pill · **3 thẻ + glassbox** · 4 bracket / enclosure · **5 flow + viền active** · 8 check / cross · 12 track slider |
| Nét đứt | `12 10` thẻ giả định / đang chờ · `13 11` flow tuỳ chọn / bất đồng bộ · `15 12` enclosure nhóm |
| Độ nổi | phẳng. Bóng chỉ cho glassbox "anh hùng" (`0 12 28 navy 16 %`), mặt trước khối xếp chồng, icon câu chốt |
| Trạng thái active | lớp phủ `redSoft` + viền đỏ 5 px, opacity = `active × 0.72` (thẻ) hoặc `× 0.5` (glassbox) |
| Trạng thái muted | opacity × 0.36 (thẻ không phải tiêu điểm) |

### 5 · Chuyển động

Mọi scene là hàm thuần của `frame` (30 fps) — `useFrame()` ở đây, `useCurrentFrame()` ở Remotion.

| Nhịp | Frame | Công thức (`lib/motion.js`) |
|---|---|---|
| appear (reveal chuẩn) | 24 | `appear(f, start)` — ease `cubic-bezier(0.16, 1, 0.3, 1)` |
| fade tuyến tính | 24 | `fade(f, start)` |
| xuất hiện rồi rời đi | 24 vào · 24 ra | `fadeWindow(f, start, end)` |
| pulse thẻ nhận | 54 | `pulse(f, at)` — 0 → 1 (ở 32 %) → 0, gán vào `active` |
| flow | start → end | quãng đường tuyến tính; mũi tên hiện 14 f cuối; cả flow fade-in 18 f |
| vào thẻ tiêu đề | ~20 | `spring` damping 200, scale 0.94 → 1 + opacity 18 f |
| pop icon / badge | ~25 | `spring` damping 13 · stiffness 140 |
| thẻ chương | ~25 | `spring` damping 14 · stiffness 120 |
| hook | 150 | chữ vào 8→28 (nâng 18 px) · gạch đỏ 30→58 (0→184 px) · chữ ra 116→132 · nền trắng tan 134→149 |
| di chuyển mượt | tuỳ | `smooth(f, a, b)` — in-out cubic |

- **Nhịp scene**: đầu vào 15–20 % · biến đổi 50–60 % · đầu ra 20–25 %. Tham số quét phải **dừng ở
  hai thái cực ≥ 45 f**. Trạng thái cuối giữ ≥ 60 f.
- **Giữa các scene: cắt thẳng** (hard cut). Nội dung tự dựng dần trong scene. Khi thay cả sơ đồ, sơ
  đồ cũ rời bằng opacity và không bao giờ có hai sơ đồ đầy đủ chồng nhau.
- **Không**: camera zoom/pan, xoay, nảy (bounce/elastic) trên chữ, lắc lư, hạt tự lượn sóng,
  vòng lặp vô cớ. Ngoại lệ có chủ đích: kết nối "đang chạy" kiểu Day28 (3 chấm lặp mỗi 90 f).
- **Số liệu liên tục**: số và độ dài bar lấy từ cùng một giá trị liên tục; chỉ làm tròn khi hiển thị.

Chi tiết connector, hạt, pulse, geometry guard: [`guidelines/motion-and-connectors.md`](guidelines/motion-and-connectors.md).

### 6 · Kỹ thuật dựng hình (3Blue1Brown, là mặc định)

- **Flow-based**: dữ liệu không đứng yên — hạt `accent` chảy vào cỗ máy, đổi sang `red` khi đã biến
  đổi xong, rồi phân nhánh tới đầu ra.
- **Glassbox**: mọi "hộp đen" (LLM, attention, agent, pipeline) được mở ra — khối `bgAlt` viền rõ,
  chia lớp bên trong, lớp nào có dữ liệu đi qua thì sáng lên.
- **Continuous reshaping**: bar chart / ma trận co giãn theo tham số (temperature, context, chi phí),
  có đoạn dừng ở hai thái cực.
- **Vector / ma trận** vẽ bằng **ngoặc vuông thật** (`VectorColumn`), không phải khối chữ nhật.
- Icon trong vòng tròn chỉ cho **nhãn phụ** (năng lực ở cuối luồng), không làm phương tiện kể chuyện
  chính.

### 7 · Biến thể

| Biến thể | Khi nào | Khác biệt |
|---|---|---|
| `center` (**chuẩn**) | mọi video mới | header căn giữa như trên |
| `editorial` (Day28) | chủ đề hệ thống / platform / kiến trúc | lưới 120 px mờ 38 %, kicker đỏ trái 22 px, tiêu đề trái 54 px có **cụm đỏ nhấn**, subtitle muted, `GlassNode` trắng, `ZoneLabel`, logo sản phẩm thật |
| legacy icon + mũi tên | đã có trong video cũ | `IconBadge` + `→`; chấp nhận cho nhãn phụ, không tự áp ngược |
| legacy dark | — | không dùng |

---

## ICONOGRAPHY

- **Bộ 20 icon nét tay** (`components/icons/Icons.jsx`, file rời ở `assets/icons/*.svg`): `bulb`,
  `coin`, `trend-up`, `database`, `neural-net`, `chat-bubble`, `robot`, `document`, `eye`,
  `calendar-x`, `alert-bubble`, `scale`, `layers`, `split-path`, `edit`, `code`, `check`, `users`,
  `scissors`, `gear`.
- **Quy cách**: lưới 64×64, nét 3 px bo tròn đầu và góc, `stroke = currentColor`, không fill (trừ
  chấm tròn nhỏ). Màu: `accent` mặc định, `accentStrong` trong thẻ tiêu đề, `red` cho năng lực /
  nguy cơ, trắng trên vòng tròn đặc.
- **Vật chứa**: vòng tròn trắng viền 3 px (icon chiếm 52 % đường kính) · góc trên-trái thẻ (30 px) ·
  đầu `GlassNode` (42 px) · vòng `bgAlt` 120 px ở thẻ tiêu đề.
- **Công nghệ có tên** (Kafka, Airflow, Kubernetes, vLLM, MLflow…) → **logo SVG chính thức**, giữ màu
  gốc, không nhuộm logo nhiều màu; vùng xung quanh vẫn dùng token. Icon chung chỉ cho khái niệm chung
  (tài liệu, dữ liệu, người dùng, cảnh báo). Không có asset đúng nghĩa → tự vẽ sơ đồ nhỏ bằng primitives.
- **Bộ Lucide chuẩn hóa** (`components/icons/LineIcon.jsx`, ISC): 40 icon khái niệm hệ thống (`lock`, `mail`,
  `server`, `wrench`, `braces`, `search`, `octagon-x`, `user-check`…). Grid 24 vẽ ở nét 1,125 = đúng nét 3 px/64
  của bộ vẽ tay. Mọi prop `icon` và `<Icon name>` nhận cả hai bộ tên. Cần thêm tên → import + thêm vào `LINE_ICONS`.
- **Logo**: `<Brand name>` (anthropic, claude, gemini, meta, huggingface, github, python, mcp — bản vẽ Simple Icons
  CC0, nhãn hiệu thuộc chủ sở hữu, giữ màu gốc). OpenAI / Copilot chưa có — lấy từ brand kit chính thức.
- **Không**: emoji, icon font, clip-art, ảnh stock, ảnh chụp. Hình từ paper (vd. Figure 2 "Attention
  Is All You Need") hiển thị nguyên bản trong khung trắng, ghi nguồn.

---

## Components

Mọi component là React thuần: giá trị động (opacity, active, progress) đi vào qua props, tính từ
`frame`. Import từ `components/index.js`. Props: `*.d.ts` · cách dùng: `*.prompt.md`.

| Nhóm | Component | Dùng cho |
|---|---|---|
| chrome | `SceneFrame` | khung scene đầy đủ: header (center / editorial), watermark, footer, phụ đề; con = SVG 1920×1080, `overlay` = HTML |
| chrome | `Eyebrow`, `CenterHeader`, `CornerTag`, `Watermark`, `SceneFooter`, `SubtitleBar`, `EditorialHeader`, `EditorialGrid` | từng mảnh chrome khi cần dựng tay |
| text | `SvgText`, `Multiline`, `RichText` | chữ SVG (baseline), khối 1–3 dòng, câu có từ đổi màu |
| cards | `Card` | thẻ sơ đồ chuẩn: nhãn micro + 1–3 dòng, `active` / `muted` / `dashed` / `icon` |
| cards | `GlassBox` | cỗ máy kính chứa lớp bên trong, pill tên vắt trên mép |
| cards | `GlassNode` | node hệ thống editorial (icon hoặc logo + nhãn + phụ) |
| cards | `IconBadge` | icon trong vòng tròn (legacy / nhãn phụ / tâm hub) |
| labels | `Pill`, `Chip` | nhãn tròn 50 px (outline / active / solid / muted), chip phẳng |
| labels | `NumberBadge`, `StatusDot`, `ZoneLabel` | số bước, chấm trạng thái, nhãn làn editorial |
| flow | `Flow`, `Particle`, `StaticPath` | connector động có hạt + mũi tên; hạt đơn có nhãn; đường tĩnh |
| marks | `Check`, `Cross`, `Bracket`, `Enclosure` | dấu đúng/sai vẽ tay, ngoặc gom nhóm, khung nét đứt có tên |
| data | `ProbabilityBars`, `MiniBar`, `Slider` | phân bố xác suất, đồng hồ nhỏ, thanh tham số |
| data | `TokenChip`, `VectorColumn`, `Heatmap` | token, vector có ngoặc thật, ma trận / attention |
| beats | `HookOverlay`, `BrandTitle`, `SectionCard`, `Statement` | hook 150 f, thẻ tiêu đề, thẻ chương, câu chốt |
| beats | `Recap`, `QuestionCard` | recap rail có số, câu hỏi kiểm tra |
| roadmap | `DayMap` | bản đồ ngày học của video tổng quan: 3 thẻ câu hỏi (full) ↔ dải 6 phần dưới header (strip) |
| figures | `Person`, `DocumentSheet`, `FormSheet`, `SpeechBubble`, `Stopwatch` | nhân vật và đồ vật cho tình huống MINH HỌA; phiếu có ô trống = chưa đo; đồng hồ không số |
| icons | `Icon` + 20 `*Icon`, `LineIcon` | đặt icon trong SVG theo tâm; `LineIcon` = 40 icon Lucide chuẩn hóa |
| brand | `Brand` | logo sản phẩm có tên (gọi đúng tên, không trang trí) |
| labels | `IllustrativeStamp` | dấu nhãn (tag / stamp / watermark); **lab: nhãn chứa "MINH HỌA" không được vẽ** — prop `illustrative` vẫn nhận nhưng không hiện card MINH HỌA |
| control | `Gate`, `PermissionBoundary`, `ApprovalStep` | cổng quyền / duyệt / đối chiếu (mở · chặn · lỗi · chờ), vùng quyền, bước người duyệt |
| control | `StopGate`, `StepCounter` | cửa dừng của vòng agent, bộ đếm lượt 0/3 → 3/3 |
| ui | `BrowserFrame`, `ChatWindow`, `Cursor`, `UIButton`, `EmailCard`, `Tray` | giao diện giả lập (luôn MINH HỌA): cửa sổ web, chat nhả chữ theo token, con trỏ, nút, thư, khay |
| code | `CodeBlock`, `JsonView`, `LogCard` | code tô màu theo palette, JSON có chú thích tiếng Việt + nối mã khớp, nhật ký thực thi |
| system | `Swimlane`, `ToolCard`, `ArchitectureNode` | làn hệ thống, thẻ khai báo công cụ 3 vùng, khối kiến trúc host/client/server/API |
| system | `DecisionNode`, `BranchRouter` | nút quyết định hình thoi, rẽ nhánh theo độ tự tin / 4 nhánh |
| loop | `AgentLoop` | vòng ReAct / 4 khối agent / bánh đà, hạt chạy vòng, nhánh thoát và nhánh lỗi |
| table | `DataTable` | bảng hiện từng hàng, ô trạng thái (đạt · chặn · chờ · chưa thử · lỗi), cột TRƯỚC/SAU |
| context | `Envelope`, `ContextBudget`, `ContextTray`, `FilingCabinet` | gói gửi đi / không gửi, thanh ngân sách ngữ cảnh có phần dư, khay ngữ cảnh, tủ hồ sơ ngoài |
| figures | `Magnifier`, `SourceCard` | kính lúp soi dòng, thẻ nguồn trích đoạn (đã đối chiếu / không có nguồn) |
| teaching | `MisconceptionCard`, `AnalogyBridge`, `CompareSplit` | "nhiều người nghĩ / thực ra" có gạch đỏ, phép so sánh đời thường ↔ khái niệm, hai bản đặt cạnh nhau + câu chốt khác biệt |
| structure | `LayerStack`, `Timeline`, `ConceptMap` | các lớp của một hệ thống (một lớp tiêu điểm), mốc thời gian tô dần, bản đồ khái niệm có quan hệ được đặt tên |
| structure | `Matrix2x2`, `Iceberg` | lưới quyết định 2 × 2 có một ô được chọn, phần nổi / phần chìm |
| data | `Gauge`, `RangeBand`, `UnitGrid` | đồng hồ bán nguyệt có ngưỡng, ước lượng kèm khoảng dao động, đếm bằng ô (18 trên 60) |
| marks | `Spotlight` | làm mờ cả khung trừ một vùng để dẫn mắt, không dịch chuyển gì |

Helpers mới: `lib/text.js` (gõ chữ an toàn dấu tiếng Việt, `rng(seed)`, `formatNumber`) · `lib/paths.js`
(`@remotion/paths`, d3-shape/scale/interpolate, flubber, dagre: `curvePath`, `pointOnPath`, `drawOn`, `morphPath`, `layoutGraph`).

---

## Scene patterns — `ui_kits/lesson-video`

Mở `ui_kits/lesson-video/index.html` để xem, phát, tua từng frame. Mỗi file trong `scenes/` là một
template hoàn chỉnh (chrome, copy tiếng Việt, phụ đề, mốc frame tên rõ).

| id | Pattern | Dùng khi |
|---|---|---|
| `hook-question` | hook 150 f → nội dung scene 1 | mở video bằng một câu hỏi |
| `brand-title` | thẻ tiêu đề thương hiệu | mở đầu / tên video |
| `section-card` | thẻ chương số lớn | chuyển phần |
| `flow-compare` | hai luồng song song + so sánh A/B + enclosure + tiêu chí | đối chiếu hai cách vận hành |
| `glassbox-model` | glassbox + phân bố co giãn theo slider | giải thích bên trong một mô hình |
| `next-token` | token → mô hình → phân bố → token mới quay lại | vòng lặp, tự hồi quy |
| `pipeline-guard` | pipeline có hạt, pulse từng lớp, nhánh bị chặn | kiểm soát, phòng thủ, quy trình |
| `recap-rail` | 4 ý có số + câu chốt | tóm tắt cuối video |
| `check-question` | câu hỏi → 2 lựa chọn trung lập → dừng → đáp án | kiểm tra hiểu bài |
| `editorial-platform` | bản đồ hệ thống kiểu Day28 | kiến trúc, platform, luồng dữ liệu |

### Video mẫu hoàn chỉnh — `ui_kits/lesson-video/videos/`

| Thư mục | Nội dung |
|---|---|
| `n2-00-gioi-thieu-ngay-2/` | **N2-00 · Giới thiệu ngày 2** — 16 câu · 168 giây · 5 040 frame. Video tổng quan có một bản đồ ngày học xuyên suốt |

Cấu trúc một video, cũng là cách nên dựng video mới:

- `cues.js`: một cue cho mỗi câu lời đọc (khoá nguyên văn), gồm thời lượng, tiêu đề, tag và phần bản đồ.
  Hàm `spokenAt(n, cụm từ)` trả về frame cụm từ được đọc, dùng để khớp hình với lời.
- `shared.jsx`: eyebrow, dữ liệu bản đồ, phụ đề (`cueCaptions` → `sliceCaptions`) và khung scene chung.
- `sNN.jsx`: mỗi câu một scene; mọi mốc đặt trong object `T`.
- `video.jsx`: `Series` nối các scene; `markers` sinh menu nhảy câu trong player.
- `STORYBOARD.md`: bảng mốc, lời đọc, hình và component của từng câu.
- `player.html` và `card.html`: trình xem có menu câu, và card preview.

Quy trình dựng video trong Claude Design, prompt mẫu, xuất file và port ngược về Remotion:
[`guidelines/claude-design-workflow.md`](guidelines/claude-design-workflow.md).

---

## Do / Don't

**Do**
- Bắt đầu từ template gần nhất; đổi copy, toạ độ, mốc frame `T`.
- Khai báo hình chữ nhật cho mọi thẻ trước, rồi lấy điểm đầu/cuối connector từ `anchor()` của thẻ.
- Chừa làn riêng cho nhãn; connector không cắt qua chữ.
- Kiểm tra khung thưa nhất, khung giữa chuyển động, mỗi đoạn dừng và **khung dày nhất**.
- Gắn `MINH HỌA` cho mọi con số / log / model ví dụ.

**Don't**
- Thêm màu, gradient, font, emoji; dùng nền tối cho scene nội dung.
- Để flex/grid tự dàn sơ đồ có phần tử hiện lần lượt.
- Cho hạt bay tự do, lượn sóng, dịch chuyển tức thời hay đi xuyên mặt thẻ.
- Lộ đáp án trước frame reveal; để hai sơ đồ đầy đủ chồng lên nhau khi chuyển.
- Đặt chữ dưới y 960 hoặc che thanh phụ đề; viết phụ đề quá 78 ký tự.
- Dùng icon chung thay cho logo công nghệ có tên, hoặc dùng logo làm bằng chứng.

---

## File index

```
styles.css                      entry — chỉ @import (tokens + component CSS)
README.md · SKILL.md            tài liệu này · điểm vào dạng Agent Skill
tokens/colors_and_type.css      CSS variables, @font-face Montserrat, class vai trò chữ
tokens/tokens.json              token dạng W3C design tokens
fonts/                          Montserrat variable (OFL) + OFL.txt
assets/icons/*.svg              20 icon nét tay (currentColor)
lib/tokens.js                   C (9 màu), LAYOUT, SHADOW, alpha()
lib/motion.js                   interpolate, spring, Easing (tương thích Remotion) + appear/pulse/fadeWindow/smooth
lib/geometry.js                 polyline, pointAtDistance, anchor, bezier sampling, ước lượng bề rộng chữ
lib/player.jsx                  đồng hồ frame, useFrame, Player (markers → menu nhảy câu), mountScene / mountCard / mountFrame
lib/captions.js                 phân trang phụ đề ≤ 78 ký tự theo ranh giới cụm từ tiếng Việt, cueCaptions, sliceCaptions
lib/series.jsx                  Series: nối scene thành video; authoredDuration để co giãn theo bản thu
ui_kits/lesson-video/videos/    video mẫu hoàn chỉnh (N2-00): cues, scene, storyboard, player
components/**/Name.jsx          component React (+ Name.d.ts, Name.prompt.md, card.html mỗi nhóm)
components/vk.css               CSS cho chrome HTML, beats, player, kit
guidelines/*.md                 motion & connector · nội dung & copy · quy trình Claude Design
guidelines/*.html               card nền tảng: màu, chữ, bố cục, hình khối, chuyển động, thương hiệu
ui_kits/lesson-video/           index.html (trình duyệt scene), KitApp.jsx, scenes/*.jsx (10 template)
dist/vk.js                      bundle dựng sẵn (React + toàn bộ lib/components/scenes) cho card và kit
```

## Intentional additions

Những thứ design system thêm vào so với repo gốc (có chủ đích):

- **Bản React chạy trên trình duyệt** của các primitive Remotion (cùng hình học, cùng hằng số); frame
  đến từ `useFrame()` / props thay vì `useCurrentFrame()`.
- `lib/player.jsx` — đồng hồ frame + chế độ chụp `?frame=N` (tương đương Remotion Player/still).
- Tổng quát hoá thành component: `ProbabilityBars`, `Slider`, `Heatmap`, `VectorColumn`, `TokenChip`,
  `Enclosure`, `QuestionCard` (vốn là code riêng trong từng scene).
- `CornerTag` tự tính bề rộng (bản gốc cố định 184 px); `Recap` đặt lại dưới header căn giữa (bản gốc
  thuộc biến thể editorial Day28).
- `@font-face` khai báo Montserrat dải 500–700 để tái tạo việc renderer chỉ nạp 3 weight.
- Phân trang phụ đề hiểu ranh giới cụm từ tiếng Việt. Bản gốc chỉ cân độ dài và ưu tiên dấu câu, nên
  hay tách đôi từ ghép ("quan / sát"). Bản này ngắt sau dấu câu hoặc trước từ mở mệnh đề (và, hoặc, để,
  khi…), và không ngắt ngay sau từ cần từ tiếp theo (sẽ, một, cần…).
- `DayMap` và nhóm `figures` (port từ các video Day02 rebuild-v1) cho video tổng quan đầu ngày.
  `FormSheet` tự co cỡ chữ nhãn khi nhãn dài hơn cột.
- Template scene được co thời lượng (10–18 giây) cho dễ xem; scene thật dài theo lời đọc (300–1 650 f).
