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
node tools/pdf-text-locate.mjs "<đường dẫn PDF>" <số trang> "<cụm từ trong vùng cần cắt>"
# Xuất ra toạ độ tỉ lệ 0–1 sử dụng cho --box ở bước 2. Đây là GỢI Ý, vẫn phải xác nhận ở bước 1.

# Bước 1 — render cả trang để xem, chọn vùng cần cắt (toạ độ tỉ lệ 0–1, gốc trên-trái)
node tools/slide-crop.mjs "<đường dẫn PDF>" <số trang> --out /tmp/preview.png --dpi 200

# Bước 2 — crop đúng vùng, lưu vào media/files/evidence/
node tools/slide-crop.mjs "<đường dẫn PDF>" <số trang> --box 0.078,0.24,0.23,0.62 \
  --out media/files/evidence/<tên-nói-rõ-nguồn>.png --dpi 200
```

**Dùng `pdf-text-locate.mjs` để tìm toạ độ từ chữ trong PDF** (Node, dùng `unpdf` sẵn có của repo; độ mịn là đoạn chữ, nên box có thể rộng hơn cụm chữ):
```bash
node tools/pdf-text-locate.mjs slides.pdf 37 "Trust calibration"
# ✓ Tìm thấy nguyên cụm "Trust calibration" — 1 vị trí ở trang 37:
#   [1] --box 0.047,0.067,0.239,0.120   (184pt × 29pt)
```
Nếu cụm từ bị ngắt dòng trong PDF, tool sẽ gộp từng từ riêng lẻ và cảnh báo — vẫn PHẢI mở ảnh
preview (bước 1) để xác nhận kỹ rồi mới dùng.

Đây thuộc nhóm **Evidence** (không phải mock tự dựng) — vì nội dung là nguyên văn tài liệu giảng
viên, không phải Claude tưởng tượng ra. Áp đúng luật §2: ghi **file PDF + số trang** vào
`projects/<id>/PROMPTS.md` thay cho URL, không cần khoanh đỏ nếu crop đã đúng khít vùng cần chỉ.
**Agent lưu file vào `media/files/evidence/` rồi báo lại** — người chủ bucket tự chạy
`node tools/media-push.mjs --only evidence/ --dry-run` xem trước rồi mới push.

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

1. **Tải về `media/files/stickers/`, đừng hotlink.** `media/files/*` đã nằm trong `.gitignore`.
   **Agent lưu file vào đây rồi báo lại** — không chạy `media-push.mjs`; người chủ bucket tự push sau khi duyệt `--dry-run`.
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
   `media/files/stickers/<tên-nói-rõ-nội-dung>.svg` rồi báo lại. **Agent dừng ở đây.**
   Người chủ bucket tự chạy `node tools/media-push.mjs --only stickers/ --dry-run` xem trước rồi mới push.
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
5. Lưu vào `media/files/stickers/<tên>.svg` rồi báo lại. **Agent dừng ở đây.**
   Người chủ bucket tự chạy `node tools/media-push.mjs --only stickers/ --dry-run` xem trước rồi mới push.
   Ghi nguồn + license (MIT — kèm bản quyền MIT trong `PROMPTS.md`, không cần ghi trên video) vào `PROMPTS.md`.

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

Chung cho cả hai: **agent lưu ảnh vào `media/files/evidence/` rồi báo lại** — không tự push.
Người chủ bucket chạy `node tools/media-push.mjs --only evidence/ --dry-run` xem trước rồi mới push.

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
