# Poster Style — hướng dẫn riêng của dòng video "poster vector"

> Lõi 5 stage nằm ở `.claude/skills/make-video/SKILL.md`. File này chỉ ghi phần RIÊNG của style
> `poster`: quy trình, ngôn ngữ chuyển động và API của engine. Metadata (bảng màu, component showcase,
> luật rút gọn) ở `styles/poster.json`.
>
> Hai trục RIÊNG nhau: `motion` (`poster` | `slide`, do `createPosterStage` quyết định) × `theme`
> (`vinuni-light` NỀN TRẮNG — mặc định cho video mới · `night` — bảng màu của ba video đã render,
> không được đổi). Tra màu bằng `usePosterTheme()`, đừng hard-code token `POSTER`.
>
> Ảnh tư liệu KHÔNG thuộc engine này: dùng `tools/image-search|check|apply.mjs` → `images.js` →
> `<PhotoCard>`.


---

## 1 · Quy trình dòng poster

### Bản đồ pipeline — dòng poster, từ `new-video` tới bàn giao

File TRA. Không thuộc đường đọc bắt buộc của vai nào: owner mở nó để chia việc, một lane mở nó để
biết việc của mình đứng ở đâu và ai phải xong trước. Mọi lệnh ở đây đã chạy `--help` đối chiếu
ngày 21/09/2026 — **tool là nguồn sự thật**, dòng nào trong bảng lệch với `--help` thì tool đúng.

`<vdir>` = `vinuni-lesson-video-ds/ui_kits/lesson-video/videos/<id>/`

#### Bảng chính

| # | Stage | Vai | Lệnh CHÍNH XÁC | Gate chặn | Artefact ra | Tuỳ chọn? |
|---|---|---|---|---|---|---|
| 1 | khung | owner | `node tools/new-video.mjs <id> --style poster [--title <text>] [--day <NN>]` | từ chối ghi đè id đã có | `projects/<id>/` + `<vdir>` | bắt buộc |
| 2 | cues | script | `node tools/video-workflow.mjs run start --video <id> --stage cues --actor claude` | — | `RUN_ID` | bắt buộc |
| 3 | cues | script | sửa `<vdir>/cues.js` · `projects/<id>/storyboard.json` | — | `cues.js`, `storyboard.json` | bắt buộc |
| 4 | cues | script | `node tools/voice-timing.mjs --clear <vdir>` | — | `voice.js` rỗng | bắt buộc (lần đầu) |
| 5 | cues | script | `node tools/text-gate.mjs <vdir>/cues.js` | ✅ exit 1 | — | bắt buộc |
| 6 | cues | script | `node tools/text-gate.mjs --human <vdir>/cues.js` | cảnh báo | bảng 5 chỉ số | khuyến nghị |
| 7 | cues | script | `node tools/voice-pace.mjs --estimate <vdir>/cues.js` | — | ước thời lượng | khuyến nghị |
| 8 | cues | owner | **ĐỌC TO liền một mạch**, rồi `npm run script-lock -- --video <id> [--delta projects/<id>/loi-dan-lock.md]` | ✅ **TỪ CHỐI khoá nếu text-gate/voice-risk đỏ** | `projects/<id>/script.lock.json` | **bắt buộc** |
| 9 | cues | script | `node tools/video-workflow.mjs run finish --video <id> --run-id <ID> --status done --input-tokens N --output-tokens N --model <tên>` | — | ledger | bắt buộc |
| 10 | voice | voice | `node tools/voice-risk.mjs <vdir> --pronounce projects/<id>/pronounce.json` | cảnh báo | cue rủi ro | bắt buộc |
| 10b | voice | voice | `npm run script-lock -- --video <id> --check` | ✅ exit 1 nếu lời đã trôi khỏi bản khoá | — | bắt buộc |
| 11 | voice | voice | `node tools/voice-export.mjs <vdir> --out projects/<id>/voice-script --pronounce projects/<id>/pronounce.json --backend <spec> [--all]` | ✅ từ chối khi cues.js đổi | `voice-batch.jsonl`, `gen-manifest.json`, `cau/NN.txt` | bắt buộc |
| 12a | voice | voice | **ZeroTTS (CPU, MIT, không clone):** `npm run voice-zerotts -- --batch projects/<id>/voice-script/voice-batch.jsonl --out projects/<id>/zerotts-kernel --voice baotrang --pin <version>` | — | kernel | **một trong hai** |
| 12b | voice | voice | **OmniVoice (GPU T4, clone giọng):** `KAGGLE_USERNAME=<u> node tools/voice-kaggle.mjs --batch <f.jsonl> --ref-audio <ref.wav> --ref-text @<ref.txt> --out <k> --speed 1.0` | — | kernel | **một trong hai** |
| 13 | voice | voice | `node tools/run-logged.mjs voice --video <id> -- kaggle kernels push -p <kernel>` rồi `… kaggle kernels output <owner>/<slug> -p <kernel>/results` | — | `results/out/NN.wav` | bắt buộc |
| 14 | voice | voice | `node tools/voice-import.mjs --cues <vdir>/cues.js --from <thư mục wav> --backend <spec> [--gaps --gaps-report projects/<id>/gaps.md]` | ✅ clip lệch câu | `voice/out/<id>/voice.wav` · `voice.cues.json` · `align-report.json` | `--gaps` tuỳ chọn |
| 15 | voice | voice | `node tools/align-health.mjs --video <id>` | cảnh báo | bảng khớp | khuyến nghị |
| 16 | voice | voice | `node tools/audio-qa.mjs --video <id>` | ✅ exit 1 | clipping · LUFS · lặng · cắt cụt | bắt buộc |
| 17 | voice.bind | voice | `node tools/run-logged.mjs voice.bind --video <id> -- node tools/voice-timing.mjs voice/out/<id>/voice.cues.json <vdir> --write-cues` | — | `voice.js` · `timeline.js` có mốc từ | bắt buộc |
| 18 | scenes | scene | `node tools/video-workflow.mjs run start --video <id> --stage scenes --actor claude` | — | `RUN_ID` | bắt buộc |
| 19 | scenes | scene | viết `sNN.jsx` · `shared.jsx` · `video.jsx` (import `lib/poster`) | — | file cảnh | bắt buộc |
| 20 | scenes | scene | `npm run scene:gate -- --video <id>` (= build → verify → shoot) | ✅ exit ≠0 | `qa/*.png` | bắt buộc |
| 21 | scenes | scene | `npm run scene:pace -- --video <id> [--suggest]` | ✅ exit 1 | bảng authored vs giọng | bắt buộc (poster) |
| 22 | scenes | scene | `npm run gate:storyboard -- --video <id> [--scenes <glob>]` | ✅ exit 1 · G1–G6 | — | bắt buộc |
| 24 | ảnh | scene | `npm run illustration:plan -- --video <id>` → `--pick <mục>=<n>` → `--resolve` | ✅ G6 (license NC/ND = đỏ) | `illustration.json` · `<vdir>/illustration.js` | **chỉ khi `illustration.enabled`** |
| 25 | sfx | scene | `npm run sfx:mix -- --video <id> --dry` rồi `npm run stage:sfx -- --video <id>` | ✅ trần 4 accent · G4 | `projects/<id>/voice-sfx.wav` + cuesheet | tuỳ chọn |
| 25b | qa | scene | `npm run dead-frames -- --video <id>` — **TRƯỚC render** | cảnh báo (chặn ở quãng mở đầu) | bảng quãng đứng hình | bắt buộc |
| 26 | render | owner | `npm run stage:render -- --video <id>` | ✅ **exit 2 nếu `voice.wav` mới hơn `voice-sfx.wav`** | `projects/<id>/render/<id>.mp4` | bắt buộc |
| 28 | qa | QA | `npm run stage:qa -- --video <id>` (11 bước) | ✅ exit 1 | `projects/<id>/qa/REPORT.md` + ≤12 ảnh | bắt buộc |
| 29 | qa | QA | `npm run qa:layout -- --video <id> [--scenes <glob>]` | ✅ exit 1 · exit 2 = **chưa đo được** | bảng chữ đè / khung chết | opt-in (`qa-layout.json`) |
| 30 | transcript | owner | `npm run stage:transcript -- --video <id> --day <label>` | — | `transcripts/<Day>/<id>.txt` | bắt buộc |
| 31 | deliver | owner | `chapters/`, `PROMPTS.md`, gate cuối (`owner-checklist.md` §Cổng 4) | cổng người | bàn giao | bắt buộc |
| 32 | deliver | owner | `npm run trace-report -- --video <id>` | — | `projects/<id>/TRACE-REPORT.md` | bắt buộc |

`npm run stage:serve` (cổng 8765, root = thư mục DS, CÓ pidfile) phải đang chạy cho **20 · 23 · 24
· 26 · 27 · 28 · 29** — font chỉ nạp được qua HTTP, không qua `file://`. Hỏi
`npm run stage:serve -- --status` TRƯỚC khi mở cái thứ hai; tắt bằng `--stop`.

**Chờ lane khác = `npm run handoff -- wait --video <id> <khoá> [--equals <v>]`**, không chờ một mục
TRACE xuất hiện. Xong phần mình thì `handoff set` (vd `voice.state --value staged`).

#### Thứ tự phụ thuộc — chỗ đi sai là phải làm lại

```text
 1 ▸ 2…9  cues ──────── KHOÁ WORDING (8) ─────┐
                                              ├─► 10…17 voice ─┐
 (không được sinh giọng trước khi 8 xong)     │                │
                                              │                ▼
                                              └─► 19 scenes    17 voice.js có mốc từ
                                                     ║                │
                                                     ╚═ SONG SONG ════╝
                                                              │
                              ┌───────────────────────────────┤
                              ▼                               ▼
                       20 scene:gate                   (21 scene-pace CẦN voice.js)
                              │
                              ▼
                   22 storyboard-gate (G1–G6)
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
        24 ảnh           25 sfx:mix
             └────────────────┼────────────────┘
                              ▼
                      26 stage:render ──► 28 qa ──► 30 transcript ──► 31 deliver
```

Bốn ràng buộc phải thuộc, vì đi sai là render lại:

1. **`--gaps` đổi TIMING.** Nó viết lại `voice.cues.json`, nên mọi thứ đo theo giọng phải chạy SAU:
   `voice-timing --write-cues` (17) → `scene-pace` (21) → `sfx:mix` (25). Bật `--gaps` sau khi đã
   trộn SFX thì cuesheet lệch và mốc tiếng rơi sai chữ — trộn lại.
2. **Ảnh minh hoạ phải được chọn xong TRƯỚC render.** Thêm ảnh sau khi render = render lại từ đầu.
3. **`voice-sfx.wav` cũ hơn `voice.wav` ⇒ `stage:render` exit 2** (`stage.mjs:100`). Đây là tính
   năng, không phải lỗi: giọng đã đổi sau lần trộn SFX. Chạy lại `stage:sfx` rồi render.
4. **Song song được: voice (10…17) ‖ scenes (19).** Cảnh dựng được trên `voice.js` rỗng (bước 4) —
   scene chạy theo độ dài ước từ kịch bản. Nhưng `scene-pace` (21) và mọi `spokenAt()`/`beatT()`
   **chỉ có nghĩa sau bước 17**; chạy trước đó là đo vào số ước, không phải số thật.

#### Bốn nhánh tuỳ chọn — bật ở đâu, tắt ra sao

| Nhánh | Công tắc | Bật thì thêm gate | Tắt thì |
|---|---|---|---|
| Backend giọng | `REQUEST.md` dòng `voice:` (`zerotts:<giọng>` \| `omnivoice`) | — | mặc định `omnivoice` |
| `--gaps` | cờ lúc `voice-import` + `REQUEST.md` dòng `gaps: on\|off` | — | `pauseAfter` khai cứng, 10 video cũ không đổi một byte |
| Ảnh minh hoạ | `storyboard.json` → `illustration.enabled` | G6 | `IllustrationSlot` trả `null`, khai báo vẫn còn để giữ lý do |
| SFX phân lớp | `storyboard.json` → `sfx` / `ambience` mỗi cảnh | G4 | `sfx-mix --legacy` chạy luật cũ |

Tắt một nhánh = đổi `enabled: false`, **không xoá khai báo** — xoá thì mất luôn lý do đã chọn clip
đó và hồ sơ license đi kèm.

#### Ledger — mỗi stage đóng lại một lần

- Stage **tất định** (`build · verify · shoot · sfx · render · transcript · qa`): gọi bằng
  `npm run stage:<tên> -- --video <id>`, đã tự bọc `run-logged.mjs`. `--dry-run` in lệnh mà không chạy.
- Stage **tự viết** (`cues` · `scenes` · `deliver`): `run start` ở đầu, `run finish … --input-tokens
  N --output-tokens N --model <tên>` khi đóng. Không báo token thì không so được lần dựng nào rẻ hơn.
- Kết thúc việc: **`npm run trace-report -- --video <id> --stamp "<LANE-NN> · <stage> · <vai>"`**
  (máy đóng dấu giờ thật) rồi điền thân mục, có dòng `token:`. Owner chạy `trace-report` ở bước 32.


---

## 2 · Ngôn ngữ chuyển động

### `motion: poster` — NGÔN NGỮ CHUYỂN ĐỘNG của dòng poster

Luật riêng của dòng poster. Engine và primitive đã nằm sẵn ở `vinuni-lesson-video-ds/lib/poster/`
(con dấu, bia, pill, ✕, thẻ, linh vật, nét vẽ ra, băng chuyền, cầu nối) — **đừng port lại thứ đã
có**. `video-anatomy.md` lo phần chung của MỌI video. `styles/poster.md` giữ phần TRA (chữ ký từng
primitive · quy khung 1600×900 → 1920×1080 · bốn luật của thư viện), không đọc trước.

#### 0. THEME là trục RIÊNG — nền trắng là mặc định

Dòng poster là **cách vật thể diễn**: carrier đi xuyên phim, mốc nhấn neo vào từ được nói thật,
easing theo nghĩa, cầu nối giữa chương. Nó **KHÔNG** bao gồm màu và nền.

- **`theme: 'vinuni-light'` — NỀN TRẮNG + bảng màu VinUni — là MẶC ĐỊNH** của series và là nhận
  diện bất biến. `new-video --style poster` sinh ra nó.
- **`theme: 'night'` (nền đêm) là NGOẠI LỆ** — thiết kế riêng của `demo-ai-history-three-turns`.
  Chỉ dùng khi `REQUEST.md` ghi `theme: night` **và** owner xác nhận bằng chữ.
- Cảnh đọc màu qua **`usePosterTheme()`** (`lib/poster/theme.jsx`), KHÔNG import bảng `POSTER` và
  KHÔNG rải hex. Viết một màu cứng vào cảnh là khoá cảnh đó vào một theme.
- Ba khoá không chỉ là đổi màu: `halo` (nền trắng không có quầng sáng → bóng đổ + nét đậm hơn),
  `dimMin` (mờ 0,3 trên nền trắng thành XÁM BẨN → chặn dưới 0,55, ưu tiên đổi `inkMuted`),
  `largeOnly` (màu chỉ đủ tương phản cho chữ ≥24 px đậm).
- **PROBE phải chụp trên THEME SẼ GIAO**, đặt cạnh một frame của video chuẩn cùng series.

Hiểu "poster = nền đêm" ngày 22/09/2026 tốn **≈0,75M token và 1h50** để re-theme 36 cảnh đã xong.

#### 1. `Shot` phải UNMOUNT, không phải `visibility: hidden`

Bản gốc giữ con trong DOM và chỉ đổi `visibility`: nhìn giống hệt, nhưng mọi cảnh của một chương
cùng nằm trong chuỗi HTML mà `verify` đọc → FM-20 thấy một tập hình khối bất biến suốt cả chương và
**cảnh báo nhầm**. `lib/poster/engine.jsx` trả `null` khi tắt; cửa sổ `[from, to)` của bản gốc đã
chừa ~0,9s chồng lấn cho hai cảnh liền kề fade chéo nên không cảnh nào bị cắt sớm.

#### 2. Thời gian: `dur` authored co giãn theo giọng, mốc nội bộ KHÔNG dịch

`dur` trong `CHAPTERS` là nhịp AUTHORED của cảnh; `chapterTime()` co giãn nó theo giọng đo được
(tuyến tính tới ratio 1,35, vượt thì chạy đúng tốc độ gốc rồi GIỮ frame cuối). Mốc bên trong một
cảnh KHÔNG bị dịch theo. Công thức, bảng ratio và cách đọc `scene-pace --suggest`:
`styles/poster.md` §"Ánh xạ thời gian".


#### 3. Mốc nhấn neo vào TỪ ĐƯỢC NÓI, không vào giây

```js
const mew = beatT('KetQua', 'mèo');   // T lúc đọc tới chữ "mèo"
const res = M.pop(T, mew, 0.55);
```
`beatT` = `spokenAt()` (mốc word-level thật từ Whisper align) → frame toàn cục → `T`. Tra cue theo
**cụm từ trong chính cảnh đó**, KHÔNG theo số câu: ranh giới cue còn đổi nhiều lần trước khi khoá.

Khi giọng đọc nhanh hơn nhịp authored, hãy neo **NGƯỢC** từ mốc nhấn: `cx: [[mew-4.4, …], [mew-1.4, …]]`.
Neo xuôi thì vật thể còn đang bay khi đã nghe xong câu chốt.

##### Âm thanh là một phần của beat, không phải hậu kỳ

Beat đã neo vào cụm từ, nên tiếng khai ngay tại beat trong `storyboard.json`:
`"sfx": { "id": "stamp", "pan": -0.25 }` · bed của cảnh: `"ambience": { "id": "wind" }`.
Ba luật (căn ĐỈNH tiếng vào mốc hình · `foley` không tính vào trần 4 accent · beat không khai `sfx`
là quyết định LẶNG, ghi lý do vào `does`) + catalog + bảng "sự kiện hình → tiếng nào":
`visual-assets.md §5`.

#### 4. Easing theo NGHĨA, không theo thói quen

Một đường cong dùng cho mọi thứ thì mọi thứ chuyển động giống nhau và không thứ gì mang nghĩa (audit
F7: 53% chuyển động của video demo dùng đúng một curve). `M.enter` / `M.pop` / `draw` đều nhận
`ease` ở **tham số cuối** — đó là chỗ đặt:

Bảng "nghĩa → easing" (5 dòng) ở `styles/poster.md` §Easing theo nghĩa.

**Không có gate tự động** — nghiệm thu bằng mắt, trên video phát liên tục.

#### 5. Ba luật chuyển động của dòng poster

1. **Chuyển động phải CHẠM tới đích** — `posterFigures.reachFade(p, { enter, arrive, sink })`. Ca
   thật: thẻ dữ liệu tắt khi còn cách cỗ máy **135px**, ẩn dụ gãy mà frame tĩnh không lộ.
2. **Vòng lặp `sin` phải có chặn dưới** — `poster.breathe(T, { min, max, hz })`, đừng viết tay. Ca
   thật: `0.45 + 0.55*sin(T*3.4)` chạm **−0,10**, làm dấu `?` cuối phim TẮT HẲN đúng lúc đọc tới.
3. **Nhãn trong nhóm bị `scale` xuống phải fade ra TRƯỚC khi chữ rơi dưới ngưỡng đọc** — "còn trên
   màn hình" không có nghĩa là "còn đọc được" (FM-33).


#### 6. Cầu nối = carrier element, không fade-về-nền

Chuyển chương bằng một vật thể ĐI TIẾP, không bằng cắt cứng hay fade. Ba luật cứng: cầu nối bắt đầu
bằng **đúng frame cuối** của chương trước (toạ độ đọc từ source cảnh KẾ TIẾP, không suy — E8) ·
**bỏ lớp fade-về-nền** ở cuối chương (nó xoá chính frame cầu nối cần) · **không vẽ lại hình của
cảnh liền kề**, import chính hằng số nội dung của cảnh đó (chép lại là hai bản phân kỳ ngay ở lần
sửa đầu). Ví dụ đã dựng: `visual-assets.md` §6b.


#### 7. Chữ trên hình: rút gọn được, ĐỔI NGHĨA thì không — và phải là TIẾNG VIỆT

`storyboard-gate` G1 chặn chữ trên hình lặp lời đọc, và sức ép đó đẩy người sửa đi rút gọn. Rút gọn
là đúng — **đổi nghĩa là hỏng**, gate không thấy khác nhau ở chỗ đó (FM-32). Ca thật: `suy luận
logic tổng quát — không đủ` → `logic tổng quát ≠ thế giới thật`; dấu `≠` nói KHÁC, không nói KHÔNG
ĐỦ. **Mọi chuỗi bị gate đẩy đổi phải qua mắt owner.** Phần tử CỐ Ý lặp lời (bia khắc, end-card)
khai `kind: "plaque"|"endcard"`, đừng bẻ chữ.

**Ngôn ngữ: TIẾNG VIỆT.** Lời đọc tiếng Việt thì chữ người xem ĐỌC ĐỂ HIỂU cũng phải tiếng Việt và
khớp lời đọc. Lượt d05-v06 chép nhãn tiếng Anh từ slide → phải Việt hoá **39 chuỗi** ở lượt tích
hợp (F11), muộn nhất có thể.

- **Thuật ngữ tiếng Anh = CHÚ THÍCH PHỤ**, cỡ nhỏ hơn: `Độ tin cậy` lớn, `(confidence)` nhỏ. Không
  để thuật ngữ đứng MỘT MÌNH làm nhãn chính.
- **Tên app/sản phẩm trong mock giữ nguyên** (vật thể thật, không phải chữ để hiểu): `kind: "mock"`.
  Thuật ngữ đã thống nhất giữ tiếng Anh: `allowEnglish: [...]` cấp cảnh hoặc cấp file.
- Gate **G8** CẢNH BÁO chuỗi toàn ASCII >2 từ ngoài hai danh sách trên. Cảnh báo, không chặn.


#### 8. Không `transition` của `Series`

Cầu nối đã làm việc chuyển chương. Thêm slide/zoom lên trên sẽ cắt ngang chính thứ đang nối liền.

#### 11.#### 11. Trước khi báo xong

`npm run stage:qa -- --video <id>` → đọc `projects/<id>/qa/REPORT.md`, mở đúng các frame full-res
nó liệt kê → `stage:build` + `stage:verify`. Cách đọc kết quả: `role-qa.md`.


---

## 3 · API của engine poster

### API `lib/poster` — bảng tra, KHÔNG nằm trong đường đọc bắt buộc

Mở khi cần chữ ký một primitive. Luật dựng dòng poster ở §2 trên; mục này chỉ là
bảng tra. Chữ ký dưới đây đọc từ source `vinuni-lesson-video-ds/lib/poster/*.jsx` — source thắng
file này, nghi ngờ thì mở source.

#### Import

```js
import { poster, posterMarks, posterFigures, posterBridge, createPosterStage } from '…/lib/index.js';
const { M, draw, kf, breathe, frac, Easing, interpolate, clamp, animate, Shot, useComposition } = poster;
```
Export theo **namespace**, không `export *`: `engine.jsx` có `Easing`/`interpolate`/`clamp` trùng tên
với `lib/motion.js` của dòng slide. `createPosterStage` và `planScenes` đến từ `vinuni-lesson-video-ds/lib/poster/stage.jsx`.

#### `engine.jsx` — thời gian và nhịp

| Chữ ký | Trả về |
|---|---|
| `kf(T, pairs, ease)` | nội suy theo cặp `[[t, v], …]` |
| `M.enter(T, s, d, e)` | `{ opacity, transform }` — hiện + trượt lên 26px. `d` mặc định `0.7`, `e` mặc định `easeOutCubic` |
| `M.pop(T, s, d, e)` | `{ opacity, transform }` — bật ra + `scale`. `d` mặc định `0.5`, `e` mặc định `easeOutBack` |
| `draw(T, s, d, e)` | tiến độ `0→1` cho nét vẽ. `e` mặc định `easeInOutQuad` |
| `breathe(T, { min = 0.55, max = 1, hz = 0.5, phase = 0 })` | vòng `sin` **đã chặn dưới** — dùng thay cho `0.45 + 0.55*Math.sin(…)` |
| `frac(v)` | phần thập phân — tuyết rơi, băng chuyền, hạt chạy |
| `interpolate(input, output, ease)` · `clamp(v, min, max)` · `animate({ from, to, start, end, ease })` | tiện ích thuần |
| `Shot({ from, to, children })` | cửa sổ cảnh; trả `null` khi tắt (**unmount**, không `visibility:hidden`) |
| `useComposition()` / `CompositionContext` | lấy `T` hiện tại trong cây |

`M.enter` / `M.pop` / `draw` đều nhận **`ease` ở tham số cuối** — đó là chỗ áp quy ước easing theo
nghĩa (`styles/poster.md`). `Easing` có đủ bộ `easeIn/Out/InOut` × `Quad·Cubic·Quart·Expo·Sine`
+ `easeOutBack`, `linear`.

#### `marks.jsx` — con dấu, bia, nhãn, thẻ, linh vật

| Chữ ký |
|---|
| `Stamp({ text, color, size = 46, weight = 800, radius = 12, padding = '6px 20px', border = 6, style })` |
| `Plaque({ box, lines, sub, rule = 1, style })` — `lines = [first, second]`, mỗi `l` có `{ size, color, reveal? }`; `reveal` 0→1 mở chữ theo bề ngang |
| `Pill({ x, y, text, T, at, color })` — tự gọi `M.pop(T, at, 0.45)` |
| `XMark({ x, y, size, color, T, at, ease })` |
| `Card({ x, y, r, w, h, children, label, labelBg, style })` — `w` mặc định 110, `h` 88 |
| `Critter({ kind, size, ink })` — `kind`: chó · mèo · cá · chim |
| hằng: `CARD_RADIUS = 10` · `CARD_SHADOW` |

#### `figures.jsx` — nét vẽ ra và băng chuyền

| Chữ ký |
|---|
| `DrawPath({ d, stroke, width, cap = 'round', p, opacity })` — `pathLength=1` + `strokeDashoffset`; `p` lấy từ `draw()` |
| `DrawLine({ x1, y1, x2, y2, stroke, width, cap, p, opacity })` |
| `lane(since, { cycle, count, stagger, on })` — trả `[{ i, p }]` cho băng chuyền |
| `reachFade(p, { enter = 0, arrive, sink = 0.08 })` — độ hiện sao cho phần tử **tan BÊN TRONG hộp đích** |

#### `bridge.jsx` — cầu nối

`carry(T, { at, dur, from, to, ease = Easing.easeInOutCubic })` → `{ p, …khoá của from đã nội suy }`.
Một cửa sổ cho cả nhóm giá trị, thay vì bốn lời gọi `kf` rời — đó là cách duy nhất bảo đảm chúng
không lệch pha (lỗi đã cắn ở `bridge-2`: máy tan xong 1,1s mà nốt chưa kịp lớn → khung chết).

#### `illustration.jsx` — ảnh minh hoạ TĨNH vẽ trong cảnh

`IllustrationSlot({ T, id, src, x, y, w, h, at, dur, on, radius, focus, move, gain, lift, grain, credit, border, style })`
Kèm: `safetyScale(move)` · `CREDIT_FONT_SIZE = 19` (×1,2 = 22,8 px trên khung
render, trên ngưỡng 22 của `qa-layout`).

- `at`/`dur` tính bằng **`T` (giây authored)** — cảnh giải từ `beatT()`, không phải frame.
- **Ken Burns là hàm thuần của `T`** (không GSAP, không `@keyframes`, không RAF). `move.from/to`
  nhận `{ scale, x, y }`; `x`/`y` là tỉ lệ so với cạnh slot.
- `safetyScale()` phóng ảnh sẵn một biên để **không bao giờ lộ mép** trong suốt `move`.
- Duotone bằng SVG filter (`feColorMatrix` + `feComponentTransfer`), bảng chặng dùng CHUNG với
  bảng màu của ảnh ở cùng namespace — đừng chép số sang hai nơi.
- `on={false}` ⇒ trả `null`, không để lại khung rỗng (FM-38).
#### `mascot.jsx` — LEXCE trên nền đêm

| Chữ ký |
|---|
| `MascotLayer({ children, zIndex = 10, style })` — lớp SVG 1600×900 cho mascot + chữ SVG đi kèm |
| `PosterMascot({ x, y, size = 290, variant, pose, emotion, facing, frame, look, talking, opacity, ground })` |
| `LayerText({ x, y, size, weight, color, anchor, opacity, children })` |
| hằng: `W = 1600` · `H = 900` · `MASCOT_ASPECT = 1122/1402` · `MASCOT_VARIANTS` · `MASCOT_VARIANT_LABEL` |

- `variant`: `bare` · **`halo` (khuyến nghị)** · `plinth` · `cabin` · `badge`. `halo` là phương án
  DUY NHẤT vượt 4,5:1 ở đường bao (median 6,35 so với 1,50–1,74) — đo trên ảnh thật 1920×1080.
  `badge` khi LEXCE đứng cố định một góc cả chương. **Không `plinth`, không `cabin`.**
- `ground: 'cut'` (mặc định) che đĩa `revampGround` `#D8E8F8` — 10,2:1 với `night`, nó là một VỆT
  SÁNG ngang dưới chân chứ không phải bóng đổ.
- Mọi hình cắt/nền vẽ bằng `<path>`, **KHÔNG `<rect>`**: `verify` đếm mọi `<rect>` — kể cả rect
  trong `<clipPath>`, tức hình CẮT — là "hộp nằm dưới mascot" (`verify.mjs:364`).
- Gate "chữ dưới mascot" chỉ áp được khi chữ là `<text>` SVG trong CÙNG `MascotLayer`.
- **`emotion="thinking"` làm hai gate báo giả**: nó vẽ dấu `?` bằng `<text>` ngay trong nhóm
  `data-vk-occupies` của chính mascot (`MascotRevamp.jsx:191`) → mascot bị báo là che chữ của nó.
  Dùng `serious` / `curious`.
- Đổi TÊN pose không đổi DÁNG người: chỉ `leanFoot` và `hop` đổi dáng thật (`visual-assets.md` §9).

#### `phone.jsx` — khung điện thoại tông poster

| Chữ ký |
|---|
| `PosterPhone({ x, y, w = 280, h = 560, appName, time, tone, variant, opacity, children })` |
| `posterPhoneBox(box, pad = 20)` · `PhoneText` · `PhoneBubble` · `PhoneButton` |
| `shakeX(T, at, { amp, hz, dur })` — rung ngang tắt dần, hàm thuần của `T` |
| hằng: `PHONE_TONE = { neutral: ice, do: mint, dont: coral }` |

- **Không dùng `components/ui/PhoneFrame.jsx` cho dòng poster**: nó khoá cứng bảng màu dòng slide
  trong thân hàm (`PhoneFrame.jsx:196-213`, không một prop màu nào), nên trên `night` nó là một tấm
  bảng TRẮNG; chrome của nó 16,8 px → `qa-layout` đỏ. Và không được sửa nó: mọi video dòng slide đã
  render đang dùng.
- Thân `deep` — TỐI hơn nền, nên đọc ra là một VẬT chứ không phải một ô nội dung.
- `qa-layout` đo CẢ chrome khung máy → mọi chuỗi ≥ 19 (hệ 1600×900 = 22,8 px).

#### `vach.jsx` — carrier "cái vạch" (d05-v06), tham số hoá

| Chữ ký |
|---|
| `Vach({ T, y, x0, x1, p, shift, divide, band, zones, tilt, cracks, gapAt, branches, notches, labels, leftLabel, rightLabel, weight, glow, pulse, opacity, style })` |
| `VachLayer({ children, zIndex = 5, style })` · `VachText({ x, y, size, weight, color, anchor, opacity, letterSpacing, children })` |
| `LampRow({ x0, x1, y, items, lit, drop, size, T, opacity })` — bốn ngọn đèn câu hỏi treo TRÊN vạch |
| `RangeBar({ x, y, w, h, at, spread, label, pointLabel, tone, T, opacity })` — `spread` 0 là một ĐIỂM, 1 là một KHOẢNG |
| `CostAxis({ x, yTop, yBottom, load, label, T, p, opacity })` — trục "cái giá khi sai"; `load` **dương = quả cân ĐÈ XUỐNG** (sai thì đắt), âm = nhấc ra (sai thì rẻ). Bản đầu tính từ `yBottom` nên dương lại đẩy quả cân lên — sửa 22/09/2026, đừng tự "sửa lại" theo frame cũ |
| `boxPath(x, y, w, h, r)` · `vachX(u, { x0, x1 })` · `slide(T, at, to, dur)` |
| hằng: `VACH` (y 556 · x 150–1450 · `shiftMax` 118 · `labelY` 612 · hai nhãn + hai màu) · `W` · `H` |

Ý tưởng: MỘT đường sáng ngang chia "máy tự làm" (trái, `blue`) với "người quyết" (phải, `gold`),
và mỗi chương chỉ đổi THAM SỐ của chính nó — `p`/`shift` (vẽ ra, trượt) · `cracks` (tước sợi) ·
`tilt` (đòn bẩy) · `band` (điểm → khoảng) · `zones` (ba băng) · `gapAt`+`branches` (đứt → lối
thoát) · `notches` (khấc). Hai luật đã cắn khi dựng:

- **`p` là tiến độ của CẢ đường**, không phải của từng nửa: mỗi đoạn tự tính `prog` theo vị trí của
  nó trong `[x0, x1]`. Để mỗi nửa chạy 0→1 theo cùng `p` thì trái và phải mọc SONG SONG — nhìn ra
  hai cái vạch cùng vẽ, không phải một đường quét từ mép này sang mép kia.
- Hình khối (băng, vùng) vẽ bằng `boxPath` chứ không `<rect>` — cùng lý do với `mascot.jsx`.

#### `panels.jsx` — bốn panel dùng lặp của dòng "cái vạch"

| Chữ ký |
|---|
| `Paper({ x, y, w, h, title, lines, amount, tone, grow, tilt, sealed, sealText, opacity, style })` — séc · hoá đơn · hồ sơ · giấy hẹn |
| `StatePill({ x, y, w, h, text, state, T, at, filled, size, opacity, style })` — `state`: `do` · `dont` (kèm ✕) · `neutral` |
| `Stack({ x, y, w, h, count, pitch, active, reveal, lost, labels, tones, T, opacity, style })` — cột kịch bản · chồng hồ sơ · ngăn xếp phiên bản |
| `PhoneRow({ x, y, items, w, h, gap, link, enter, T, opacity, style })` — 2–3 `PosterPhone` + ĐƯỜNG NỐI |
| hằng: `TONE_INK` · `MIN_TEXT = 19` |

- `PhoneRow` trả `<g>`: phải nằm trong một lớp SVG 1600×900 (`VachLayer`/`MascotLayer`), như
  `PosterPhone` mà nó bọc. **Đường nối là thứ nói "cùng một mô hình, chỉ khác cách thiết kế"** —
  bỏ nó đi thì hai khung máy đọc ra là hai card so sánh, đúng lỗi mà PROBE §B chỉ ra.
- `Paper` dùng thân `cream` nên nó đọc ra là GIẤY, không phải card giao diện; `grow` phóng quanh
  tâm để cho thấy tờ giấy VƯỢT khỏi hộp năng lực mà không phải vẽ hai tờ khác nhau.

#### `stage.jsx` — sân khấu và kế hoạch thời gian

`createPosterStage({ CHAPTERS, TIMELINE, spokenAt, theme, eyebrow, fitOf })` ·
`planScenes({ chapters, timeline, fps, stretchCap })` (hàm thuần, không React —
`tools/scene-pace.mjs` dùng chính nó). Hằng: `W = 1600` · `H = 900` ·
`SCALE = 1920/1600 = 1.2` · `FPS = 30` · `STRETCH_CAP = 1.35`.

##### `theme` — màu tách khỏi ngôn ngữ chuyển động (22/09/2026)

`lib/poster/theme.jsx`: `night` (bảng đang chạy, chép nguyên giá trị) và `vinuni-light` (nền trắng
+ bảng màu VinUni, **mặc định cho video mới**). Primitive đọc qua `usePosterTheme()`, KHÔNG đọc
thẳng token `POSTER`. Ba khoá không phải màu: `halo` (`glow` ↔ `shadow` — nền trắng không có quầng
sáng), `dimMin` (0,30 trên nền đêm ↔ 0,55 trên nền trắng; navy alpha 0,30 trên trắng chỉ 1,86:1),
`largeOnly` (màu chỉ đủ 3:1 — chỉ cho nét và chữ ≥24 px đậm). Đổi theme KHÔNG được đổi một pixel
của video cũ: chứng minh bằng sha256 SSR markup ≥40 frame trước/sau.

##### `fitOf` — lưới dọc riêng của từng cảnh

Chrome của mỗi series chiếm phần trên khung một mức khác nhau. `fitOf(sceneId)` trả một chuỗi
`transform` SVG mà `VachLayer` và `MascotLayer` cùng áp qua `SceneFitContext`. **Đừng bơm chrome
vào `GRID` của video**: cảnh đặt tiêu đề theo `content.top` còn panel theo y cứng, nên đẩy
`content.top` xuống là tiêu đề tụt xuống DƯỚI panel và đè lên chính nội dung nó giới thiệu (ca
thật `d05-v06`, 6 cảnh). Bảng `dy`/`s` phải ĐO bằng hộp bao thật của lớp nội dung (bỏ lớp mascot),
và `s` không được xuống dưới ~0,97 vì chữ nhỏ nhất sẽ rơi dưới sàn 22 px của `qa-layout`.

#### Bốn luật của thư viện

1. **Nhận `T` và `at`, không nhận `frame`.** `T` là thời gian trong cảnh; đổi `dur` của cảnh không
   được dịch một mốc `at` nào.
2. **Không `Math.random`, không `Date`, không `window`/`document`.** Smoke render của `verify` chạy
   `renderToStaticMarkup` **trên Node** và quét cả comment.
3. **`style` của người gọi trải ra TRƯỚC khoá riêng của primitive** (`{ ...style, border: … }`). Giữ
   đúng thứ tự khoá inline-style là điều kiện để sha256 của SSR markup không đổi khi refactor — đó
   là phép nghiệm thu "chỉ dời chỗ".
4. **Primitive chỉ có MỘT chỗ dùng thì để nguyên trong thư mục video**, đừng đẩy lên `lib/`. Thư
   viện là nơi cho thứ đã lặp lại thật.

---

#### Port một export Claude Design — giữ gì, bỏ gì

| File | Dùng | Bỏ |
|---|---|---|
| `animations-v3.jsx` | `Easing` · `clamp` · `interpolate` · `animate` · `CompositionContext`/`useComposition` · `Shot` | `Stage` · `CompositionStage` · `PlaybackBar` · `WatercolorReveal` |
| `tweaks-panel.jsx` | — | toàn bộ (`useTweaks`, `TweaksPanel`…) |
| `<tên>-scene.jsx` | các hàm vẽ `S1_…`, primitive (`Piece`, `Card`, `XMark`, `Critter`, `Network`…) | `*App`, `<Captions>` |
| `Animation Demo*.dc.html` | `window.OM_SCENES` = **tên cảnh + `dur` authored** | `<link>` font Google, `TWEAK_DEFAULTS` |

**Vì sao bỏ `Stage`:** `verify` smoke-render mỗi frame bằng `renderToStaticMarkup` **trên Node**.
`Stage` đụng `localStorage`, `ResizeObserver`, `window.addEventListener`, và chạy một vòng
`requestAnimationFrame` — vừa throw trên Node, vừa là nguồn non-determinism mà `lib/motion.js` cấm.
Phần thuần thì giữ nguyên: chúng chỉ đọc `T`/`C` qua props.

`lib/poster/engine.jsx` đã chép sẵn các hàm thuần đó. Đừng chép lại lần nữa.

#### Màu và tương phản trên nền đêm

`off-palette` quét **mọi** `.js`/`.jsx` trong cây design system, **kể cả trong comment**. Ba file
scene của một export thường có ~50 hex. Cách đúng: gom hết về **một nhóm token** khai trong
`lib/tokens.js` (verify tự cộng vào PALETTE) — `POSTER` là nhóm đã có, 17 token.

**Luật tương phản trên nền đêm** (`night` `#243155`), đo bằng tỉ số tương phản WCAG:
- `steel` `#5d6c96` = **2,6:1** → **chỉ dùng cho NÉT VẼ / VIỀN / ĐƯỜNG KẺ**, không bao giờ cho chữ.
- `ice` `#9fb6d8` = **6,7:1** → đây là màu chữ phụ.
- Thanh phụ đề: `cream` trên `deep` = **13,5:1**.
- Chữ mang nghĩa: **≥ 22px** trên khung 1920×1080 (tức ≥ 18px trong hệ 1600×900 đã scale 1.2).

#### Khung 1600×900 → 1920×1080

`scale(1.2)` với `transformOrigin: 'top left'`. 1920/1600 = 1.2 = 1080/900 nên khớp tuyệt đối. Header
chương và thanh phụ đề vẽ ở hệ toạ độ **NGOÀI** (1920×1080) để đặt đúng `LAYOUT.captionTop` = 984.

Hệ quả hay quên: header nằm ở lớp ngoài, y 50–104. Quy về hệ 1600 là **y 42–87**. Chữ của cảnh đặt ở
`top: 90` sẽ CHẠM gạch chân header.

#### Easing theo nghĩa (chuyển từ `styles/poster.md` §4, 21/09/2026)

| Nghĩa của chuyển động | Easing |
|---|---|
| đóng dấu, vật rơi xuống, đặt mạnh | `easeOutBack` |
| bật ra vì bất ngờ (flash, `MÈO ✓`) | `easeOutExpo` |
| mọc lên, vẽ ra, lan dần | `easeInOutQuad` |
| lụi đi, chìm xuống, tắt dần | `easeInQuad` |
| hiện một dòng chữ bình thường | `easeOutCubic` |

#### Ánh xạ thời gian — công thức đầy đủ (chuyển từ `styles/poster.md` §2, 22/09/2026)

```
ratio = giâyGiọngĐoĐược / giâyAuthored
ratio ≤ 1.35 → T = authStart + (frameLocal / framesCảnh) × authDur      (kéo giãn tuyến tính)
ratio > 1.35 → chạy đúng tốc độ gốc rồi GIỮ frame cuối
```

`dur` trong `OM_SCENES` là nhịp của **bản demo gốc**; bản gộp phân bổ lời khác hẳn nên phải chỉnh
từng cảnh cho khớp giọng đo được — nhắm tỉ lệ **0,85–1,15**, và **KHÔNG dịch một mốc `A + x` nào**
bên trong cảnh; chỉ cửa sổ tổng đổi.

Đừng ước nhịp bằng "từ/phút" của nguồn ngoài — lần trước sai 1,5 lần (retro E1). Đo bằng
`voice-pace --estimate`, và sau khi có giọng thì **đừng chỉnh `dur` bằng tay**: `scene-pace
--suggest` in bộ `dur` đề xuất. Cờ đầy đủ: `role-qa.md`. Chỉnh `dur` **không dịch một mốc `at`
nào** bên trong cảnh.

⚠️ `authoredDuration` của `lib/series.jsx` rescale theo biên **CUE**; một cảnh poster trải qua NHIỀU
cue nên phải rescale trên biên **CẢNH** — `lib/poster/stage.jsx` làm việc đó, và `video.jsx` của
video poster **không** khai `authoredDuration`.
