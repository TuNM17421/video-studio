# Vai QA — soát một video trước khi báo xong

Đọc `SKILL.md` rồi file này. Không cần đọc `script-craft.md` hay `visual-assets.md` trọn vẹn; tra
`failure-modes.md` theo triệu chứng.

QA ở đây là **soát bằng máy trước, bằng mắt sau**. Ba vòng nhìn ảnh đã từng bỏ lọt hai lỗi chồng chữ
(retro E2) vì brief đưa contact sheet thay vì frame thật.

## 1. Thứ tự

1. `node tools/qa.mjs --video <id>` — một lệnh chạy hết chuỗi máy đo được (xem §6).
2. Mở `projects/<id>/qa/REPORT.md` và **đúng các ảnh nó liệt kê**, mở TỪNG cái ra nhìn.
3. `node tools/scene-gate.mjs --video <id> [--jobs qa/jobs.json]` — build → verify (→ shoot) trong
   MỘT lệnh, dừng ở stage đỏ đầu tiên. Dùng cái này khi đang lặp trên một scene (n5-05, 17/09:
   build 7× · verify 7× · shoot 6× thành ba lượt agent riêng; gộp lại cắt 3:1). Phải kết thúc bằng
   "all checks passed".
4. Nghe **toàn bộ audio thật** một lượt bằng tai — bước duy nhất bắt được lỗi tốc độ đọc tiếng Anh
   và phát âm sai theo ngữ cảnh câu (FM-17). Không check tự động nào thay được.

## 2. Contact sheet không dùng để soát chữ

47 frame gom vào một ảnh 2800px thì mỗi frame còn ~460px và chữ 20px còn ~4,8px — ba vòng nhìn cũng
không thấy (FM-25). Contact sheet chỉ để nhìn **bố cục tổng và nhịp**. Brief nào đòi soát chữ trên
contact sheet là brief sai, sửa brief chứ đừng nhìn kỹ hơn.

## 3. Cái `verify` KHÔNG thấy

- Các check bố cục của `verify` đọc `<text>` **SVG**. Cảnh dựng bằng `<div>` HTML + inline style
  (dòng poster) thì chúng **không thấy gì** — phải dùng `qa-layout.mjs`.
- **Không kết luận vị trí/chồng lấn từ SSR markup.** `position:absolute` là toạ độ so với phần tử
  CHA, nên đọc markup phẳng ra là đoán, không phải đo (FM-30). Vị trí chỉ đo được trong trình duyệt.
- `verify` không đo chữ thật trong trình duyệt; nó không biết font nào được nạp.
- Gate chữ của `verify` chỉ bật khi `REQUEST.md` ghi khoảng phút bắt đầu từ 3 — chạy `text-gate.mjs`
  riêng cho mọi video.
- Danh sách gate đầy đủ + phạm vi từng gate: `video-anatomy.md` §4.

## 4. Lỗi hay lọt nhất — tra thẳng

| Triệu chứng | Mục |
|---|---|
| chữ đè chữ, chrome đè tiêu đề, so sánh mất một vế | FM-15 |
| bảng/hình nháy vì re-mount | FM-15 |
| 1–3 giây chỉ có nền và phụ đề | FM-26 |
| một sơ đồ đứng yên ≥6 cue / ~25s không có minh hoạ mới | FM-20 |
| khối đặc vẽ sau nuốt nhãn nằm dưới nó | FM-29 |
| cue thiếu hẳn scene → khung trắng tuyệt đối | FM-23 |
| `verify` báo `videos/.claude` | FM-08 (có tiêu chí bỏ qua ghi sẵn) |
| khung đỏ `marks` của Evidence khoanh sai vùng | FM-21 |
| mũi tên lệch trục với đường nối | FM-16 |
| `NaN` trong attribute | FM-13 |
| checker im lặng nói "không sao" | FM-14 — kiểm lại chính regex trước khi tin |
| gate bố cục ra hàng chục cảnh báo, cặp đầu đã sai | FM-30 — toạ độ rút từ SSR markup là đoán |
| gate báo lỗi nghe như thật nhưng đang đo nhầm trang | FM-31 — `ERR_CONNECTION_REFUSED` thành "chữ 12px" |

## 5. Nộp

- Báo cáo QA kết thúc bằng `ls -la` + `wc -l` của file/ảnh đã nộp (FM-28).
- Lỗi nào báo thì kèm **bằng chứng quan sát được**: dòng output của tool, hoặc frame full-res cắt ra.
  Exit code xanh không phải bằng chứng thị giác.
- Lỗi ngoài phạm vi được giao: ghi lại, không tự sửa.

## 6. Lệnh — QA một video là MỘT lệnh

```console
npm run serve &                      # bắt buộc: qa-layout mở trình duyệt vào cổng 8765
node tools/qa.mjs --video <id>       # 11 bước · [--no-frames] bỏ trích ảnh · [--selftest] tự kiểm
node tools/dead-frames.mjs --video <id>   # KHUNG CHẾT bằng SSR, ~30s — CHẠY TRƯỚC RENDER (F1)
node tools/qa-layout.mjs --video <id> --scenes 'c4-*'   # chỉ soát phần của mình: 2:18 → 18s
```
`qa.mjs` chạy tuần tự **text-gate → qa-layout → verify --video → audio-qa → trích frame từ MP4**
(ba bước đầu là bước **CHẶN**), rồi ghi `projects/<id>/qa/REPORT.md` kèm **tối đa 12 ảnh full-res**
ở các mốc nhấn và đầu chương. Exit: `0` mọi bước chặn xanh · `1` có bước chặn đỏ · `2` sai tham số.

**Cách đọc kết quả:** mở `REPORT.md`, rồi mở **đúng ≤12 ảnh nó liệt kê** — đó là gói ảnh của owner.
Đừng mở 60 ảnh QA, và đừng gộp contact sheet để soát chữ (FM-25). Trần 12 ảnh là cố ý: video 16
chương thì riêng đầu chương đã vượt 12, "ưu tiên nhưng không cắt" làm trần thành vô nghĩa.

Chạy lẻ từng bước khi đang lặp trên một lỗi:
```console
node tools/text-gate.mjs <vdir>/cues.js   # --all · --human [--all|--fixture] · --connector-report · --selftest
node tools/qa-layout.mjs --video <id>     # [--frames a,b,c] [--per-cue 3] [--no-dead] [--json]
node tools/verify.mjs --video <id>        # exit code theo đúng video này; video khác → cảnh báo
node tools/audio-qa.mjs --video <id>      # [--dir <thư mục>] [--json] — clipping · LUFS · lặng · cắt cụt
```
`qa-layout` là **opt-in**: cần `<vdir>/qa-layout.json` → `{ "enabled": true, "note": … }`. Nó thoát
**exit 2** khi không với tới server — đó là "chưa đo được", KHÔNG phải "không có lỗi" (FM-31).

Tám phép đo: `CHỮ ĐÈ CHỮ` · `CHE` · `MÉP` · `NHỎ` · **`TRÀN HỘP`** · **`CHỮ RỘNG HƠN HỘP`** ·
**`KHUNG RỖNG`** · `KHUNG CHẾT`. Biết rõ ranh giới của mấy phép hay bị hiểu nhầm:
- **`CHỮ RỘNG HƠN HỘP`** (22/09/2026) hỏi cái hộp nền ngay dưới TÂM dòng chữ có đủ rộng không.
  Khác `TRÀN HỘP`: chữ căn giữa mà tràn đều hai bên thì hai đầu vẫn là nền, phép kia không thấy.
  Nó BỎ QUA nền nhạt hơn alpha 0,25 — mặt thẻ vẽ bằng `alpha(…, 0,06)` là không có hộp nào để so,
  và cách sửa đúng là cho thẻ một nền đặc chứ không phải hạ ngưỡng.
- **`KHUNG RỖNG`** (22/09/2026): cảnh không vẽ ra phần tử nào ⇒ LỖI, không phải "không có gì để
  báo". Ca thật: một cảnh crash giữa render, `#root` rỗng, và mọi phép đo khác báo 0 lỗi — xanh
  giả. Cùng họ FM-31. `verify` cũng có bản SSR của phép này trên MỌI frame mẫu.
- **`shoot.mjs` không ghi ảnh khi trang crash/rỗng** và xoá luôn file cũ cùng tên: ảnh 8 KB trắng
  trơn từng được coi là ảnh thật suốt một vòng QA.
- **`dead-frames.mjs`** đo KHUNG CHẾT bằng SSR (2 fps, băm markup, bỏ thanh phụ đề) — vài chục giây
  thay vì một lượt render 11 phút. Dùng nó TRƯỚC khi render (bài học F1).
- **`CHE` chỉ bắt chữ NẰM DƯỚI một vật thể.** Chữ vẽ SAU (nằm TRÊN vật thể) thì `elementFromPoint`
  trả về chính nó và vòng lặp bỏ qua — nên một dòng chữ cưỡi lên mép một panel đi lọt. Đó là lý do
  có `TRÀN HỘP` (thêm 22/09/2026): nó hỏi ngay DƯỚI hai đầu dòng chữ là mảng nào, hai đầu khác nhau
  thì dòng chữ đang vắt qua một cái mép. Ca thật: `d05-v06` `c3-sai-kieu-nao`, ba vòng QA xanh.
- **`CHE`/`TRÀN HỘP` đọc node `<text>` trong DOM, không quan tâm `fill` trong suốt bao nhiêu.** Hạ
  alpha về 0 để "giấu" một dòng chữ thì gate vẫn báo — muốn giấu thì phải BỎ node khỏi cây.

## Chạy stage nào ra file nào (chuyển từ `video-anatomy.md` §3, 21/09/2026)

`stage:render` tự chọn `voice-sfx.wav` nếu **mới hơn** `voice.wav`, và **exit 2** nếu giọng đổi sau
lần trộn SFX (trộn lại rồi render). File giao đi mặc định luôn là `render/<id>.mp4`.

`verify` **không cờ** gate cả DS + 11 video (~23s) — để dành lúc bàn giao cả repo. Làm một video thì
luôn `--video <id>`: 22,8s → 0,86s, exit code theo đúng video đó, lỗi video khác chỉ là cảnh báo
(hết cảnh "đỏ cũ / đỏ mới"). `npm run verify -- --video <id>` tương đương.

## Bảng gate của `verify` — tra khi cần biết gate nào chặn, gate nào chỉ cảnh báo

(chuyển từ `video-anatomy.md` §4 ngày 21/09/2026 để vai scene không phải nạp một bảng TRA vào đường
đọc bắt buộc; nội dung không đổi một dòng.)

| Gate | Phạm vi | Ghi chú |
|---|---|---|
| `dist/vk.js` đã dựng | toàn DS | thiếu thì mọi card trắng trang |
| marker `@dsCard` dòng 1 | mọi `*.html` có `@dsCard` | card 700px phải ≤ 400px cao |
| **`off-palette`** | **mọi `.js`/`.jsx` trong cây DS**, kể cả comment | PALETTE = 9 màu gốc + mọi hex khai trong `lib/tokens.js`. Thêm màu = khai vào `tokens.js`, đừng rải hex. |
| `non-deterministic call` | `components/`, `ui_kits/` | chỉ bắt `Math.random` và `Date.now(` — kể cả trong comment |
| caption ≤78 ký tự, liền mạch 0 → `duration`, và khớp lời của chính cue | mỗi video | sinh từ `cues.js` bằng `lib/captions.js`; ghép các trang trong `[cue.start, cue.end)` phải bằng `cue.text` |
| `meta.duration` = `end` cue cuối | mỗi video | |
| phạm vi chạy | `--video <id>` → chỉ video đó, exit theo nó | không cờ → cả DS + 11 video, ~23s |
| khoảng phút của `REQUEST.md` | chỉ khi REQUEST ghi `X–Y phút` | không ghi thì không gate |
| **nhóm gate chữ** | **mọi video** | ≥600 từ · ≥30 cue · 3 nhịp câu · connector ≥12% · ≤3 câu ngắn liên tiếp · mở đầu lặp. CHẶN khi REQUEST ≥3 phút **hoặc** đang được `--video` trỏ tới; video khác chỉ CẢNH BÁO (đã render, không được chuyển đạt→trượt vì check mới). Code: `tools/lib/text-gates.mjs` · chạy riêng: `text-gate.mjs`. |
| cue quá dài cho một hơi | mọi video | > ~9s nói. CHẶN chỉ với video được `--video` trỏ tới. |
| smoke render | mỗi video | `renderToStaticMarkup` **trên Node** mỗi frame thứ 3 + frame đầu/cuối mỗi cue. Không được throw, không được ghi `NaN`/`undefined` vào attribute. |
| chữ rộng hơn hộp · chữ đè `data-vk-occupies` · lặp tiêu đề | mỗi video | đọc `<text>` **SVG**; bố cục `<div>` HTML thì **không thấy** — dùng `qa-layout.mjs` (FM-30). |
| cảnh báo: nửa khung bỏ trống · FM-20 bố cục đứng yên ≥6 cue | mỗi video | warning, không chặn |

**Smoke render chạy trên Node** là ràng buộc nặng nhất với code cảnh: không `window`, `document`,
`localStorage`, `ResizeObserver`, RAF ở top-level hay trong first render — sẽ throw ngay.

## Cờ của `voice-pace` / `scene-pace` (chuyển từ `styles/poster.md` §2, 21/09/2026)

```console
node tools/voice-pace.mjs --estimate <cues.js>          # ước thời lượng TRƯỚC khi dựng cảnh
node tools/scene-pace.mjs --video <id> [--suggest] [--band 0.85,1.15] [--json]
```
`--suggest` in bộ `dur` đề xuất cho các cảnh ngoài dải và cảnh cần HOLD. Exit `0` xanh · `1` nhịp
hỏng · `2` sai cách gọi.
