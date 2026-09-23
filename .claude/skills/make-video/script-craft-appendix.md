# Phụ lục `script-craft` — ví dụ dài, ca cụ thể, lịch sử

KHÔNG nằm trong đường đọc bắt buộc của vai script. Mở đúng mục khi gặp đúng tình huống:

| Mục | Mở khi |
|---|---|
| A1 · Văn phong rút từ transcript thật | đang tìm giọng văn cho một video mới, chưa có mẫu |
| A2 · Liên kết giữa các video cùng một buổi | buổi học có ≥2 video |
| A3 · Probe thuật ngữ theo ngữ cảnh câu | nghi một câu sẽ bị đọc sai vì có nhiều cụm tiếng Anh |
| A4 · Ví dụ "câu sau bắt vào câu trước" | đang sửa mạch kể, cần mẫu cụ thể |
| A5 · Lịch sử: luật đã bỏ và vì sao | muốn biết một luật cũ đi đâu |

---

## A1 · Văn phong — rút từ transcript thật, không phải cảm giác

Hai kênh tham chiếu, transcript tải bằng `yt-dlp --write-auto-sub` rồi đọc trực tiếp:

**Kênh "Vui Vẻ"** — thiên cảm xúc, hợp GenZ:
- `thì` làm connector gần như mọi câu ("bà ngoại đang bị ốm **nên là** con mang cho bà...").
- Chêm bình luận cá nhân ngay giữa mạch kể: *"Ok rất logic nhưng mà..."*, *"Được quá nhỉ."*
- Gọi khán giả là "các bạn", tự xưng kênh là "chúng tôi".
- Nhịp: câu kể → câu cà khịa → câu kể tiếp. Cà khịa là chỗ giữ người xem.

**Kênh "à ra thế"** — thiên kiến thức, vẫn cuốn:
- Xưng "mình", gọi khán giả "anh em". Câu **ngắn**, ít mệnh đề phụ.
- **Số liệu cụ thể** thay tính từ: "suốt 10 năm gần đây nó chỉ được sửa tổng cộng có 20 lần",
  "mỗi ngày ông xóa khoảng 100 trang thì chúng nó đăng thêm khoảng 400 trang".
- Cấu trúc điều tra: nêu hiện tượng lạ → *"Câu hỏi của tập này thì chỉ có một thôi..."* → trả lời.
- Chuyển cảnh bằng câu dẫn không gian: *"Giờ mình đưa anh em tới một căn phòng khác."*

**Cách pha cho video bài giảng:** khung điều tra của "à ra thế" (hook → câu hỏi → trả lời bằng số
liệu/ví dụ cụ thể) + nhịp nói và filler tự nhiên của "Vui Vẻ".

---

## A2 · Liên kết giữa các video trong cùng một buổi học

Một buổi học thường ra nhiều video: một video tổng quan và nhiều video đào sâu từng module. Video từ
2026-09-16 trở đi đặt id theo `d{ngày}-v{số video trong ngày}-{slug}` (xem `AGENTS.md` §Video
workflow); video Ngày 5 cũ vẫn giữ `n5-0X-*`. Mỗi video vẫn phải đứng được một mình (hook → mạch kể →
callback riêng theo §3b), nhưng **đầu và cuối phải neo vào đúng vị trí của nó trong chuỗi**, để người
xem đi từ video này sang video kia không bị hẫng.

**Trước khi viết hook:** liệt kê toàn bộ video khác cùng buổi (`ls projects/ | grep '^d{ngày}-'` cho
video mới, hoặc `'^n{ngày}-'` cho video Ngày 5 cũ; hoặc đọc khung mục lục e-learning). Xác định: video
này là tổng quan hay module thứ mấy, video nào đứng ngay trước, video nào đứng ngay sau.

- **Video tổng quan (mở buổi):** không callback lùi (không có gì để nối vào). Hook mở thẳng bằng
  tình huống của buổi, không cần nhắc video khác.
- **Video module (không phải video đầu buổi):** câu mở phải nhắc **một chi tiết cụ thể** đã nói ở
  video/module ngay trước — không nhắc chung chung kiểu "như đã nói ở phần trước". Ví dụ đã dùng
  trong `n5-02-ai-feedback-loop` (mục "Ranh giới với N5-01" trong `kich-ban-goc.md`): "N5-01 là
  overview JTBD, PRD, persona, autonomy và risk. N5-02 chỉ đi sâu vào feedback loop..." — nhưng câu
  đó hiện chỉ nằm trong ghi chú dựng, **chưa lọt vào lời đọc**. Từ nay câu mở của video module phải
  đưa chính chi tiết đó vào lời đọc thật, ví dụ: "Ở phần trước mình đã nói tới việc viết PRD cho AI
  feature. Nhưng viết đúng PRD rồi mà AI vẫn trả lời sai thì sao? Đây là lúc mình cần nhìn vào vòng
  lặp phản hồi." Không mở bằng khối lượng kiến thức ("như đã tìm hiểu ở phần trước về...") mà mở
  bằng một câu hỏi hoặc hệ quả còn treo lại từ video trước.
- **Video không phải video cuối buổi:** câu kết phải hé lộ **nội dung cụ thể** của video kế tiếp,
  không chỉ nói "hẹn gặp lại ở phần sau". Ví dụ: "...cảm ơn các bạn đã theo dõi, ở phần tiếp theo
  mình sẽ đi từ giả thuyết này tới một MVP thực sự triển khai được." Nếu chưa biết tên/nội dung
  video kế tiếp (chưa lên kịch bản), viết câu kết đóng trọn vẹn cho chính video này, đừng bịa tên
  phần sau.
- **Video cuối buổi:** câu kết chốt cả buổi (như n5-01 hiện tại: "Hẹn gặp lại các bạn ở Ngày 6"),
  không tạo callback treo lơ lửng.
- **Không lặp câu mở/kết giữa các video cùng buổi.** Mỗi video một biến thể câu nối khác nhau —
  lặp đúng khuôn "Chào các bạn, sau khi các bạn xem module X..." ở mọi video là dấu hiệu văn công
  thức (đối chiếu bảng anti-pattern §4).
- Ghi lại quyết định liên kết (video nào nối video nào, nhắc chi tiết gì) vào mục **"Liên kết buổi
  học"** trong `kich-ban-goc.md`, cạnh mục "Ranh giới với N5-0x" đã có, để video viết sau còn tra
  lại được đã nhắc gì.

---

## A3 · Probe thuật ngữ theo ngữ cảnh câu (FM-17)

Một từ tiếng Anh đọc đúng khi probe riêng lẻ vẫn có thể bị đọc sai hoặc bị đọc nhanh bất thường khi
nằm trong một câu có nhiều cụm tiếng Anh liền nhau — feedback thật từ học viên (16/09/2026): "tốc độ
đọc tiếng Anh hơi nhanh... có những từ tiếng Anh đọc chưa chuẩn". Vì vậy:

- Nghi ngờ một thuật ngữ sẽ bị đọc sai thì **sinh thử đúng câu đó rồi transcribe lại** trước khi
  chạy cả bộ. Một lần probe rẻ hơn một lần render lại toàn video.
- Probe không dừng ở từng từ đơn lẻ — probe **nguyên câu thật** sẽ dùng trong `cues.js`, đặc biệt
  câu nào có từ 2 cụm tiếng Anh trở lên.
- Trước khi khoá lời, **nghe thử toàn bộ audio thật sau TTS** (không chỉ đọc bản text) — đây là
  bước duy nhất bắt được cả lỗi tốc độ lẫn lỗi phát âm theo ngữ cảnh, không có check tự động nào
  thay được.

Ví dụ ca thật: `go / no-go` bị đọc thành **"no gho"**, nghe như một từ tiếng Việt vô nghĩa.

---

## A4 · Ví dụ "câu sau bắt vào câu trước" (E10)

- Nối bằng chữ: "…cái máy chìm trong biển khả năng." → "**Chìm như vậy**, nên AI đời đầu…".
- Không cắt chất nói của nguồn để lấy độ gọn: "Tên nó nghe thì ghê: bùng nổ tổ hợp. Nhưng dễ hiểu
  lắm các bạn." dài hơn "Báo cáo chỉ ra đúng một cái trần: bùng nổ tổ hợp." đúng 9 âm tiết — và đó
  chính là chỗ người nghe thấy có người đang nói với mình.
- Ba nguyên nhân của bản v1 chết (retro E10): (a) viết theo **ô cảnh** — mỗi cảnh một khối kín;
  (b) ép câu ngắn để vừa một ước lượng thời lượng SAI (E1); (c) owner duyệt bằng MẮT trên bảng cue,
  không đọc to liền mạch.

---

## A5 · Lịch sử — luật đã bỏ khỏi `script-craft.md` và vì sao

| Luật cũ | Đi đâu | Lý do |
|---|---|---|
| §1b "mở một lane **Antigravity** read-only làm research" | §1b còn, bỏ tên provider | `n5-02/script-lane-output-v2.md:4`: Antigravity bị automatic approval review **chặn payload repo**. Provider + fallback do `SKILL.md` quyết. |
| §2 "không dùng 'chúng ta sẽ cùng tìm hiểu' quá 1 lần/video" | BỎ | Quét 11 video: **0 lần xuất hiện**. Luật chết. |
| §3f bảng probe `[sigh]` / `[laughter]` / `instruct=whisper` / `num_step` | `voice-kaggle.md` | Kết quả kỹ thuật TTS, không phải luật viết lời. |
| §5 Mascot pose/emotion (5,4 KB) | `visual-assets.md` | Luật HÌNH. Lane viết văn xuôi không cần. |
| §3g CodeBlock/JsonView/LogCard | `visual-assets.md` | Luật HÌNH. |
| §5b + `## Sections` + `## Bảng cue` (format parse markdown) | BỎ khỏi tài liệu | `tools/cues-from-markdown.mjs` **0 lượt chạy** trong cả 8 `projects/*/.studio/runs.jsonl`. Format vẫn còn trong comment đầu chính file tool. |
| §3f ba đoạn văn "filler / cụm đệm / cảm xúc trong chữ" | rút còn một đoạn + `text-gate --human` | Ngưỡng do tool in ra; tài liệu không chép số. |
| §6 checklist các dòng đã có gate máy | BỎ khỏi checklist tay | Nhịp câu, ≤2 cụm Anh, lặp cấu trúc — `text-gate` đã đếm. |

**Đã đo, quyết định KHÔNG làm:** không xây linter sáo ngữ. Quét 39 cụm sáo ngữ tiếng Việt trên cả 11
video: tổng **19 hit / 11 video ≈ 1,7 mỗi video**, cao nhất "giúp bạn"×4. "Văn AI" ở harness này đến
từ **cấu trúc** (cue mồ côi, thiếu phản ứng cá nhân, cue hình liệt kê), không từ từ vựng — đo
21/09/2026.

## A6 · Số đo đằng sau E22 — vì sao `pauseAfter` không dùng để khai nhịp

(chuyển từ `script-craft.md` §3f ngày 21/09/2026 để vai script về dưới trần byte; luật không đổi.)

`pauseAfter` là số giây lặng **chèn thêm**, còn `assemble()` giữ lại ≤50 ms đầu và ≤80 ms đuôi của
mỗi clip. Đo trên video demo:

| khai `pauseAfter` | khe THẬT nghe được |
|---|---|
| `0` | 0,16–0,18 s |
| `0.5` | 0,67 s |
| `1.0` | 1,17 s |

Ba **bậc nhảy**, không phải một thang theo nghĩa của câu. Thí nghiệm nghe mù 21/09/2026 cho thấy
nhịp khai kiểu đó đặt ngược chỗ: khe dài nhất rơi giữa phần giải thích, khe ngắn nhất rơi ngay
trước câu chốt — tức người khai đang chọn số, không chọn nghĩa.

Vì vậy `tools/lib/voice-gaps.mjs` khai theo LOẠI khe với khoảng đích tính bằng **giây thực nghe
thấy**, và `voice-import.mjs --gaps --gaps-report <f.md>` tính ngược ra `pauseAfter`. Đã kiểm:
không bật `--gaps` thì `voice.wav` ra sha256 giống hệt đường cũ.

## A7 · Lane research — bốn thứ nó phải trả về (chuyển từ `script-craft.md` §1b, 22/09/2026)

Trước khi viết một chữ narration nào, chạy một lane research **read-only**, tách hẳn khỏi lane viết
lời. Provider cụ thể và fallback khi bị chặn payload: `SKILL.md`. Lane research trả về **không phải
narration** mà là bốn thứ:
1. Tóm tắt từng mục trong bảng ánh xạ `e-learning ↔ slide` (§1): ý chính, số liệu, câu chốt nguyên
   văn của giảng viên.
2. Chỗ trùng / chỗ callback được so với video khác cùng buổi (`kich-ban-goc.md`, `source-brief.md`).
3. Case cần trích nguồn ngoài: có ảnh/trang thật để làm `Evidence` không — URL, hoặc "không tìm
   được" (`visual-assets.md` §2, FM-22). Đừng để dồn tới lúc dựng scene mới phát hiện thiếu.
4. Ví dụ slide mô tả chung chung: một case **có thật, định danh được** (tên công ty, sản phẩm, số
   liệu, năm) — hoặc "đã tìm và không ra case thật phù hợp". Không bỏ qua bước tìm.

Lane viết lời dùng kết quả này làm input, không đọc lại nguồn từ đầu.

## A8 · Thuật ngữ tiếng Anh — bảng đầy đủ (chuyển từ `script-craft.md` §3d, 22/09/2026)

TTS tiếng Việt đọc chữ tiếng Anh theo âm tiếng Việt, nên thuật ngữ ngắn dễ ra sai nghĩa.

**Luật:** thuật ngữ nào chưa quen tai người Việt thì **để trên hình, và nói bằng tiếng Việt**.

| Trên hình (visual) | Trong lời đọc (text) |
|---|---|
| `Go / No-go` | "đưa lên quyết định làm tiếp hay dừng" |
| `p95` | "ở p95" (giữ được, đọc "pê chín lăm" nghe vẫn ổn) |
| `PRD`, `north star`, `edge case`, `escalate` | giữ nguyên — đã quen tai trong ngành |

- **Không rải quá 2 cụm tiếng Anh trong cùng một câu**; cụm thứ ba tách sang câu khác hoặc Việt hoá.
- **Mọi từ tiếng Anh và tên riêng phải có phương án dự phòng** trong danh sách phát âm trước khi
  sinh giọng. Không có dự phòng thì đừng đưa từ đó vào lời (E6).
- **Tên riêng khó đọc thì để CHỮ TRÊN HÌNH nói.** `Bard` hỏng 3 lượt sinh; bản v2 viết "Google tung
  ra chatbot của riêng mình" và để pill `Bard` trên hình tự xưng tên. Mất 0 thông tin.
- **Chuỗi đếm / chuỗi tên riêng: mỗi phần tử một cue, tối đa 2 phần tử mỗi cue** — OmniVoice nuốt
  nguyên mệnh đề ở đúng hai chỗ đó (FM-27).
- **Số viết bằng chữ**, đừng viết chữ số trần trong `text`: "sáu mươi tám" bị nén thành "sáu tám";
  `d2-01-lab-v2` đã phải vá tay `{"Module 1": "Mô-đun một"}`. Nếu sự thật vẫn đúng, đổi sang cách
  nói không có chuỗi số ("hơn hai tháng").
- Nghi một câu sẽ bị đọc sai → probe nguyên câu đó, xem `script-craft-appendix.md` A3.

## A9 · Checklist trước khi chốt lời (chuyển từ `script-craft.md` §6, 22/09/2026)

Chỉ còn những dòng **máy không kiểm được**. Nhịp câu, ≤2 cụm tiếng Anh, lặp cấu trúc, cue quá dài,
các chỉ số "tính người" — `text-gate` đã đếm, đừng soát tay lần nữa.

- [ ] Lane research đã chạy trước và tách khỏi lane viết lời (§1b)?
- [ ] Đã đọc hết slide gốc? Cấu trúc kịch bản khớp khung e-learning, có bảng ánh xạ trong
      `kich-ban-goc.md`?
- [ ] **Fact-check xong**, kể cả những khẳng định lấy từ nguồn của sếp (§1, E9)?
- [ ] Có một tình huống xuyên suốt và callback ở kết bài?
- [ ] Đã xác định vị trí video trong buổi; câu mở/kết neo đúng, không bịa tên phần sau (phụ lục A2)?
- [ ] Mỗi thuật ngữ không phổ thông lần đầu xuất hiện có một câu định nghĩa bằng lời thường (§3e)?
- [ ] Với mỗi khái niệm mới: đã nêu đủ ai gặp vấn đề, hậu quả, vì sao cách thường không đủ — **trước
      khi** nhắc tên giải pháp (§3e)?
- [ ] Có ít nhất 3 con số/dữ kiện cụ thể thay cho tính từ chung chung?
- [ ] **Đọc to cả kịch bản một lượt** — chỗ nào ngượng miệng là chỗ phải sửa. Phép thử xoá-một-câu
      đã chạy (§3g)?
- [ ] MỌI từ tiếng Anh / tên riêng đều có phương án dự phòng phát âm (§3d)?
- [ ] Không còn dấu `(nghỉ…)` nào trong `text` (§3f)?
- [ ] `node tools/text-gate.mjs` đã chạy trên bản nháp và output thật đã dán vào bản nộp?

**Chốt lời xong mới được chạy TTS.** Đổi một chữ sau khi đã sinh giọng là phải chạy lại cả chuỗi
giọng → timing → build → render.

**Sau khi có TTS, trước khi coi video là xong:** nghe **toàn bộ audio thật** một lượt bằng tai —
bước duy nhất bắt được lỗi tốc độ đọc tiếng Anh và phát âm sai theo ngữ cảnh câu (FM-17).

## A10 · Nguồn sự thật — hai nguồn, hai vai trò (chuyển từ `script-craft.md` §1, 22/09/2026)

Đây **không** phải bảng xếp hạng. Mỗi nguồn quyết định một thứ khác nhau:

| Nguồn | Quyết định | KHÔNG quyết định |
|---|---|---|
| **Trang e-learning / LMS** của buổi | **Cách chia bài**: có mấy phần, tên phần, thứ tự, đâu là lab | Nội dung chi tiết trong từng phần |
| **Slide gốc của giảng viên** (`.pdf`, `.pptx`) | **Nội dung**: định nghĩa, ví dụ, số liệu, bảng đối chiếu, câu chốt của thầy | Cách chia phần cho video |
| Tóm tắt người khác viết, blog, ghi chú | Không gì cả — chỉ tham khảo | — |

**Cách làm đúng:** lấy khung mục lục từ e-learning, rồi **đổ nội dung slide vào từng mục**. Một mục
của e-learning thường gom nội dung từ nhiều trang slide rải rác — bình thường, không phải mâu thuẫn.

**Bắt buộc:** lập **bảng ánh xạ `mục e-learning ↔ trang slide`** đặt ngay trong
`projects/<id>/kich-ban-goc.md`. Mục nào không tìm được trang slide tương ứng thì ghi rõ "không có
trong slide", đừng bịa nội dung cho đủ khung. Ghi cả hai nguồn kèm ngày đọc vào đầu file.

**Fact-check là mục bắt buộc, kể cả khi nguồn là lời của sếp** (E9: "cả ngành hội tụ về trục
Transformer" — sai; "mùa đông AI thứ nhất ~10 năm" — thật ra 1974–1980). Không có cách máy nào bắt
được lớp lỗi này.
