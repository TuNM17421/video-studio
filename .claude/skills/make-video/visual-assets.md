# Visual assets — sticker, element, và ảnh chụp nguồn thật

Ba loại hình trong một video bài giảng, ba luật khác nhau:

| Loại | Dùng để | Luật |
|---|---|---|
| **Component design system** | Vẽ cấu trúc, quan hệ, số liệu | Mặc định. Luôn ưu tiên cái này trước |
| **Sticker / element** | Nhấn cảm xúc, chỉ hướng, tạo nhịp | Thư viện có license rõ, xem §1 |
| **Evidence** (ảnh chụp nguồn) | Chứng minh một điều có thật | **Chỉ nguồn thật**, xem §2 |

Đừng dùng sticker để thay việc vẽ cấu trúc, và đừng dùng Evidence cho thứ do mình dựng ra.

## Chỉ mục — file này KHÔNG nằm trong đường đọc bắt buộc, tra đúng mục

| Mục | Mở khi |
|---|---|
| Mock giao diện | cần cửa sổ web / điện thoại giả lập, hoặc phân vân giữa mock và ảnh thật |
| §1 Sticker và element | chọn sticker/illustration, hoặc giao việc chọn cho một lane |
| §2 Evidence | cần chứng minh một điều có thật bằng ảnh chụp nguồn (FM-22) |
| §3 B-roll | kịch bản gọi clip nền (hậu kỳ, sau render — FM-24) |
| §3b Ảnh tư liệu | cảnh cần một hiện vật/ảnh thật — đường `image-suggest` → `images.js` + `PhotoCard` |
| §4 Remotion | phân vân dùng phần nào của Remotion |
| §5 SFX | thêm tiếng động (trần 4 accent/video) |
| §6 Bố cục | `verify` báo "runs under the mascot", chữ tràn hộp, `NaN` |
| §7 Chuyển cảnh | đặt `transition` ở ranh giới section (hai bẫy im lặng) |
| §8 Cảnh báo bố cục lệch | `verify` kêu nửa khung bỏ trống |
| **§9 Mascot** | chọn `pose` / `emotion` / `spot` cho từng cue |
| **§10 Ví dụ code minh hoạ** | lời đọc nhắc tới prompt / code / payload API / log |

---

## Mock giao diện: BrowserFrame vs PhoneFrame vs Evidence

Ba thứ trông giống nhau (một khung chữ nhật + nội dung bên trong) nhưng khác hẳn về ý nghĩa — đây là
chỗ dễ nhầm nhất trong bảng ở trên.

| Component | Mô phỏng cái gì | Khi nào dùng | Luật |
|---|---|---|---|
| `BrowserFrame` | Web/app desktop (trang LMS, dashboard, cửa sổ trình duyệt) | Kịch bản tả "màn hình trình duyệt", "trang LMS", "cửa sổ ứng dụng" trên máy tính | Luôn `illustrative` (mặc định `true`), URL giả định (`*.truong.edu.vn`), không logo/thương hiệu thật |
| `PhoneFrame` | App điện thoại (chat app, camera, tiện ích) | Kịch bản tả "màn hình điện thoại", "app trên di động", so sánh Do/Don't kiểu app | Luôn `illustrative` (mặc định `true`), `appName` giả định (không trùng app thật), status bar (giờ/sóng/wifi/pin) tự vẽ tay — không icon OS hay logo thật |
| `Evidence` | Ảnh chụp một nguồn **CÓ THẬT** (trang web, văn bản, biểu đồ trong paper) | Câu đọc viện dẫn một nguồn cụ thể mà người xem tra lại được | **Chỉ nguồn thật** — không bao giờ dùng cho nội dung dựng/mock, xem §2 |

Quy tắc một câu: **BrowserFrame/PhoneFrame dựng ra một khung để MINH HỌA ý tưởng** — không có màn
hình thật nào đứng sau nó, dù không có ảnh chụp thật để dán vào cũng vẽ được; **Evidence dán một ảnh
chụp CÓ THẬT lên khung** — không có ảnh thật thì không dùng Evidence, kể cả khi rất muốn có "bằng
chứng" cho một ý. Đừng dùng BrowserFrame/PhoneFrame rồi chú thích như thể đó là ảnh chụp thật, và
đừng dùng Evidence cho một giao diện tự dựng.

Component: `vinuni-lesson-video-ds/components/ui/BrowserFrame.jsx` (đọc `.prompt.md`) và
`vinuni-lesson-video-ds/components/ui/PhoneFrame.jsx` (đọc `.prompt.md` — có sẵn ví dụ bố cục
Do/Don't hai khung điện thoại cạnh nhau + thẻ chú thích, copy dùng luôn).

### Slide đã có sẵn hình — crop, đừng dựng lại

**Nếu slide PDF gốc đã vẽ sẵn đúng mock cần dùng** (ví dụ slide có sẵn ảnh điện thoại Flora/ChefAI
với chat bubble, Do/Don't) thì **crop thẳng từ file PDF**, đừng tốn công dựng lại bằng
`PhoneFrame`/`BrowserFrame` — dựng lại tốn token hơn nhiều so với crop, và crop cho kết quả đúng
100% pixel với ý giảng viên vẽ, không có rủi ro tái tạo sai chi tiết.

```bash
# Bước 0 (tùy chọn) — gợi ý toạ độ bằng tìm chữ (đỡ phải đoán từ ảnh)
python3 tools/pdf-text-locate.py "<đường dẫn PDF>" <số trang> "<cụm từ trong vùng cần cắt>"
# Xuất ra toạ độ tỉ lệ 0–1 sử dụng cho --box ở bước 2. Đây là GỢI Ý, vẫn phải xác nhận ở bước 1.

# Bước 1 — render cả trang để xem, chọn vùng cần cắt (toạ độ tỉ lệ 0–1, gốc trên-trái)
node tools/slide-crop.mjs "<đường dẫn PDF>" <số trang> --out /tmp/preview.png --dpi 200

# Bước 2 — crop đúng vùng, lưu vào media/files/evidence/
node tools/slide-crop.mjs "<đường dẫn PDF>" <số trang> --box 0.078,0.24,0.23,0.62 \
  --out media/files/evidence/<tên-nói-rõ-nguồn>.png --dpi 200
```

**Dùng `pdf-text-locate.py` để tìm toạ độ tự động:**
Tool này dùng PyMuPDF để tìm toạ độ CHÍNH XÁC của cụm từ trong PDF, không cần đoán bằng mắt:
```bash
python3 tools/pdf-text-locate.py slides.pdf 37 "Trust calibration"
# ✓ Found exact phrase "Trust calibration" — 1 location(s) on page 37:
#   [1] --box 0.047,0.067,0.239,0.120   (size 184pt × 29pt)
```
Nếu cụm từ bị ngắt dòng trong PDF, tool sẽ gộp từng từ riêng lẻ và cảnh báo — vẫn PHẢI mở ảnh
preview (bước 1) để xác nhận kỹ rồi mới dùng.

Đây thuộc nhóm **Evidence** (không phải mock tự dựng) — vì nội dung là nguyên văn tài liệu giảng
viên, không phải Claude tưởng tượng ra. Áp đúng luật §2: ghi **file PDF + số trang** vào
`projects/<id>/PROMPTS.md` thay cho URL, không cần khoanh đỏ nếu crop đã đúng khít vùng cần chỉ.
Đẩy lên R2 bằng `tools/media-push.mjs` như mọi Evidence khác.

**Khi nào vẫn dùng `PhoneFrame`/`BrowserFrame` thay vì crop:** slide KHÔNG có sẵn hình cho ý đang
nói (ý trừu tượng, hoặc ví dụ Claude tự nghĩ thêm để minh hoạ một khái niệm không có trong slide) —
lúc đó không có gì để crop, phải dựng. Nếu slide đã có sẵn ảnh gần đúng ý nhưng khác chi tiết nhỏ
(ví dụ tên app khác), vẫn ưu tiên crop rồi chú thích lại bằng text/Card riêng bên cạnh, đừng dựng lại
toàn bộ chỉ vì lệch một chi tiết nhỏ.

---

## 1. Sticker và element

### Thư viện đã soát license (14/09/2026)

| Thư viện | License | Dùng thương mại | Ghi chú |
|---|---|---|---|
| [unDraw](https://undraw.co/) | Riêng, rất thoáng | Được, **không cần ghi công** | Minh hoạ người/cảnh, đổi được màu chủ đạo. Hợp nhất với video bài giảng |
| [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (Microsoft) | MIT | Được, **kèm bản quyền MIT** | 3 biến thể: màu, phẳng, tương phản cao. Bản phẳng hợp style repo nhất |
| [Iconoir](https://iconoir.com/) | MIT | Được | 900+ icon nét, sạch |
| [Tabler Icons](https://tabler.io/icons) | MIT | Được | Bộ icon nét lớn, đồng đều |
| [OpenMoji](https://openmoji.org/) | CC-BY-SA 4.0 | Được **nhưng lây license** | ShareAlike: bản sửa đổi phải phát hành cùng license. **Cân nhắc kỹ trước khi dùng trong repo này** |

**Chốt mặc định cho repo:** ưu tiên **unDraw** (minh hoạ) + **Fluent Emoji phẳng** (sticker cảm xúc)
+ **Tabler/Iconoir** (icon nét). Tránh OpenMoji trừ khi chấp nhận ràng buộc ShareAlike.

### Luật dùng

1. **Tải về `media/files/stickers/`, đừng hotlink.** `media/files/*` đã nằm trong `.gitignore`;
   đẩy lên R2 bằng `tools/media-push.mjs` như mọi media nặng khác.
2. **Tối đa một sticker cho mỗi cue.** Nhiều hơn là rối, và kéo mắt khỏi nội dung.
3. **Không đặt sticker chồng vùng nội dung hay vùng mascot** (góc phải dưới).
4. **Màu phải hoà với palette.** unDraw cho đổi màu chủ đạo — đặt đúng màu accent của repo.
5. Ghi nguồn + license của mọi sticker đã dùng vào `projects/<id>/PROMPTS.md`.

### Quy trình tải — unDraw (đã thử thật 17/09/2026, sửa lại đúng giao diện hiện tại)

**Trang chủ `undraw.co` KHÔNG còn ô search + color picker ngay trang chủ** (khác bản mô tả cũ) — phải
vào đúng trang `/search` hoặc `/illustrations` trước.

1. Mở `https://undraw.co/` bằng trình duyệt (`mcp__claude-in-chrome`), bấm **"Browse now"** (hoặc vào
   thẳng `https://undraw.co/search`).
2. Gõ từ khoá tiếng Anh mô tả ý cần minh hoạ (ví dụ "team meeting", "online collaboration", "data
   analysis") vào ô search, Enter. Kết quả hiện ngay dạng lưới ảnh, mỗi ảnh có tên riêng.
3. **Đổi màu TRƯỚC khi bấm vào ảnh cần tải** — màu là cấu hình **toàn cục của cả trang**, không phải
   riêng từng ảnh: bấm vào ô vuông màu nhỏ cạnh menu "Illustrations" (góc phải header) để mở color
   picker, xoá hết ô hex, gõ đúng mã accent của repo — lấy từ `C.accent` trong
   `vinuni-lesson-video-ds/lib/tokens.js` (hiện là `#1d6199`) — rồi Enter. Mọi ảnh trên trang đổi màu
   ngay lập tức (đã xác nhận: SVG tải về có `fill="#1d6199"` xuất hiện đúng ở phần trang phục nhân
   vật, không phải màu tím mặc định `#6c63ff`).
4. Bấm vào đúng ảnh cần dùng — mở modal có 2 nút: **"Download SVG for your projects"** (dùng cái
   này) và "Download PNG for your blog / social" (đừng dùng PNG, mất khả năng resize không vỡ nét).
5. File tải về `~/Downloads/undraw_<tên-slug>_<mã>.svg` — di chuyển vào
   `media/files/stickers/<tên-nói-rõ-nội-dung>.svg`, đẩy R2 bằng `tools/media-push.mjs`.
6. Ghi nguồn (`https://undraw.co/search/<từ-khoá>` + tên ảnh) + license ("unDraw, riêng, không cần
   ghi công") + mã màu đã đổi vào `projects/<id>/PROMPTS.md`.

**Fluent Emoji / Tabler / Iconoir** (không có color picker toàn cục như unDraw — đây là icon set,
màu thường là mono hoặc cố định theo file):

1. Mở repo GitHub tương ứng (`github.com/microsoft/fluentui-emoji`, `tabler.io/icons`,
   `iconoir.com`) bằng trình duyệt.
2. Dùng ô search của trang (Tabler/Iconoir có search trực tiếp trên site; Fluent Emoji tra theo tên
   file trong repo GitHub, ưu tiên biến thể **Flat** — hợp style repo nhất theo bảng ở trên).
3. Tải SVG trực tiếp (nút Download trên Tabler/Iconoir; trên GitHub thì mở file raw rồi Save As, hoặc
   `curl` thẳng link raw.githubusercontent.com).
4. Nếu icon là stroke mono-color mặc định đen/xám, có thể sửa `stroke`/`fill` trong SVG bằng tay cho
   khớp `C.accent`/`C.text` — icon set này không có tool đổi màu trên web như unDraw.
5. Lưu vào `media/files/stickers/<tên>.svg`, đẩy R2, ghi nguồn + license (MIT — kèm bản quyền MIT
   trong `PROMPTS.md`, không cần ghi trên video) vào `PROMPTS.md`.

### Lane agent chọn sticker (cách giao việc)

Brief cho lane phải có đủ:

- **Input:** `cues.js` (có `text` và `visual` từng cue) + danh sách thư viện ở trên.
- **Việc:** với mỗi cue, trả lời *có cần sticker không*. Mặc định là **không**. Chỉ đề xuất khi
  câu có cảm xúc rõ (bất ngờ, cảnh báo, chốt hạ) hoặc cần chỉ hướng.
- **Output:** một bảng `cue | có/không | tên file | thư viện | license | lý do một dòng`.
  **Lane không tự chèn vào scene** — người sở hữu scene mới chèn, để tránh hai agent cùng ghi một file.
- **Cấm:** không tự tải ảnh từ nguồn ngoài danh sách đã soát license.

Đo lane làm tốt hay không: tỉ lệ cue được đề xuất sticker **nên dưới 30%**. Đề xuất cho mọi cue là
dấu hiệu lane đang rải cho đủ chứ không chọn theo nội dung.

**Ngưỡng ngược lại — đừng để một visual đứng yên quá lâu (FM-20):** mặc định "không cần sticker" áp
dụng theo từng cue, không áp dụng cho việc để nguyên một diagram/visual không đổi qua nhiều cue liên
tiếp. Nếu cùng một sơ đồ/khung hình đứng yên (không đổi bố cục, không thêm chi tiết mới) quá **6 cue
liên tiếp hoặc ~25 giây đo được**, bắt buộc phải có ít nhất một minh hoạ bổ trợ mới trong khoảng đó —
gắn đúng với nội dung cue đang nói, không phải chèn cho có. Khái niệm trừu tượng (chưa có nguồn thật
để chụp) thì dùng sticker/icon từ thư viện ở trên; một case/nguồn có thật thì dùng Evidence (§2) —
đừng nhầm hai loại.

---

## 2. Evidence — ảnh chụp nguồn thật

Component: `vinuni-lesson-video-ds/components/evidence/` (đọc `Evidence.prompt.md` trước khi dùng).

### Khi nào cần

Đang **viết kịch bản** hoặc **đọc slide**, gặp một trong các dấu hiệu sau thì đánh dấu ngay là cần Evidence:

- Câu viện dẫn một văn bản, luật, tiêu chuẩn, hay báo cáo cụ thể
  (ví dụ slide Ngày 5 trích *EU AI Act 2024/1689*, *NIST AI RMF 1.0*, *Google PAIR Guidebook*).
- Câu nêu một con số mà người xem có quyền hỏi "lấy ở đâu ra".
- Câu kể một sự việc có thật (ai công bố, ngày nào, ở đâu).

Đánh dấu bằng cách thêm trường `evidence` vào cue:

```js
{
  n: 11, /* … */
  text: 'Với các ngành nhạy cảm thì mức cẩn trọng phải tăng mạnh.',
  visual: 'Evidence: trang EUR-Lex của EU AI Act, khoanh đoạn phân loại rủi ro cao.',
  evidence: {
    source: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
    caption: 'EU AI Act · Regulation (EU) 2024/1689 trên EUR-Lex',
  },
}
```

### Quy trình lấy ảnh

Hai nguồn hợp lệ, chọn đúng theo tình huống:

**Nguồn web thật** (trang luật, bài báo, trang sản phẩm):
1. **Mở đúng trang nguồn thật** bằng trình duyệt (`mcp__claude-in-chrome`). Không lấy ảnh từ bài
   viết lại hay ảnh chụp của người khác — vào thẳng trang gốc.
2. Chụp màn hình, lưu vào `media/files/evidence/<tên-nói-rõ-nguồn>.jpg`.
3. Ghi lại **URL và ngày chụp** vào `projects/<id>/PROMPTS.md`. Nguồn có thể đổi; ngày chụp là bằng chứng.
4. Chỉ khoanh đỏ (`marks`) đúng dòng mà câu đọc đang nói tới. Khoanh cả trang thì thành không khoanh gì.

**Đo `marks` từ ảnh crop thật, đừng đoán (FM-21):** `marks` là toạ độ tỉ lệ 0-1 so với chính ảnh đã
crop/chụp (không phải so với trang PDF gốc). Ca thật đã xảy ra ở n5-06: khung đỏ đè lên tiêu đề/banner
không liên quan vì lane đoán số "nhìn hợp lý" thay vì đo. Quy trình bắt buộc:
1. Mở file ảnh crop thật (Read tool), nhìn trực tiếp vùng cần khoanh, đo toạ độ pixel trên chính ảnh
   đó (không phải ảnh gốc cả trang).
2. Chia cho kích thước thật của ảnh crop để ra tỉ lệ 0-1.
3. Sau khi viết `marks`, shoot lại still đúng frame và **mở ảnh render ra nhìn** — xác nhận khung đỏ
   ôm đúng, không đè chữ/hộp khác. Làm bước này cho MỌI cue có `marks`, không chỉ vài cue mẫu.

**Nguồn slide PDF** (slide gốc đã có sẵn hình/mock giảng viên vẽ) — xem mục "Slide đã có sẵn hình"
ở trên: dùng `tools/slide-crop.mjs "<PDF>" <trang> --box x0,y0,x1,y1 --out media/files/evidence/<tên>.png`
thay cho bước 1-2. Ghi **file PDF + số trang** thay cho URL ở bước 3.

Chung cho cả hai: đẩy lên R2 bằng `tools/media-push.mjs` để máy khác render được.

### Luật cứng

- **Không bao giờ** đưa ảnh dựng/mock vào Evidence. Nội dung mô phỏng dùng `IllustrativeStamp`
  với nhãn `MINH HỌA` (`components/labels/`).
- Mở được trang nguồn mà nội dung **không** đúng như kịch bản nói ⇒ sửa kịch bản, đừng sửa cách khoanh.
- Không tìm được nguồn thật ⇒ bỏ câu đó hoặc hạ giọng xuống mức không khẳng định. Đừng dựng ảnh cho có.

### Trích dẫn nghiên cứu/paper cụ thể — thử tìm ảnh thật trước (FM-22)

Cue nói "nghiên cứu năm X cho thấy...", "paper Y kết luận..." — có tên, có năm, có thể tra được —
**luôn thử tìm nguồn thật trước** (WebFetch/`mcp__chrome-devtools` tra CHI/ACM DL, arXiv, trang tác
giả), rồi chụp đúng quy trình Evidence nguồn web ở trên. Card "tên nghiên cứu + icon kính lúp" (không
có ảnh thật) chỉ dùng khi:
- đã thử tìm thật sự và không ra (paywall chặn hẳn, không có bản public) — ghi rõ trong `PROMPTS.md`
  là đã thử và không tìm được, không phải bỏ qua bước tìm; hoặc
- câu là một câu hỏi tu từ thuần, không viện dẫn nguồn cụ thể nào (ví dụ "câu hỏi này trả lời sao?").

Đừng dùng card này làm mặc định chung cho mọi chỗ "chưa có ảnh" — xem thêm mục đa dạng template dưới.

### Không có ảnh nguồn — đa dạng template, đừng chỉ có một kiểu

Khi không dùng được Evidence (không có ảnh nguồn thật, không phải trích dẫn có thể tra) và không phải
tình huống của `PhoneFrame`/`BrowserFrame` (§ đầu file) hay diagram/component cấu trúc thông thường,
chọn template theo đúng bản chất nội dung, không mặc định về một kiểu duy nhất:

| Nội dung | Template gợi ý |
|---|---|
| Câu hỏi tu từ, dẫn dắt sang phần mới | `LineIcon name="search"` + Card (đúng đây mới là chỗ hợp) |
| Trích một câu nói/nhận định ngắn (không phải nghiên cứu có thể tra ảnh) | Component quote — dấu ngoặc kép lớn + tên người nói, không icon kính lúp |
| Số liệu/thống kê tổng hợp không gắn nguồn cụ thể | `NumberBadge`/Card số liệu lớn, không giả vờ có nguồn |
| So sánh 2-3 lựa chọn | Card side-by-side hoặc bảng, không phải card đơn lẻ |
| Tiến trình/luồng nhiều bước | diagram mũi tên/timeline component sẵn có |

Một video có nhiều hơn 2 cue dùng đúng cùng một kiểu "icon kính lúp + card tên" là dấu hiệu đang mặc
định thay vì chọn theo nội dung — dừng lại, xem lại từng cue theo bảng trên.

---

## 3. Ảnh tư liệu## 3b. Ảnh tư liệu — đường `image-suggest` của remote

> Đổi từ 22/09/2026. hai tool `illustration-plan` / `illustration-qa` và `IllustrationSlot` đã
> **bỏ**. Ảnh tư liệu nay đi một đường duy nhất, của remote.

Dùng ảnh khi cảnh nói về một VẬT / ĐỊA ĐIỂM / HIỆN VẬT lịch sử, hoặc muốn người xem nhìn kỹ một chi
tiết. Dùng ảnh khi một khung tĩnh đã đủ truyền đạt ý.

```bash
node tools/image-search.mjs <thư mục video>     # Openverse + Wikimedia Commons → triage.json + ứng viên
node tools/image-check.mjs  <thư mục video>     # soát decisions.json (license, kích thước, ghi công)
node tools/image-apply.mjs  <thư mục video>     # tải + chuẩn hoá → img/<slot>.<ext> + images.js
```

- Người dựng chọn trong `projects/<id>/images/decisions.json`; `action: "use"` = vẽ ra bằng
  `<PhotoCard>`, `action: "reference"` = **chỉ để xem rồi vẽ lại** bằng component DS.
- Cảnh vẽ bằng `<PhotoCard src={IMAGES.sN.src} credit={IMAGES.sN.credit} …/>` (components/media) —
  thẻ trắng, credit bắt buộc, Ken Burns ≤6%. Không filter, không duotone, không khung giả cổ.
- Danh sách license cho phép: `images.policy.json` (NC/ND bị chặn). Skill chọn ảnh:
  `.claude/skills/image-suggest/`.
- **Gate G6** của `tools/storyboard-gate.mjs` soát chính `images.js`: có file thật · license trong
  policy · `kind: "use"` có credit và được cảnh dùng · `kind: "reference"` KHÔNG lọt vào `<PhotoCard>`.
- `npm run verify` soát phía code: mọi `<PhotoCard>` phải có `credit` và `src` là file của design
  system (không URL).


## 4. Remotion — dùng phần nào, không dùng phần nào

`lib/motion.js` của repo **vốn đã là bản port các helper của Remotion** (`interpolate`, `spring`,
`Easing`) — đọc comment đầu file: mục tiêu là giữ scene "portable to Remotion". Nên câu hỏi không
phải "có nên dùng Remotion không" mà là "dùng tới đâu".

### License (tra ngày 14/09/2026, `remotion-dev/remotion/LICENSE.md`)

| Đối tượng | Phải trả tiền? |
|---|---|
| Cá nhân | Miễn phí |
| Tổ chức **phi lợi nhuận** (gồm trường đại học) | **Miễn phí** |
| Công ty vì lợi nhuận **từ 4 nhân viên trở lên** | Phải mua Company License |
| Đang đánh giá, chưa dùng thương mại | Miễn phí |

VinUni là trường đại học nên **rơi vào nhóm miễn phí**. Nhưng nếu video dùng cho hoạt động thương
mại của một pháp nhân vì lợi nhuận thì phải xem lại.

### Ba mức áp dụng, chọn theo nhu cầu thật

| Mức | Làm gì | Được gì | Giá phải trả |
|---|---|---|---|
| **A. Mượn hàm thuần** | Cài `@remotion/shapes`, `@remotion/paths` và dùng như thư viện hình học bình thường | Hình khối, đường, morph chuẩn hơn tự vẽ tay. **Không** đụng gì tới pipeline hiện tại | Gần như bằng 0 |
| **B. Mượn ý tưởng transition** | Đọc `@remotion/transitions`, tự cài lại slide/wipe/clock-wipe bằng `interpolate` sẵn có | Chuyển cảnh chuyên nghiệp hơn | Vừa, không thêm dependency |
| **C. Port hẳn sang Remotion** | Viết lại scene thành `<Composition>`, dùng Remotion Studio + Lambda | Studio có timeline kéo thả; render song song trên Lambda nhanh hơn nhiều lần | Lớn: viết lại toàn bộ scene và design system |

**Đã làm A và B (14/09/2026).** Bảy component dựng trên hai gói hàm thuần: `DrawPath`, `Callout`,
`Pie`, `Spark`, `Morph`, `Tracer`, `Arrow` (xem `components/shapes/Shapes.prompt.md`), và chuyển cảnh
ở `lib/transitions.js` + `lib/series.jsx` (§7). Không gói nào kéo theo runtime Remotion.

Ba API đáng khai thác tiếp, vẫn thuộc mức A: `warpPath` (uốn path theo hàm), `getSubpaths` (tách nét
để hiện lần lượt), `reversePath` (chạy ngược một luồng). Cả ba là hàm thuần, thêm được mà không đụng
pipeline.

**Khuyến nghị:** làm **A** trước (rẻ, có kết quả ngay), rồi **B**. Chỉ tính **C** khi thấy rõ hai
thứ: người dựng cần timeline trực quan để làm nhanh hơn, và thời gian render cục bộ (3-5 phút/video)
đã thành nút thắt thật.

**Đừng** port sang C chỉ vì "Remotion xịn hơn". Cái làm video trông chuyên nghiệp là nhịp, bố cục,
âm thanh và tính nhất quán — không phải tên framework.

---

## 5. SFX — tiếng động, bốn lớp

### Đừng tự tổng hợp bằng ffmpeg

Bản đầu của repo dựng whoosh/ding bằng `anoisesrc` + `aecho` + chồng sóng sin. Nghe ra ngay là đồ
giả: whoosh không có phần thân khí, ding không có tiếng gõ đầu. Tổng hợp chỉ hợp khi cần một tiếng
rất ngắn và trung tính; mọi tiếng có mặt trước người xem phải là bản thu thật.

### Bốn lớp — luật của Thái được GIỮ, chỉ tách ra đúng chỗ

Luật "tối đa 4 tiếng nhấn mỗi video" là đúng, nhưng nó nhốt chung hai thứ khác hẳn nhau: tiếng để
KÉO SỰ CHÚ Ý, và tiếng của CHÍNH chuyển động trên hình. Video demo 4:46 với 21 cảnh animation dày
chỉ được 9 tiếng — hình diễn nhiều mà tai gần như không nghe thấy gì. Từ 21/09/2026 `sfx.json` khai
bốn lớp, mỗi lớp một đích và một luật:

| lớp | mức đích (`--db -6`) | duck khi đè lời | trần |
|---|---|---|---|
| `accent` | đỉnh −14 dBFS | −3 dB | **≤4 mỗi video** — trần cứng, đừng nới |
| `transition` | đỉnh −12 dBFS | 0 | chỉ ở ranh giới section/chương |
| `foley` | đỉnh −16 dBFS | −5 dB | ≤12 sự kiện/phút |
| `ambience` | RMS −36 dBFS | 0 | bed theo CẢNH, có fade |

Số đích nằm ở `sfx.json._layers`, không rải trong code. `accent` đặt −8 để `ding` ra đúng mức nó đã
có từ trước (đỉnh −14 dBFS) — đổi luật không được đổi âm lượng của thứ đang chạy.

Ngân sách mật độ đếm một **chuỗi có chủ đích** (`burst`) là MỘT sự kiện: 14 tiếng "tách" dồn nhịp
trong 3 giây là một hiệu ứng, không phải 14 lần rải tiếng.

### Catalog (soát license 14/09/2026 · bổ sung 13 tiếng 21/09/2026)

| id | lớp | giây | đỉnh dBFS | peakAtMs | dùng cho |
|---|---|---|---|---|---|
| `whoosh` | transition | 0,49 | −4,1 | 143 | chuyển section (tự đặt, không khai tay) |
| `whoosh-long` | transition | 2,00 | −4,4 | 798 | mở đầu video và cú chốt cuối |
| `riser` | transition | 1,98 | −0,4 | 935 | căng dần TỚI một accent — không đứng một mình |
| `ding` | accent | 1,04 | −8,0 | 166 | một ý chốt hiện ra |
| `pop` | accent | 0,53 | −4,0 | 20 | một item bật lên |
| `ting` | accent | 1,68 | −16,2 | 105 | kết quả ĐÚNG, ấm ("MÈO ✓") |
| `flash` | accent | 2,09 | +0,1 | 204 | cú mạnh nhất của cả phim, đúng MỘT lần |
| `stamp` | foley | 0,59 | −0,5 | 62 | con dấu đóng — "cạch" |
| `paper` | foley | 0,93 | −4,1 | 670 | giấy/hồ sơ sột soạt |
| `tick` | foley | 0,23 | −6,4 | 5 | "tách" — nhánh nở; dùng thành `burst` |
| `snip` | foley | 0,38 | +0,4 | 42 | "phựt" cắt đứt |
| `counter` | foley | 0,44 | −19,1 | 11 | bộ đếm "tạch"; dùng thành `burst` |
| `soft-pop` | foley | 0,51 | −13,5 | 0 | mỗi đặc trưng nhảy ra |
| `snap` | foley | 0,74 | −14,8 | 277 | "khớp" — một nhánh nhập trục |
| `chisel` | foley | 0,49 | −9,8 | 42 | đục khắc chữ lên bia |
| `wind` | ambience | 30,0 | −17,6 | — | gió lạnh — mùa đông AI |
| `conveyor` | ambience | 20,0 | −0,5 | — | băng chuyền lạch cạch |

### Sự kiện trên hình → tiếng nào

| cái gì xảy ra trên hình | tiếng | lớp |
|---|---|---|
| một mốc/con dấu đóng xuống | `stamp` | foley |
| hồ sơ, bìa báo cáo, trang giấy | `paper` | foley |
| một nhánh nở · một mũi tên vẽ ra · một cột mọc | `tick` (`burst` nếu nhiều) | foley |
| một dòng bị cắt đứt · gạch ✕ dứt khoát | `snip` | foley |
| số nhảy · băng chuyền đếm | `counter` (`burst`) | foley |
| một item/đặc trưng bật ra | `soft-pop` | foley |
| hai thứ ăn khớp vào nhau | `snap` | foley |
| chữ khắc lên bia | `chisel` | foley |
| một ý CHỐT hiện ra | `ding` | accent |
| một kết quả ĐÚNG, ấm | `ting` | accent |
| cú nổ lớn nhất phim | `riser` (trước) + `flash` | transition + accent |
| cả cảnh lạnh/có nhịp máy | `wind` / `conveyor` | ambience |

**Chỗ CỐ Ý không có tiếng cũng là thiết kế.** Sếp ghi rõ "hẫng lặng khi máy chìm", "nhạc rút hết chỉ
còn một nốt trầm", "kết mở, không tắt hẳn" — beat không khai `sfx` là quyết định, không phải sót.

### Khai ở đâu — `storyboard.json`, không phải `cues.js`

Beat trong `storyboard.json` đã khai `anchor` (cụm từ) + `cue`, tức là **đúng mốc mà hình đang neo
vào**. Vì vậy âm thanh khai ngay tại đó:

```jsonc
{ "anchor": "mèo", "cue": 58, "does": "nhãn MÈO ✓ bật ra",
  "sfx": { "id": "ting", "pan": 0.2, "gainDb": 0, "offsetMs": 0 } }
```
```jsonc
// bed của cả cảnh
"ambience": { "id": "wind", "fadeSec": 2.0 }
// chuỗi dồn nhịp: 14 tiếng, cách nhau 330ms, mỗi lần nhân 0,88 → nhanh dần
"sfx": { "id": "tick", "burst": { "count": 14, "spacingMs": 330, "ramp": 0.88 } }
```

- Khai ở beat **đè** khai báo `sfx:` cũ của cùng cue+cụm trong `cues.js` — migration không phải sửa
  `cues.js` (file đó bị `cuesSha256` canh và wording đã khoá).
- `pan` tối đa ±0,3. Quá đó thì một tiếng nhỏ nhảy hẳn sang một tai, nghe thành lỗi.
- `offsetMs` âm = trước mốc lời. Dùng cho `riser` (phải căng dần TỚI cú nhấn).
- Video **không** khai gì trong storyboard thì `sfx-mix` chạy đúng luật cũ, ra đúng file cũ (đã kiểm
  bằng sha256 trên 3 video cũ, 21/09/2026).

### Trộn và đo

```bash
node tools/sfx-fetch.mjs                                  # dựng lại assets/sfx/ từ catalog
node tools/sfx-fetch.mjs --measure --write                # đo lại và ghi số vào sfx.json
node tools/sfx-mix.mjs --video <id> --dry                 # xem trước: tiếng, lớp, gain thực, có đè lời không
node tools/sfx-mix.mjs --video <id> --out voice-sfx.wav   # trộn thật + xuất cuesheet
node tools/sfx-mix.mjs --video <id> --out x.wav --stem sfx-only.wav   # tách bus SFX để ĐO
node tools/render.mjs --scene <id> --audio voice-sfx.wav ...
```

- **Căn ĐỈNH, không căn đầu file.** Mỗi tiếng khai `peakAtMs` đo sẵn; `sfx-mix` đặt file sao cho đỉnh
  rơi đúng mốc hình. Hằng `LEAD_FRAMES = 6` dùng chung cho mọi tiếng chỉ còn ở chế độ cũ — đỉnh
  `whoosh-long` ở 798 ms còn `tick` ở 5 ms, cùng một lead thì một trong hai lệch nửa giây.
- **Lời không bị động vào.** Track lời vào `amix` ở unity, `normalize=0`; limiter chỉ nằm trên bus
  SFX và ở cuối chuỗi. Đo LUFS trên các đoạn lời không có tiếng nào: trước/sau trùng nhau (−16,2).
- Cuesheet `<out>.cuesheet.md` liệt kê timecode · cảnh · mốc · tiếng · lớp · gain thực · đè lời —
  đọc được mà không phải nghe hết.

### Thêm một tiếng mới

1. Tìm trên [Pixabay Sound Effects](https://pixabay.com/sound-effects/) (Pixabay Content License —
   thương mại được, không cần ghi công). Trang HTML trả **403** với `curl`; mở bằng Chrome thật
   (MCP `chrome-devtools`), `fetch()` trang chi tiết **trong page context** rồi regex
   `https://cdn\.pixabay\.com/download/audio/[^"]+\.mp3`. Link đó `curl` tải được **nếu khai
   User-Agent trình duyệt** (không khai thì 403 — soát 21/09/2026).
2. Thêm một mục vào `sfx.json`: `id · file · layer · use · source · download`, thêm `trimSec` nếu
   bản thu là một file NHIỀU nhát (rất hay gặp: con dấu đóng 5 lần, kéo cắt 12 giây — giữ nguyên thì
   một cú nhấn hoá thành một tràng; chọn số từ đường bao RMS của chính file).
3. `node tools/sfx-fetch.mjs --only <id> --write` — tải, chuẩn hoá 48 kHz stereo, cắt lặng đầu
   (trừ `ambience`: cắt là gãy vòng lặp), rồi ghi `seconds/lufs/rmsDb/peak/peakAtMs` vào catalog.
4. `assets/sfx/*.wav` **không vào git**. `sfx.json` là nguồn sự thật duy nhất để dựng lại — mất link
   `download` là mất tiếng.

---

## 6. Bố cục — vùng của ai, và cái gì máy tự bắt được

Ba lỗi dưới đây lặp lại qua nhiều bản render, lần nào cũng phải xem lại video mới thấy. Giờ
`npm run verify` bắt được cả ba, nên đừng sửa bằng mắt nữa — chạy verify.

### Vùng cố định của khung 1920×1080

| Vùng | y | Ai được vào |
|---|---|---|
| Eyebrow + title | 60–210 | chỉ chrome |
| Nội dung | 250–960 | component của cue |
| **Thanh phụ đề** | **984–1080** | **không ai cả** |

Bất cứ thứ gì cắt ngang y=984 sẽ bị thanh phụ đề cắt đôi. Với mascot `peekBottom`, mắt nằm ở
khoảng 42% chiều cao artwork — đó là số quyết định `y` của spot, không phải ước lượng bằng mắt.

### Ba lỗi verify đã bắt được

**1. Mascot đè chữ / đè hộp.** `Mascot` khai vùng nó chiếm qua `data-vk-occupies="x,y,rộng,cao"`,
và verify báo mọi `<text>` hoặc `<rect>` đang hiện mà giao với vùng đó:

```
videos/n5-01-…: câu 2: a 1240×235 box at 220,400 runs under the mascot
```

Cách sửa **không phải** là dời mascot đi chỗ khác cho hết báo, mà là chọn spot hợp với bố cục cue:

| Nội dung cue | Spot |
|---|---|
| một hộp rộng gần hết khung | `corner` — mascot nép góc |
| nội dung kết thúc trên y≈740 | `peekBottom` — ló lên, sinh động hơn corner |
| nội dung gọn một nửa khung | `costarRight` / `costarLeft` — mascot là bạn diễn |

Component mới muốn được bảo vệ tương tự thì tự khai `data-vk-occupies`; verify không cần sửa gì.

**2. Tiêu đề lặp trong slide.** Cue đã có `title` rồi mà nội dung viết lại đúng câu đó (kể cả khác
hoa/thường và khác dấu) thì verify báo. Chỗ đó đáng dùng cho một ý mới, không phải đọc lại đề bài.

**3. `NaN` trong attribute.** Xem failure-modes FM-13.

### Giới hạn của checker

Nó ước lượng bề ngang chữ bằng `0,52 × cỡ chữ × số ký tự` và chỉ biết vùng nào **có khai**
`data-vk-occupies`. Nên nó bắt được "chồng lên nhân vật", **không** bắt được hai hộp chồng nhau hay
chữ tràn khỏi hộp. Những cái đó vẫn phải chụp still mà nhìn:

```bash
node tools/shoot.mjs --batch jobs.json   # jobs: [{url:'…/index.html?scene=<id>&frame=<f>', out, width:1920, height:1080}]
```

---

## 7. Chuyển cảnh — đã dùng được, nhưng chỉ ở ranh giới section

`Series` (`lib/series.jsx`) trước đây chỉ cắt thẳng. Giờ mỗi sequence khai được `transition`, và
trong cửa sổ chuyển cảnh hai cảnh cùng được vẽ chồng lên nhau:

```js
{ component: S15, duration: 150, transition: { kind: 'slide', frames: 9, direction: 'left' } }
```

**Mặc định vẫn là cắt thẳng.** Không khai `transition` thì không đổi gì — mọi video đang có giữ
nguyên từng frame.

### Đặt ở đâu

Chỉ ở **ranh giới section**, đúng chỗ `sfx-mix.mjs` đặt tiếng whoosh, để tai và mắt đổi cảnh cùng
lúc. Trong lòng một section thì cắt thẳng: chuyển cảnh giữa hai câu đang nói cùng một ý chỉ kéo
chú ý sang hiệu ứng. Một video dùng tối đa 2-3 kiểu (`TRANSITION_INTENT` trong `transitions.js`).

### Hai cái bẫy đã vấp, đừng vấp lại

1. **Cú pháp SVG dán vào CSS thì bị bỏ qua im lặng.** `transitions.js` sinh `translate(-1075 0)` —
   hợp lệ trong SVG, sai cú pháp trong CSS (`style.transform` cần `translate(-1075px, 0px)`).
   Trình duyệt không báo lỗi, cảnh chỉ đứng yên. `series.jsx` có `svgTransformToCss` để chuyển.
2. **Sai dấu ở nhánh `enter`.** Cảnh mới phải chờ ở phía ĐỐI DIỆN hướng đi. Sai dấu thì hai cảnh
   cùng trượt về một phía và để hở một mảng nền trắng giữa khung.

Cả hai chỉ lộ ra khi **chụp một frame giữa cửa sổ chuyển cảnh** mà nhìn. Kiểm bắt buộc sau khi
thêm hay sửa chuyển cảnh:

```bash
node tools/shoot.mjs --batch jobs.json   # frame = TIMELINE[i].start + 4, tại mỗi ranh giới section
```

Cảnh cũ bị **giữ đứng ở frame cuối** trong lúc trượt ra. Cho nó chạy tiếp thì nó vượt quá `duration`
mà chính nó được dựng, và các beat tính theo `authoredDuration` sẽ nhảy.

---

## 8. Cảnh báo "bố cục lệch hẳn một bên"

`npm run verify` còn đo tỉ lệ lấp đầy của **nửa trái** và **nửa phải** vùng nội dung, ở frame cuối
mỗi câu (đo giữa câu thì câu nào cũng trống vì nội dung còn đang hiện dần). Một bên dưới 6% mà bên
kia trên 22% thì nó nêu tên câu đó.

```
! videos/n5-01-…: bố cục lệch hẳn một bên ở 2 câu — câu 16 (nửa phải bỏ không), câu 18 (nửa trái bỏ không)
```

**Đây là cảnh báo, không phải lỗi** — và cố ý để ở mức cảnh báo, vì hai lý do ngược nhau đều đúng:

- Một câu chốt chỉ có một dòng chữ giữa khung là **hợp lệ**, đó là nhịp nghỉ.
- Một cặp câu kiểu "trước / sau" (câu 16 dựng vế trái, câu 17 thêm vế phải) cũng **hợp lệ**.

Cái nó bắt được là trường hợp thứ ba: bố cục chừa sẵn nửa khung cho phần chỉ hiện ở câu sau, nên
người xem nhìn một khung hụt mất một mảng trong mấy giây. Thấy tên câu trong cảnh báo thì mở still
của câu đó ra nhìn rồi tự quyết, đừng sửa cho hết cảnh báo.

Mascot được tính là vật thể: nửa khung có nhân vật đứng thì nửa đó không "bỏ không".

### Thử trước khi tin một ngưỡng

Ngưỡng đầu tiên đặt là "vùng nội dung lấp dưới 18%" và nó nêu **13/39 câu của một video, 11/47 câu
của video khác** — kể cả các video đã dựng xong từ trước. Một cảnh báo kêu ở một phần ba số câu thì
không ai đọc nữa. Phép đo đúng không phải "ít nội dung" mà là "lệch", và sau khi đổi thì cả 5 video
còn đúng 4 câu. Ngưỡng nào cũng phải chạy thử trên toàn bộ video đang có rồi mới giữ.

---

## 9 · Mascot — pose và cảm xúc là hai trục riêng

*(chuyển từ `script-craft.md` §5 ngày 21/09/2026 — đây là luật HÌNH, lane viết văn xuôi không cần.)*

Kho pose: `vinuni-lesson-video-ds/components/mascot/` (xem `MascotRevamp.prompt.md`).
`pose` là DÁNG NGƯỜI (tay, đầu, cả người), `emotion` là NÉT MẶT.

**Kiểm chứng bằng ảnh thật 2026-09-16 (diff pixel, xem `MascotRevamp.prompt.md`): phần lớn pose
KHÔNG đổi dáng người.** Thân/tay/cánh luôn ở đúng một tư thế — tay giơ cao, cánh dang ngang — trừ
`leanFoot` (nghiêng, nhấc một chân) và `hop` (nhảy). `handsDown`/`nod` render y hệt `stand`, 0 pixel
khác biệt. `lookLeft`/`lookRight`/`peek`/`lookUp`/`lookDown`/`curious`/`think`/`shrug`/`leanIn`/
`profileLeft`/`profileRight` chỉ dịch tròng mắt vài pixel — không thấy được ở cỡ slide ~300px. Các
pose có đạo cụ (`wave*`, `point*`, `teach`, `present`, `read`, `sketch`, `cheer`, `clap`) cũng dùng
đúng dáng người đó, chỉ thêm hình vẽ đè lên (sách, bảng, vệt vẫy tay...). Đây là lý do mascot trong
video dựng ra "lúc nào cũng giơ tay" dù kịch bản đã đổi tên pose liên tục — đổi TÊN pose không đổi
DÁNG. Đừng viết cue trông cậy vào một cái đổi dáng người mà `POSE_SPEC` không có; nếu cảnh thật sự
cần tay buông xuống hoặc đầu quay ngang thật, đó là giới hạn artwork — báo lại, đừng cố chọn pose
"gần đúng tên" để bù.

| Ý của câu | `pose` | Đổi dáng người? | `emotion` |
|---|---|---|---|
| Chào đầu / tạm biệt cuối | `wave` · `waveRight` · `bigWave` | Không (chỉ thêm vệt vẫy) | `happy` |
| Chỉ vào dữ kiện bên cạnh | `point` · `pointLeft` | Không (chỉ thêm gậy chỉ) | theo ý câu |
| Chỉ lên tiêu đề / con số phía trên | `pointUp` | Không | `excited` |
| Chỉ xuống danh sách / bảng phía dưới | `pointDown` | Không | `serious` |
| Giải thích cơ chế, giảng | `teach` | Không (thêm bảng chữ) | `idle` / `talking` |
| Giới thiệu một thứ, mở bàn tay ra | `present` | Không (thêm bảng chữ) | `happy` |
| Cao trào, số liệu gây bất ngờ | `cheer` · `clap` | Không (thêm sparkle/vệt) · `hop` có nhảy thật | `excited` |
| Dáng nghỉ, đổi nhịp hình ảnh (khoảng lặng, chuyển ý) | `leanFoot` | **Có — dáng duy nhất khác `stand`** | theo ý câu |
| Đặt câu hỏi, cân nhắc, chốt ý, nêu vấn đề, hạ giọng | `think` · `curious` · `nod` · `shrug` · `leanIn` | Không (chỉ nét mặt đổi qua `emotion`) | theo ý câu |
| Ngoảnh sang nội dung / nhìn lên / nhìn xuống | `lookLeft` · `lookRight` · `peek` · `lookUp` · `lookDown` | Không (chỉ dịch tròng mắt vài px, khó thấy ở slide) | theo ý câu |
| Cảnh báo rủi ro, nói về thất bại | `stand` (không dùng `handsDown` — y hệt `stand`) | — | `sad` |

Pose `formal` (chim mặc vest) đã bị bỏ ngày 14/09/2026 cùng nhân vật giáo sư — dùng `emotion="serious"`.

Luật: **không lặp cùng một pose 3 câu liên tiếp**, và **không quá 4-5 câu liên tiếp toàn dùng pose
"không đổi dáng"** (đa số bảng trên) — nếu cảnh cần một nhịp hình ảnh thật sự khác (không chỉ đổi
tên/nét mặt), xen `leanFoot` hoặc đổi `spot`/bố cục thay vì đổi tên pose. Nếu 3 câu liền nhau không
nghĩ ra ý khác nhau, đó là dấu hiệu 3 câu đó đang nói cùng một ý → gộp lại hoặc viết lại.

Ba giới hạn đã đo, đừng vá bằng cách nới số:
- **Hướng tay do `spot` quyết định, không phải tên pose.** Mỗi spot đã quay mặt về phía nội dung, và
  artwork lật theo. Nên ở spot bên phải khung, `point` chỉ sang TRÁI. Dùng `pointLeft` ở đó là lật
  hai lần, tay chỉ ra ngoài khung.
- **Không có góc profile thật, và gần như không có "ngoảnh đầu" thật.** `lookLeft`/`lookRight`/`peek`
  chỉ dịch tròng mắt vài pixel, không xoay đầu. Cảnh cần quay đầu/profile thật thì phải có artwork
  mới, không phải chỉnh tham số.
- **LEXCE mặc định đứng thẳng.** Bản vẽ gốc nghiêng đầu 14,2°, component đã bù. Đừng thêm `tilt` lớn
  cho "tự nhiên hơn" — nghiêng là một ý diễn xuất (`curious`, chỉ đổi nét mặt), không phải nhịp nền.
- **Tay không giơ cao được, và không hạ xuống được.** Khớp vai nằm dưới-phải bàn tay nên giơ quá +8°
  là cánh trùm lên tai và mắt; hạ tay/gập cánh cũng cần artwork riêng vì rig cắt vùng cũ (đã thử, đã
  bỏ) làm hở mép và chồng cánh lên má. `wave`/`bigWave` là cánh rung quanh vị trí nghỉ, không phải hạ
  tay. Cảnh cần tay ở vị trí khác thật sự phải có artwork mới — đừng nới biên trong component.

Ngoài pose, mỗi cue còn khai `spot` (chỗ đứng) và `emote` (cảm xúc nổi). **`spot` phải chọn theo bố
cục của chính cue đó**, không phải theo cảm hứng: nội dung rộng gần hết khung thì `corner`, nội dung
kết thúc trên y≈740 thì `peekBottom`, nội dung gọn một nửa khung thì `costarRight`/`costarLeft`.
Chọn sai thì `npm run verify` báo "runs under the mascot" — xem §6.

---

## 10 · Ví dụ code minh hoạ — cho xem đúng thứ đang nói

*(chuyển từ `script-craft.md` §3g ngày 21/09/2026.)*

Slide/kịch bản nhắc tới prompt, đoạn code, request/response API, hay một luồng thực thi (agent gọi
tool, log hệ thống) thì **cho xem đúng dạng đó**, đừng chỉ mô tả bằng Card/text:
- Một đoạn prompt hoặc hàm code ngắn → `CodeBlock` (`components/code/CodeBlock.prompt.md`).
- Một payload API có key/value cần giải thích → `JsonView`.
- Một chuỗi sự kiện có thời gian/trạng thái (agent suy luận → gọi tool → nhận kết quả) → `LogCard`.

Code/payload là **minh hoạ** (không phải chạy thật) trừ khi thật sự lấy từ nguồn — luôn để
`illustrative` bật đúng theo `.prompt.md` của từng component, viết bằng tiếng Việt trong comment/gloss,
giữ ngắn (`CodeBlock` ≤ 12 dòng hiện cùng lúc, `JsonView` ≤ ~20 dòng — trim đúng phần lời đọc nhắc tới).

## 10. Ảnh tư liệu## 10b. Ảnh tư liệu — luật phía CẢNH

`posterIllustration.IllustrationSlot` đã bỏ (22/09/2026). Cảnh poster đặt thẳng `<PhotoCard>` vào
SVG như mọi component DS khác; quy trình tìm/chọn/license ở §3b. Hai luật còn giữ nguyên giá trị:

1. **License đòi ghi công ⇒ credit hiện suốt thời gian ảnh hiện** — `PhotoCard` tự vẽ dòng credit và
   không cho phép thiếu nó. Ưu tiên CC0/PD hơn CC BY hơn CC BY-SA.
2. **Ảnh thật luôn sáng hơn nét vector** — chọn ảnh (hoặc `fit`/`focus`) sao cho nó không thành chỗ
   sáng nhất khung, thay vì hạ `gain` bằng filter: `PhotoCard` cố ý KHÔNG filter ảnh tư liệu.

## 7b. Chữ trên hình — ví dụ đầy đủ (chuyển từ `styles/poster.md` §7, 22/09/2026)

`storyboard-gate` G1 chặn chữ trên hình lặp lời đọc, và sức ép đó đẩy người sửa đi rút gọn. Rút gọn
là đúng — **đổi nghĩa là hỏng**, và gate không thấy khác nhau ở chỗ đó (FM-32).

- ĐÚNG: `không một dòng luật nào được viết ra` → **`0 dòng luật`** (64px). Hình nói phần hình, phụ
  đề nói phần lời.
- SAI, đã xảy ra: `suy luận logic tổng quát — không đủ` → `logic tổng quát ≠ thế giới thật`. Dấu `≠`
  chỉ nói **KHÁC**, không nói **KHÔNG ĐỦ** — owner bắt và trả lại.
- **Mọi chuỗi bị gate đẩy đổi phải qua mắt owner.** Phần tử CỐ Ý lặp lời (bia khắc, end-card) thì
  khai `kind: "plaque"|"endcard"` trong `storyboard.json` để miễn G1 theo thiết kế, đừng bẻ chữ.

**Ngôn ngữ chữ trên hình: TIẾNG VIỆT.** Lời đọc là tiếng Việt, nên chữ người xem ĐỌC ĐỂ HIỂU cũng
phải là tiếng Việt và khớp với lời đọc. Lượt d05-v06 chép thẳng nhãn tiếng Anh từ slide và phải
Việt hoá **39 chuỗi** ở lượt tích hợp (F11) — muộn nhất có thể, vì lúc đó cảnh đã dựng xong.

- **Thuật ngữ tiếng Anh = CHÚ THÍCH PHỤ**, cỡ nhỏ hơn, đặt dưới hoặc cạnh chữ Việt: `Độ tin cậy`
  lớn, `(confidence)` nhỏ. Không bao giờ để thuật ngữ đứng MỘT MÌNH làm nhãn chính.
- **Tên app/sản phẩm trong mock giao diện giữ nguyên** — đó là vật thể thật, không phải chữ để hiểu.
  Khai `kind: "mock"` cho chuỗi đó.
- Thuật ngữ đã thống nhất giữ nguyên tiếng Anh thì khai `allowEnglish: [...]` ở cấp cảnh hoặc cấp
  file trong `storyboard.json`.
- Gate: **G8** của `storyboard-gate` CẢNH BÁO mọi chuỗi toàn ASCII >2 từ không nằm trong hai danh
  sách trên. Cảnh báo, không chặn — danh sách thuật ngữ là quyết định của owner, không của máy.

## 6b. Cầu nối — ví dụ đã dựng (chuyển từ `styles/poster.md` §6, 22/09/2026)

Chuyển chương bằng một vật thể đi tiếp, không bằng cắt cứng hay fade: đốm sáng cuối chương 1973 →
lớn dần → mốc 2006; cỗ máy "tự học" cuối chương 2006 → thu thành nốt gold → **gốc cây của cảnh ĐI
NGAY SAU**.

Ba luật cứng:
1. Cầu nối bắt đầu bằng **đúng frame cuối** của chương trước; toạ độ điểm nối đọc từ source của cảnh
   KẾ TIẾP, không suy từ cảnh khác (E8).
2. **Bỏ lớp fade-về-nền** ở cuối cảnh cuối chương của bản gốc — nó xoá mất chính frame cầu nối cần.
3. **Không vẽ lại hình của cảnh liền kề** — import chính hằng số nội dung của cảnh đó (ca thật:
   `BAI_HOC_1973` dùng chung giữa `L6` và `bridge-1`). Chép lại là hai bản phân kỳ ở lần sửa đầu
   tiên, và cầu nối "đi tiếp" từ một hình không còn tồn tại.
