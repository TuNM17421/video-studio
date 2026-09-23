# Giải phẫu một video trong harness

Kiến thức TĨNH: file nào phải tạo, schema tối thiểu, chuỗi lệnh, gate nào của `verify` sẽ áp. Đọc
file này thay cho mở một lane khảo sát — lần trước việc đó tốn **187k token** cho đúng những điều
dưới đây. Mọi dòng đã đối chiếu với source; chỗ nào chưa kiểm thì không có ở đây.

`<vdir>` = `vinuni-lesson-video-ds/ui_kits/lesson-video/videos/<id>/`

## 1. File phải có

| File | Vai trò | Bắt buộc |
|---|---|---|
| `cues.js` | `RAW` mỗi câu đọc; export `SECTIONS`, `CUES`, `DURATION`, `spokenAt`/`speechEnd` | ✅ verify |
| `video.jsx` | dựng `SEQUENCES` từ `TIMELINE`, export `meta` + component `Series` | ✅ verify |
| `card.html` · `player.html` · `STORYBOARD.md` | preview (`card.html` phải có `@dsCard` ở **dòng 1**) | ✅ verify |
| `voice.js` · `timeline.js` | mốc từng từ (`voice-timing.mjs --clear` tạo bản rỗng); ghép → `TIMELINE`/`PLAY_DURATION`/`VOICED` | thực tế cần |
| `shared.jsx` (· `sNN.jsx`) | **`SEQUENCES` dựng THẲNG từ `TIMELINE`**; `Cue` tra `TIMELINE[n-1]`. `sNN.jsx` chỉ cần khi MỘT cue có code riêng — KHÔNG phải một file mỗi cue | `shared.jsx` |
| `qa-layout.json` | `{ "enabled": true, … }` — bật `qa-layout.mjs` cho video này | khuyến nghị |
| `projects/<id>/storyboard.json` | cảnh · ẩn dụ · mốc nhấn · chữ trên hình; script lane nộp ở Stage 1 | gate khi có |

Ngoài `<vdir>`: `projects/<id>/{REQUEST.md, kich-ban-goc.md, pronounce.json, PROMPTS.md, TRACE.md,
qa/, render/<id>.mp4}`; `transcripts/<Day>/<id>.txt`; `chapters/<Day>/<id>-chương.txt`.

## 2. Schema tối thiểu

```js
// cues.js
const RAW = [{ n, seconds, section, scene?, title?, tag?, text, visual,
               pauseAfter?, silent?, quiz?, sfx? }];
export const SECTIONS = [{ n, title }];
export const CUES = RAW.map(…);          // phải có start/end cộng dồn theo frame
export const DURATION = <frame>;
export const { spokenAt, speechEnd } = createSpeech(RAW, VOICE);
```
- `text` = lời đọc **nguyên văn** bản đã khoá · `pauseAfter` (giây) = nghỉ ở **CUỐI** cue · `quiz`
  chỉ ở cue LẶNG (`owner-checklist.md` §quiz) · `sfx: { id, word }` neo tiếng vào lúc đọc tới chữ.

Schema `storyboard.json` KHÔNG chép ở đây — bản chép trước đã lệch khỏi file thật. Nguồn:
`node tools/storyboard-gate.mjs --help` (G1–G8) · `visual-assets.md` (ảnh tư liệu, tiếng động).

```js
// video.jsx
export const meta = { id, title, pattern, duration: PLAY_DURATION, markers };
export default () => <Series sequences={SEQUENCES} frame={useFrame()} />;
```
`meta.duration` **phải** bằng `end` của cue cuối. `SEQUENCES[i] = { component, duration,
authoredDuration?, name?, transition? }` (frame); dòng poster KHÔNG khai `authoredDuration`.

## 2b. Khái niệm dòng poster — bốn thứ 4 lane phải đọc SOURCE mới biết

Bốn dòng dưới đây là toàn bộ chỗ lượt dựng 21–22/09/2026 phải mở source để đoán (retro F8):

- **`SEQUENCES` dựng từ `TIMELINE`, một sequence mỗi cue, TỰ ĐỘNG.** KHÔNG phải một `sNN.jsx` cho
  mỗi cue — `sNN.jsx` chỉ cần khi một cue có code riêng. Thêm cue = sửa `cues.js`, không sửa
  `video.jsx`.
- **`frames`/`speech` tạm phải ≥ `speechEnd` của cue đó.** Trước khi có giọng thật, đặt tạm bằng
  `số âm tiết ÷ 5,12 × 30` rồi làm tròn LÊN. Đặt thiếu thì `spokenAt()` trả mốc vượt quá cue và
  mọi `beatT` của cảnh đó rơi sai chỗ — im lặng, không gate nào bắt.
- **Beat nào ĐƯỢC DÙNG trong code phải khai `inCode: true`** trong `storyboard.json`; G3 đối chiếu
  hai chiều. Khai thiếu → G3 đỏ; khai thừa `inCode` mà code không gọi → cũng đỏ.
- **Các trường danh sách cấp CẢNH là MẢNG**, kể cả khi chỉ có một mục. Khai thành object thì
  `storyboard-gate` dừng với thông báo schema (không còn stack trace).

Tham chiếu cue: khai bằng **anchor (cụm từ)**, không bằng số — cue bị tách/gộp thì số lệch, cụm từ
thì không (`storyboard-gate --cues` in bảng cảnh → số cue nó giải ra, dùng để chứng minh "chỉ đổi
cách tham chiếu, không đổi phim").

## 3. Chuỗi lệnh → `styles/poster.md`

Bảng đầy đủ **32 bước** (`# · stage · vai · lệnh chính xác · gate chặn · artefact ra · tuỳ chọn?`)
từ `new-video` tới bàn giao, kèm sơ đồ phụ thuộc, bốn nhánh tuỳ chọn (ZeroTTS ‖ OmniVoice · `--gaps`
· SFX phân lớp · ảnh minh hoạ) và chỗ chạy SONG SONG được, đã chuyển sang
**`styles/poster.md`** ngày 21/09/2026 — nó là bảng TRA của owner khi chia việc, không phải thứ
vai scene phải nạp trước khi viết cảnh đầu tiên.

Bốn điều vai nào cũng phải thuộc, không cần mở file đó:

- **Lệnh tất định dùng `npm run stage:*`** (`build · verify · shoot · sfx · render ·
  transcript · qa`) — tự bọc `run-logged.mjs`; `--dry-run` in lệnh mà không chạy. Stage TỰ VIẾT
  (`cues`/`scenes`/`deliver`) không có wrapper — `run start/finish` trực tiếp.
- **`npm run serve`** (cổng 8765, root = thư mục DS) phải đang chạy cho `shoot` · `qa-layout` ·
  `render` · `illustration` — font chỉ nạp được qua HTTP, không qua `file://`.
- **`voice-import --gaps` đổi timing** ⇒ chạy trước `voice-timing --write-cues`, `scene-pace` và
  `sfx:mix`. Luật viết lời đi kèm: `script-craft.md` §3f (E22).
- **`voice-sfx.wav` cũ hơn `voice.wav` ⇒ `stage:render` exit 2** — trộn lại SFX rồi render.

Cách `stage:render` chọn audio và cách `--video` thu hẹp `verify`:
`role-qa.md` §"Bảng gate của `verify`" + đầu `tools/stage.mjs`.

## 4. Gate của `npm run verify` — bảng đầy đủ ở `role-qa.md`

Bảng 16 dòng (phạm vi từng gate, chỗ chặn vs cảnh báo, mức áp cho video cũ) đã chuyển sang
`role-qa.md` §"Bảng gate của `verify`" — nó là bảng TRA, không phải thứ đọc trước khi viết cảnh đầu
tiên. Ba ràng buộc dưới đây thì phải thuộc, vì chúng đổi cách VIẾT code cảnh:

- **Smoke render chạy trên Node** (`renderToStaticMarkup`, mỗi frame thứ 3 + đầu/cuối mỗi cue):
  không `window`, `document`, `localStorage`, `ResizeObserver`, RAF ở top-level hay trong first
  render — throw ngay. Không được ghi `NaN`/`undefined` vào attribute.
- **`off-palette` quét cả `.js` lẫn `.jsx`, kể cả COMMENT.** PALETTE = 9 màu gốc + mọi hex khai
  trong `lib/tokens.js`. Thêm màu = khai vào `tokens.js`, đừng rải hex.
- **`verify` đọc `<text>` SVG, KHÔNG thấy bố cục `<div>` HTML** — chữ đè nhau trong HTML là việc của
  `qa-layout.mjs` (FM-30/FM-37).
- Đường dẫn font phải TUYỆT ĐỐI từ gốc server (`/fonts/…`): `index.html`, `card.html`,
  `player.html` nằm ở ba độ sâu thư mục khác nhau.

## 6. Luật dựng cảnh (chuyển từ `SKILL.md` stage 3, 21/09/2026)

- **Thời gian là chốt**: mỗi scene dài đúng `frames` của cue nó. Mốc nhấn đặt bằng
  `spokenAt(n, 'cụm từ')` sớm vài frame; giữ trạng thái ổn định qua `speechEnd(n)`.
- **`motion: slide`**: luật đầy đủ ở DS `README.md` §"Mười hai luật cốt lõi".
- **`motion: poster`**: `styles/poster.md` (luật) + `styles/poster.md` (chữ ký). Engine dùng lại ở
  `lib/poster/`, không port lại. Luật §5/§6/§7 + Do/Don't của DS README không áp. MÀU là trục
  riêng: `usePosterTheme()`, mặc định `vinuni-light` (NỀN TRẮNG).
- **Không hình nào giữ nguyên màn hình quá ~6 cue / ~25 giây đo được** mà không có một minh hoạ mới
  gắn với nội dung trong khoảng đó (`visual-assets.md` §1–2) — FM-20.
- **Chuyển cảnh** `transition:` opt-in theo sequence, chỉ ở ranh giới section (`visual-assets.md`
  §7). `motion: poster` **không** dùng `transition` — cầu nối đã làm việc đó.
- **Tiếng động** (`stage:sfx`, trần 4 accent/video, §5) là bước riêng, không phải prop trong scene.
- `verify` bắt ba lỗi bố cục người-mới-thấy: chữ/hộp dưới mascot, tiêu đề cue chép vào slide, `NaN`
  trong attribute. **Sửa bố cục, đừng sửa check.** QA của stage này: `role-qa.md`.

## 7. Stage 5 · deliver → `owner-checklist.md` §Cổng 4.
