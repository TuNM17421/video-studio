# Failure modes — runbook tự sửa sai

> Mỗi mục dưới đây là một lỗi **đã xảy ra thật** trong lúc dựng video, kèm cách phát hiện và cách
> sửa đã kiểm chứng. Gặp triệu chứng lạ → tra bảng này trước khi tự chế cách vòng qua.
>
> Luật chung: **triệu chứng phải đo được mới được kết luận nguyên nhân.** Không "chắc là do..."
> rồi sửa mò. Đo xong ghi thêm một mục mới vào file này.

## Bảng chỉ mục — tra theo TRIỆU CHỨNG, đừng đọc cả file

Vai: **O** owner/orchestrator · **S** script · **V** voice · **C** scene · **Q** QA.
Cột cuối = đã có check máy chưa. "—" nghĩa là hiện chỉ có luật chữ, người phải tự nhớ.

| FM | Triệu chứng quan sát được | Vai | Check máy |
|---|---|---|---|
| 01 | Quy trình chạy đúng, video ra đúng cỡ — nhưng nội dung không phải bài của buổi đó | S O | — (bảng ánh xạ e-learning↔slide, làm tay) |
| 02 | Mỗi câu có tiếng "a" lạ ở đầu — **và** bản sửa cũ `voice-fix-onset.mjs` đã cắt mất từ đầu của 30/39 clip | V | — (luật: KHÔNG chạy tool đó) |
| 03 | Một câu bị đọc cụt, ngắn bất thường so với các câu khác | V | `voice-import --scan` + Whisper align |
| 04 | Kaggle báo `CUDA error: no kernel image is available` | V | — |
| 05 | `kaggle kernels push` trả `400 Bad Request` | V | — |
| 06 | Headless Chrome thoát ngay khi render trong agent lane | C Q | — |
| 07 | Hoạt ảnh lệch lời, mốc từng từ biến mất | C | `voice-timing.mjs --write-cues` |
| 08 | `verify` báo lỗi ở `videos/.claude` | C Q | `verify` (tiêu chí bỏ qua ghi sẵn trong mục) |
| 09 | Chẻ cue theo từng câu làm các ý rời nhau, đọc lên rời rạc | S | `text-gate` (connector ≥12%) |
| 10 | Cue dài 10–12 giây → hụt hơi, caption cắt giữa từ ghép, nhịp gấp | S | `text-gate` (cue > 9s) |
| 11 | `verify` báo `non-deterministic call` dù code không hề random | C | `verify` (quét cả comment) |
| 12 | OmniVoice nuốt mất mấy chữ đầu câu khi `speed` > 1.0 | V | — (luật: sinh ở `--speed 1.0`) |
| 13 | `NaN` chui vào attribute khi gọi sai tên tham số `@remotion/shapes` | C | `verify` smoke render |
| 14 | Checker im lặng nói "không sao" vì regex của chính nó trượt | O C Q | `text-gate --selftest` |
| 15 | Thanh/chrome đè title; so sánh mất một vế; bảng nháy vì re-mount | C Q | `qa-layout` (một phần) |
| 16 | Mũi tên lệch trục với đường nối | C Q | — |
| 17 | Học viên không hiểu thuật ngữ; tiếng Anh đọc nhanh/sai; thiếu problem framing | S V | — (nghe bằng tai + `script-craft.md` §3e) |
| 18 | `verify` báo chữ tràn hộp giả bên trong `Evidence` | C | `verify` |
| 19 | `pronounce.json` không có tác dụng gì trên nhánh OmniVoice/Kaggle | V | — (phải truyền `--pronounce`) |
| 20 | Một sơ đồ đứng yên hàng chục giây, không có minh hoạ bổ trợ nào | C | `verify` (cảnh báo) |
| 21 | Khung đỏ `marks` của `Evidence` khoanh sai vùng, đè lên chữ/hộp khác | C Q | — |
| 22 | Dùng card "đang tìm nguồn" thay ảnh chụp thật trong khi nguồn tìm được | S C | — |
| 23 | Cue thiếu hẳn scene → khung trắng tuyệt đối | C | `verify` |
| 25 | Contact sheet thu nhỏ giấu lỗi chồng chữ — ba vòng QA bằng mắt không thấy | O Q | `qa-layout` + frame full-res từ MP4 |
| 26 | Khung chết: 1–3 giây chỉ có nền và phụ đề | C Q | `qa-layout` (ngưỡng 1,2% / 1,0s) |
| 27 | OmniVoice nuốt nguyên mệnh đề ở chuỗi đếm và chuỗi tên riêng | S V | — (mỗi phần tử một cue; đã dựng cảnh rồi thì `voice-subclip.mjs`) |
| 28 | Lane báo "đã ghi file" nhưng file không tồn tại | O | — (`ls -la` + `wc -l` cuối mọi báo cáo) |
| 29 | Khối đặc vẽ sau nuốt nhãn nằm dưới nó — lỗi "thiếu hẳn", khó thấy hơn "đặt sai chỗ" | C Q | — |
| 30 | Gate bố cục ra hàng chục cảnh báo chồng lấn, kiểm tay cặp đầu tiên đã thấy sai | C Q | `qa-layout` (đo trong trình duyệt) |
| 31 | Gate báo lỗi nghe rất thật (`ERR_CONNECTION_REFUSED 12px`…) trong khi nó đang đo nhầm trang | O C Q | `qa-layout` preflight + kiểm `#root` |
| 32 | Sức ép của một gate đẩy người sửa tới chỗ **đổi nghĩa** chữ trên hình, không phải rút gọn | O C | `storyboard-gate` G1 (thấy chuỗi, **không** thấy nghĩa) |
| 33 | Check có điều kiện bỏ qua viết cho một ca lại im lặng nuốt cả một lớp lỗi khác | C Q | `qa-layout` check `NHỎ KÉO DÀI` |
| 34 | Kernel chết ngay lúc nạp model ONNX: `External data path escapes model directory` | V | — (luật: `snapshot_download(local_dir_use_symlinks=False)`) |
| 35 | B-roll tràn ra ngoài khung slot, che cả thanh phụ đề — tool không báo gì | C | — (luật: `fadeAndScale` bắt buộc `w/h`) |
| 36 | Trang clip Pexels đứng ở "Performing security verification" và không bao giờ xong | C O | — (luật: đổi sang Pixabay/Coverr, đừng retry) |
| 37 | Hai chữ ĐÈ nhau suốt mấy giây mà `qa-layout` im lặng vì một bên đang mờ | C Q | `qa-layout` `CHỮ ĐÈ CHỮ MỜ` (`FAINT_MIN`) |
| 39 | API ảnh trả 0 kết quả cho một truy vấn nghe rất đúng, tool im lặng | C S | `image-search` in SỐ kết quả từng truy vấn |

---

## FM-01 · Dựng đúng quy trình nhưng sai nội dung bài

**Triệu chứng:** video build/verify/render đều pass, giọng đọc trôi chảy, nhưng nội dung không khớp
buổi học thật (sai tên phần, sai số phần, thiếu chủ đề chính).

**Ca thật (13/09/2026):** kịch bản Ngày 5 dựng theo trang e-learning (4 module: giả thuyết→MVP, PRD,
kỳ vọng, tự chủ). Slide gốc của giảng viên thật ra là *AI Product Thinking & Requirements* với **8
phần** (product thinking, responsible AI, user research, requirements engineering, PRD anatomy, user
stories, risk register, lab). Video ra hoàn chỉnh nhưng dạy sai bài.

**Phát hiện:** trước khi viết cues, đặt mục lục e-learning cạnh mục lục slide. Nếu **nội dung** của
video không truy ngược được về trang slide nào ⇒ đang viết từ nguồn sai.

**Sửa:** giữ **cách chia phần theo e-learning**, nhưng **đổ nội dung từ slide gốc** vào từng phần,
và lập bảng ánh xạ `mục ↔ trang slide` trong `kich-ban-goc.md`. Luật đầy đủ:
`.claude/skills/make-video/script-craft.md` §1.

**Đính chính (13/09/2026, sau phản hồi của chủ repo):** bản đầu của FM-01 kết luận sai rằng slide
"thắng" e-learning về cấu trúc và phải dừng lại khi hai bên lệch. Thực tế hai nguồn **không tranh
nhau**: e-learning định cách chia, slide định nội dung. Lỗi thật của lần dựng hỏng là **lấy cả nội
dung từ trang tóm tắt** thay vì từ slide, chứ không phải chuyện chọn khung 4 hay 8 phần.

---

## FM-02 · ⚠️ CẢNH BÁO: đừng cắt đầu file audio. Bản sửa cũ ĐÃ LÀM MẤT TỪ

> Mục này từng ghi ngược lại và gây hỏng thật. Giữ nguyên phần sai ở dưới để không ai lặp lại.

**Triệu chứng ban đầu:** nghe bản ghép, tưởng đầu mỗi câu có một tiếng "a" vô nghĩa.

**Kết luận SAI (13/09/2026):** cho rằng OmniVoice sinh burst artifact ~100-300ms ở đầu mỗi câu, vì
đo RMS 20ms thấy pattern `burst → dip → lời`. Đã viết `tools/voice-fix-onset.mjs` cắt tới điểm dip và
bắt nó thành bước **bắt buộc** của luồng Kaggle.

**Vì sao sai:** cái gọi là "burst" chính là **từ đầu tiên của câu**, còn "dip" là **khoảng nghỉ tự
nhiên giữa từ một và từ hai**. Ví dụ đo được ở câu 16 (`"Requirement mơ hồ thì nghe..."`), RMS mỗi 20ms:

```
0 0 0 0 0 | .028 .069 .135 .173 .198 .242 .292 .259 .278 .26 .26 .306 .195 | .064 | .161 .158 ...
            └──────────── chữ "Requirement" đang được đọc ────────────┘   └nghỉ┘  └ "mơ" ...
```

Tool cắt 360ms ⇒ **nuốt trọn chữ "Requirement"**. 30/39 câu bị mất từ đầu. Chủ repo phát hiện khi
nghe, không phải do test bắt được.

**Vì sao lọt:** chỉ đo waveform rồi suy ra ý nghĩa, **không hề kiểm lại nội dung audio sau khi cắt**.
Một lần transcribe bản đã cắt là đủ để thấy mất từ.

**Luật rút ra:**
1. **Không cắt mù theo biên độ.** "Có một khoảng trũng" không chứng minh được phần trước nó là rác.
2. Muốn khẳng định một đoạn audio là artifact thì phải **transcribe rồi so với lời gốc**, không suy
   từ RMS. Whisper đã có sẵn: `npm run setup:voice`, rồi `voice-import.mjs` **không** kèm `--no-align`
   sẽ tự đối chiếu và chặn câu lệch.
3. Khoảng lặng đầu file là **vô hại** cho render (`voice-timing.mjs` canh theo độ dài thật).
   Đừng sửa thứ không gây hỏng.

**Hiện trạng:** `tools/voice-fix-onset.mjs` KHÔNG được chạy trong luồng chuẩn nữa. Nếu về sau thật sự
chứng minh được có artifact (bằng transcript, không phải bằng RMS), thì viết lại tool có bước ASR
xác minh trước khi cắt.

---

## FM-03 · Một câu bị đọc cụt, ngắn bất thường

**Triệu chứng:** `voice-import.mjs` báo `! <id> ... ngắn bất thường (2,1s so với ~7,3s)`.

**Ca thật:** câu 11 (18 từ) chỉ ra 2.1s — model cắt giữa chừng. Sinh lại lần 2 ra 4.08s, dùng được.

**Phát hiện:** so độ dài audio với ước lượng `số từ × 0.18s` (ở speed 1.5). Dưới ngưỡng ⇒ nghi cụt.

**Sửa:** sinh lại **chỉ câu đó**, tối đa 3 lần, lấy bản dài nhất. `tools/voice-kaggle.mjs` đã nhúng
sẵn vòng retry này trong `run.py` — không cần làm tay nữa.

**Cập nhật (17/09/2026) — Whisper content verification:** kernel Kaggle hiện giờ tự kiểm nội dung bằng
Whisper (`faster-whisper`, `small` model, CPU int8) **ngay trong kernel**, không chỉ kiểm độ dài. Mỗi
attempt so khớp audio sinh ra với lời gốc bằng `difflib.SequenceMatcher()` (tính độ khớp 0-1), rồi retry
tối đa 5 lần (tăng từ 3 cũ) cho tới khi đạt cả hai điều kiện: (1) độ dài ≥ `expected_min`, (2) khớp
≥ 0.7. Giảm đáng kể nhu cầu push **kernel riêng** từ ~2-3 lần/video xuống ~0-1 lần, vì một câu bị đọc
cụt/sai nay retry tự động sẵn trong kernel chính — chỉ khi thật sự không đạt sau 5 lần mới cần retry thủ
công (hiếm).

**Đừng nhầm:** cảnh báo "ngắn bất thường" cũng nổ khi ước lượng thời lượng trong `kich-ban-goc.md`
viết quá rộng tay. Nghe thử file trước khi kết luận là model lỗi. Khi kernel báo `match < 0.7`, cảnh báo
đó có ý nghĩa thật — không phải lỗi ước lượng, mà là content bị đọc sai (Whisper giúp phát hiện chắc
chắn hơn so với độ dài đơn thuần).

---

## FM-04 · Kaggle báo `CUDA error: no kernel image is available`

**Nguyên nhân:** `enable_gpu: true` trong `kernel-metadata.json` **không** chọn loại GPU. Kaggle gán
mặc định Tesla **P100** (compute capability sm_60); PyTorch bản mới chỉ hỗ trợ sm_70 trở lên.

**Sửa:** luôn push kèm accelerator chỉ định rõ:
```bash
kaggle kernels push -p . --accelerator NvidiaTeslaT4
```
Giá trị hợp lệ khác: `NvidiaTeslaP100`, `NvidiaTeslaT4Highmem`, `NvidiaL4`, `NvidiaTeslaA100`.

---

## FM-05 · `kaggle kernels push` trả `400 Bad Request`

**Nguyên nhân đã quan sát:** file script quá lớn. Push thành công ở ~675-780 KB, thất bại ở ~1.07 MB
(do nhúng `ref_audio` base64 dài hơn).

**Sửa (theo thứ tự ưu tiên):**
1. Rút ngắn `ref_audio` còn ~10-12s (đủ cho voice cloning, base64 xuống ~670 KB).
2. Tách thành nhiều lần chạy nhỏ thay vì nhồi mọi biến thể vào một script.

**Không làm:** đừng upload `ref_audio` thành Kaggle Dataset công khai để né giới hạn — giọng người
thật đưa lên nền tảng thứ ba là chuyện khác hẳn về quyền, phải hỏi chủ giọng trước.

---

## FM-06 · Headless Chrome thoát ngay khi render trong agent lane

**Triệu chứng:** `tools/shoot.mjs` / `tools/render.mjs` báo `Chrome exited early (21)`, log có
`process_singleton_posix.cc ... Failed to create socket directory`.

**Nguyên nhân:** Chrome tạo socket khoá tiến trình ở thư mục temp **thật của macOS**
(`getconf DARWIN_USER_TEMP_DIR`), không đọc `$TMPDIR`. Sandbox của một số agent lane chặn ghi vào
đó ⇒ không cờ nào redirect được.

**Sửa:** chạy `render.mjs`/`shoot.mjs` ở phiên **không bị sandbox chặn** (terminal thường, hoặc
phiên agent chính). Đã kiểm chứng: cùng lệnh, cùng repo, chạy ngoài lane thì render 6300 frame /
210s bình thường.

**Đừng:** đừng thử nới sandbox bằng cờ nguy hiểm để ép qua. Báo lại và đổi chỗ chạy.

---

## FM-07 · Mất mốc từng từ, hoạt ảnh lệch lời

**Triệu chứng:** `voice-import.mjs` in `! --no-align: không có mốc từng từ`, và `voice.js` báo
`0 câu có mốc từng từ`. Hệ quả: `spokenAt(n, 'cụm từ')` trong scene không còn trỏ đúng lúc cụm từ
được đọc — hoạt ảnh chạy theo độ dài câu chứ không theo lời.

**Sửa:** cài môi trường align một lần rồi bỏ `--no-align`:
```bash
npm run setup:voice    # tạo voice/.venv + tải Whisper small (~460 MB)
```
Chỉ chấp nhận `--no-align` cho bản nháp; bản giao cho học viên phải có mốc từng từ.

---

## FM-08 · `verify` báo lỗi `videos/.claude`

**Triệu chứng:** `npm run verify` liệt kê 6 lỗi kiểu `videos/.claude is missing video.jsx`.

**Bản chất:** `vinuni-lesson-video-ds/ui_kits/lesson-video/videos/.claude/.cc-writes` là thư mục
**rỗng** do harness của Claude Code tự tạo khi agent ghi file trong repo. `verify` coi mọi thư mục
con của `videos/` là một video nên đòi đủ `video.jsx`, `cues.js`, `card.html`, `player.html`,
`STORYBOARD.md`.

**Phát hiện — phải đủ cả hai điều kiện mới được coi là rác:**
```bash
find vinuni-lesson-video-ds/ui_kits/lesson-video/videos/.claude -type f   # phải rỗng
git ls-files vinuni-lesson-video-ds/ui_kits/lesson-video/videos/.claude   # phải rỗng (không track)
```

**Sửa (đã kiểm chứng 13/09/2026):**
```bash
rm -rf vinuni-lesson-video-ds/ui_kits/lesson-video/videos/.claude
npm run verify    # → "all checks passed"
```

**Đừng:** đừng tạo file giả trong `.claude/` để dỗ verify. Và nếu thư mục **có** file thật thì đó là
video đang dở của người khác — không phải rác, không được xoá.

---

## FM-09 · Chẻ cue theo câu làm mất liên kết giữa các ý

**Triệu chứng:** đọc lên nghe rời rạc, như đọc gạch đầu dòng, các câu không dính vào nhau.

**Bối cảnh:** để sửa FM-10 (cue quá dài), 20 cue bị chẻ thành 39 cue ngắn. Nhịp thở tốt lên thật,
nhưng mỗi cue lại bắt đầu "từ đầu" nên mạch nói đứt.

**Sửa:** cue ngắn vẫn giữ, nhưng **mỗi cue phải mở bằng một từ nối bắt vào cue trước**:
`Và`, `Mà`, `Còn`, `Nên`, `Thế nên`, `Cho nên`, `Rồi`, `Xong rồi`, `Nói tới chuyện đó thì`,
`Chốt xong mấy thứ đó rồi thì`, `Tất cả những thứ nãy giờ`.

Kiểm nhanh: đọc to hai cue liền nhau. Nếu nghe như hai câu của hai người khác nhau thì chưa đạt.

**Đừng đổi hướng ngược lại** (gộp cue dài trở lại) — cái đó đẻ ra FM-10.

---

## FM-10 · Cue dài 10-12 giây kéo theo ba lỗi cùng lúc

**Triệu chứng:** giọng đọc hụt hơi và đều đều; caption ngắt giữa từ ghép; scene có quãng dài không
còn gì chuyển động.

**Nguyên nhân chung:** một cue quá dài thì (a) TTS đọc liền một hơi không có chỗ thở, (b) caption
phải chẻ thành 4-5 trang nên buộc phải ngắt ở chỗ vô nghĩa, (c) một scene phải gánh 12 giây nội dung.

**Sửa:** cue ≤ 25 từ (≈ 5-7 giây). Đặt `pauseAfter` biến thiên thay vì để mặc định 1.4s đều nhau:
0.5-0.7s nối liền mạch ý · 1.0-1.2s hết một ý · 1.6-2.0s ranh giới module. Rồi áp FM-09 để giữ liên kết.

---

## FM-11 · `verify` báo `non-deterministic call` dù code không hề random

**Triệu chứng:** `npm run verify` báo `non-deterministic call in <file>` nhưng đọc code không thấy
`Math.random` hay `Date.now()` nào.

**Nguyên nhân:** checker trong `tools/verify.mjs` quét bằng regex trên **toàn văn file**, kể cả
comment. Viết trong ghi chú rằng "không được dùng Math.random" cũng đủ làm nó nổ.

**Sửa:** diễn đạt lại trong comment (ví dụ "no randomness") thay vì viết đúng tên hàm.
Đừng tắt checker: nó tồn tại vì render frame-by-frame thật sự cần tính tất định.

---

## FM-12 · OmniVoice nuốt mất mấy chữ đầu câu khi `speed` cao

**Triệu chứng:** nghe thấy như có tiếng "a" lạ đầu câu; thật ra là âm tiết đầu bị cắt dở. Whisper
đối chiếu cho điểm khớp thấp ở rất nhiều câu.

**Bằng chứng (13/09/2026, `speed=1.5`, 39 câu):** Whisper nghe được so với lời gốc

| Lời trong kịch bản | Model thật sự đọc |
|---|---|
| "**Chào các bạn, mình quay lại** rồi đây…" | "**Đã** rồi đây, hôm nay mình với các bạn…" |
| "**Nên module một mình sẽ bắt đầu từ chỗ ai** cũng hay bỏ qua…" | "**Cứ cũng hãy** bỏ qua, user thật ra…" |
| "**Chỗ này chia ra ba** lớp nhé…" | "**Ta** lớp nhé! Lớp 1 là…" |
| "**Chốt xong mấy thứ đó rồi thì sang module hai,** mình biến…" | "**2.** Mình biến nó thành PR đi…" |

**Đã thử và KHÔNG ăn thua:** thêm từ đệm ("Ừm. ") vào đầu text để hứng phần bị nuốt. Bản có lead-in
vẫn mất đầu, mà lời còn bị xáo trộn thêm.

**Nguyên nhân CHÍNH (probe 14/09/2026):** `ref_audio` bị cắt từ **giữa câu**. Zero-shot TTS bắt
chước cả cách vào câu của mẫu, nên mẫu vào giữa chừng thì model cũng vào giữa chừng, tức là bỏ mấy
chữ đầu. Đổi sang ref bắt đầu đúng đầu câu ("Ngày xửa ngày xưa…") thì hết ngay:

| Câu | ref cắt giữa câu, speed 1.5 | ref đầu câu, speed 1.2 |
|---|---|---|
| "Chào các bạn, mình quay lại rồi đây." | "**Đã** rồi đây…" | "**Chào các bạn, mình quay lại rồi đây.**" |
| "Chỗ này chia ra ba lớp nhé." | "**Ta** lớp nhé!" | "**Chỗ này chia ra 3 lớp** nha." |
| "Chốt xong mấy thứ đó rồi thì sang module hai…" | "**2.** Mình biến nó…" | "**Chốt xong mấy thứ đó rồi thì sang**…" |

**Luật cho ref_audio:**
1. **Cắt trọn câu.** Bắt đầu ngay đầu một câu, kết thúc ở cuối một câu. Đừng cắt giữa chừng.
2. Chừa ~0.2s im lặng trước khi câu bắt đầu.
3. `ref_text` phải khớp chính xác lời trong ref. **Đừng lấy transcript của Whisper làm ref_text** —
   ở tiếng Việt nó sai nhiều (Whisper nghe "Ngày xửa ngày xưa" thành "Nghe sở ngay xưa"). Gõ tay
   theo đúng lời nghe được.
4. Dài khoảng 8-12s là đủ; dài hơn thì base64 vượt giới hạn push của Kaggle (FM-05).

**Sửa (đã chốt):** kèm với ref sạch, đừng bắt model đọc nhanh. Sinh ở `--speed 1.0` cho model đọc
nhịp tự nhiên, rồi tăng tốc ở khâu hậu kỳ:

```bash
node tools/voice-kaggle.mjs ... --speed 1.0      # model đọc thoải mái
node tools/voice-tempo.mjs <vào> <ra> --tempo 1.35   # ffmpeg atempo, GIỮ NGUYÊN cao độ
node tools/voice-import.mjs --cues ... --from <ra>   # KHÔNG --no-align: Whisper kiểm lại lời
```

**Lưới an toàn:** `voice-import.mjs` có align sẽ chấm điểm khớp từng câu và chặn câu lệch. Đừng
thêm `--force` để đi qua cảnh báo đó, trừ khi đã tự nghe lại đúng câu đó.

---

## FM-13 · `NaN` chui vào attribute khi gọi sai tên tham số của `@remotion/shapes`

**Triệu chứng:** `npm run verify` báo
`frame 1383 writes NaN into an attribute: ="translate(1380 300) scale(0.99) translate(NaN NaN)"`.

**Nguyên nhân:** `makeSpark` nhận `{ width, height, edgeRoundness, cornerRadius }` — **không** nhận
`points`/`innerRadius`/`outerRadius`. Gọi sai tên thì nó không ném lỗi: nó trả `path` toàn `NaN` và
`width`/`height` là `undefined`. `undefined / 2` ra `NaN`, và `NaN` đó đi thẳng vào `transform`.

**Cách sửa:** đọc file `.d.ts` trong `node_modules/@remotion/shapes/dist/utils/` trước khi dùng một
hàm `make*` mới. Kiểm nhanh một dòng:

```bash
node -e "const{makeSpark}=require('@remotion/shapes');const s=makeSpark({width:108,height:108});console.log(s.width,s.height,s.path.slice(0,30))"
```

`width`/`height` ra `undefined` hoặc path chứa `NaN` ⇒ sai tên tham số, đừng đi tiếp.

**Bài học chung:** các hàm `make*` của Remotion **không validate tham số**. Mọi component mới bọc một
hàm `make*` phải được chạy qua `npm run verify` trước khi coi là xong — đây đúng là loại lỗi mà
checker NaN của repo sinh ra để bắt.

---

## FM-14 · Checker im lặng nói "không sao" vì regex trượt mất thứ cần kiểm

**Triệu chứng:** `npm run verify` xanh, nhưng nhìn bản render thì thấy đúng cái lỗi mà check đó sinh
ra để bắt (chữ tràn khỏi hộp).

**Nguyên nhân:** `textNodes()` trong `tools/verify.mjs` khớp `<text[^>]*>([^<]*)</text>`. Chữ nhiều
dòng — tức là **gần như mọi chữ trong `Card`** — render thành `<tspan>` lồng trong `<text>`, nên
`[^<]*` trượt và hàm trả về danh sách thiếu hầu hết chữ. Ba check dựa trên nó (đè mascot, tràn hộp,
bố cục lệch) đều chạy trên dữ liệu rỗng và báo sạch.

**Cách sửa:** bóc từng `<tspan>` thành một node riêng, `x` lấy của tspan, `y` là `y` của `<text>`
cộng dồn `dy`.

**Bài học, quan trọng hơn chính cái bug:** một check mới **phải được chứng minh là biết fail**.
Cách làm: cố ý phá đúng thứ nó canh (ở đây: tăng cỡ chữ cho tràn hộp), chạy verify, thấy nó báo,
rồi mới khôi phục. Check chưa bao giờ đỏ là check chưa biết có chạy hay không — và nó còn tệ hơn
không có check, vì nó tạo cảm giác đã kiểm rồi.

Lần này chính cái bẫy đó suýt lọt: lệnh `perl` phá file để thử lại không khớp pattern, file không hề
đổi, verify xanh — và "xanh" đó gần như được đọc thành "check chạy đúng". Sau khi phá thật thì nó
báo ngay 4 chỗ. **Kiểm lại rằng phép phá đã thực sự phá**, đừng chỉ nhìn kết quả verify.

---

## FM-15 · Thanh/chrome đè title hoặc so sánh mất một vế

**Triệu chứng:** screenshot của video Ngày 5 cho thấy progress rail cắt ngang title; ở câu kế tiếp,
chỉ cột `AI PRODUCT` còn nội dung còn `SOFTWARE THƯỜNG` trở thành vùng trống. Cả hai lỗi đều qua
được build và verify vì đó là lỗi thứ bậc hình ảnh, không phải lỗi cú pháp hay overlap mascot.

**Nguyên nhân:** đặt một overlay toàn cục vào vùng title của `SceneFrame` mà không có vùng dành riêng;
và dựng hai vế so sánh bằng các `Card` rời, trong đó cue sau chỉ render phần mới xuất hiện.

**Cách sửa:**
1. Chrome/title chiếm vùng trên cùng. Progress rail chỉ được đặt trong content zone **hoặc gắn ngay
   trên viền subtitle** (cùng màu/độ dày); không chen vào title.
2. Một so sánh phải là **một component/layout chung** giữ cả hai vế ở mọi cue. Cue sau chỉ reveal
   thêm hàng hoặc highlight, không được xoá vế đã thiết lập.
3. Dùng `DataTable`, `Flow`, `BranchRouter` hoặc component chuyên cho quan hệ; không dựng so sánh
   bằng một chồng `Card` độc lập.
4. QA luôn chụp ít nhất một frame settled của cue mở so sánh và cue tiếp theo. Kiểm mắt: title rõ,
   đủ hai vế, thứ tự reveal đi theo lời đọc từ trên xuống.

**Lưới an toàn:** khi thêm chrome global, phải có ít nhất một still ở frame giữa của title dài; khi
thêm animation nhiều hàng, kiểm frame đầu, frame giữa và settled frame — ảnh cuối đẹp không chứng
minh được animation đã đúng nhịp.

---

## FM-16 · Mũi tên lệch trục với đường nối

**Triệu chứng:** đường nối kết thúc lệch vào thân mũi tên; cạnh đáy của arrowhead không vuông góc
với đường đi, nên những arrow ngắn nhìn đặc biệt méo.

**Nguyên nhân:** dựng hai góc đầu mũi tên bằng hai góc xoay độc lập quanh một điểm lùi, làm cạnh đáy
trôi khỏi trung điểm mà line kết thúc.

**Cách sửa:** lấy vector đơn vị theo hướng đi `(cos θ, sin θ)` và vector vuông góc `(-sin θ, cos θ)`.
Line kết thúc đúng ở trung điểm cạnh đáy; hai góc là `base ± perpendicular × halfWidth`. Không chỉnh
từng arrow bằng offset tay.

**Lưới an toàn:** với primitive mũi tên, QA một arrow ngang, một arrow dọc và một arrow chéo ở frame
settled. Nếu sửa primitive, chụp lại mọi video đang dùng local copy của primitive đó.

---

## FM-17 · Học viên nghe không hiểu thuật ngữ, tiếng Anh đọc nhanh/sai, thiếu problem framing

**Triệu chứng:** feedback thật từ học viên sau khi xem trọn 4 video Ngày 05 (16/09/2026), nguyên văn:
> "Trong video có khá nhiều thuật ngữ mà em khá chắc là mọi người không hiểu hết... Tốc độ tiếng việt
> ổn có thể nghe hiểu, tốc độ đọc tiếng anh hơi nhanh... Giải thích problem chưa đủ kĩ. Em xem nhiều
> khi chưa define được bài toán thì đã đến đoạn đưa solution rồi... Có những từ tiếng anh đọc chưa
> chuẩn."

Bốn video build/verify/render đều pass, QA still đều mở xem — nhưng lỗi này **không lộ qua verify
hay còn ảnh tĩnh**, chỉ lộ qua người thật nghe hết một video bằng tai.

**Bốn nguyên nhân riêng, đừng gộp thành một:**
1. **Thuật ngữ không phổ thông chỉ có ví dụ, không có định nghĩa.** Checklist cũ (script-craft §6)
   chỉ đòi "mỗi thuật ngữ lần đầu xuất hiện có kèm 1 ví dụ cụ thể" — một ví dụ không thay được một
   câu định nghĩa. Người chưa biết khái niệm nghe ví dụ trước khi biết khái niệm là gì thì vẫn không
   hiểu.
2. **Tốc độ đọc tiếng Anh nhanh hơn tiếng Việt trong cùng một audio.** Đây là đặc tính quan sát được
   của TTS tiếng Việt khi gặp cụm tiếng Anh chen giữa câu (khác với FM-12 — FM-12 là tốc độ toàn bộ
   audio bị đẩy nhanh bởi cờ `speed`; đây là chênh lệch tốc độ **giữa hai ngôn ngữ trong cùng một
   file đã render ở speed 1.0**). Càng nhiều cụm tiếng Anh liền nhau, càng dễ nghe như bị tua nhanh.
3. **Kịch bản nhảy sang solution trước khi định nghĩa xong vấn đề.** Đây là lỗi cấu trúc mạch kể
   (script-craft §3b chỉ nói về nối hệ quả giữa các phần, chưa có luật ép tối thiểu bao nhiêu câu
   phải dành cho việc định nghĩa bài toán trước khi nêu giải pháp).
4. **Một số từ tiếng Anh bị đọc sai** dù không nằm trong danh sách "rủi ro" đã probe trước đó —
   nghĩa là bước probe từng từ đơn lẻ (script-craft §3d) không bắt hết lỗi phát âm xảy ra khi từ đó
   nằm trong ngữ cảnh câu thật.

**Sửa (đã đưa vào `script-craft.md`):**
- §3d mở rộng: coi phát âm tiếng Anh là rủi ro **theo ngữ cảnh câu**, không chỉ theo từng từ đơn lẻ;
  thêm bước nghe thử audio thật (không chỉ đọc kịch bản) trước khi khoá.
- §3e mới: bắt buộc định nghĩa xong vấn đề (ai gặp, gặp khi nào, hậu quả nếu không giải quyết) trước
  khi nhắc tới bất kỳ giải pháp/kỹ thuật nào trong cùng một khái niệm.
- §6 checklist: tách rõ "có ví dụ" và "có định nghĩa bằng lời của người thường" thành hai mục khác
  nhau; thêm mục nghe thử toàn bộ audio thật sau khi có TTS, không chỉ đọc thầm bản text.

**Lưới an toàn:** đây là lỗi chỉ lộ qua tai người thật xem hết video — không có check tự động nào
bắt được. Trước khi coi một video là xong, phải có ít nhất một lượt nghe trọn vẹn bằng tai (owner
hoặc người ngoài), không thay bằng đọc kịch bản hay xem QA still.

---

## FM-18 · `verify` báo chữ tràn hộp giả bên trong `Evidence`

**Triệu chứng:** `npm run verify` báo `chữ "..." rộng hơn hộp 118 px` cho câu dùng `<Evidence caption=…>`,
dù chụp still nhìn thật thì chú thích nằm gọn trong dải nền, không tràn gì cả (câu 32, n5-05, ảnh
chụp thật fireflies.ai — video đầu tiên dùng `Evidence` trong repo).

**Nguyên nhân:** `textOverflow()`/`overlaps()` trong `tools/verify.mjs` đọc `x`/`y` **thô** trực tiếp
từ chuỗi HTML bằng regex — không resolve `transform` của SVG. `Evidence` vẽ `caption` bên trong một
`<g transform="translate(...) rotate(...)">`; toạ độ cục bộ của `<text>` đó (`x=0 y=9`, đặt tương đối
so với tâm caption) trùng khớp vào bounding box cục bộ của `<Tape>` — dải băng keo trang trí 4 góc,
có sẵn `width="118"` cứng trong component. Số `118` trong thông báo lỗi chính là chiều rộng của mảnh
băng keo đó, không liên quan gì tới caption thật.

**Cách xác nhận đây là false-positive, không phải lỗi thật:** chụp still frame settled của câu đó
(`node tools/shoot.mjs --batch jobs.json`) và **mở ảnh ra nhìn** — nếu chú thích nằm gọn trong dải
nền, không tràn, không đè thanh phụ đề (y ≥ 984), thì đúng là false-positive của checker, không phải
lỗi bố cục.

**Cách sửa (đã dùng ở n5-05, không sửa `Evidence.jsx` — component dùng chung, nhiều video khác có
thể cũng đặt `caption` ở toạ độ khác không va vào `Tape`):** đừng truyền prop `caption` vào
`<Evidence>`; tự vẽ một `<rect>` + `<SvgText>` **tuyệt đối, ngoài mọi `<g transform>`** ngay dưới
khung ảnh làm chú thích nguồn. Cùng thông tin, nhưng giờ toạ độ trong HTML là toạ độ thật, nên
`textOverflow()` kiểm đúng và không báo giả nữa.

**Đừng:** đừng thêm `--force`/tắt check, và đừng sửa `Evidence.jsx` chỉ để né một checker cụ thể —
`Tape` mặc định `w=118` là hợp lý cho chính nó, vấn đề nằm ở chỗ checker không resolve transform, một
giới hạn đã biết của toàn bộ `tools/verify.mjs` (xem `visual-assets.md` §6 "Giới hạn của checker").

---

## FM-19 · `pronounce.json` không có tác dụng gì trên nhánh OmniVoice/Kaggle

**Triệu chứng:** feedback thật từ chủ repo sau khi nghe video n5-05 (16/09/2026): "vẫn có chỗ đọc AI
là 'ai' thay vì là 'ây ai'". `projects/n5-05-prototype-pilot-mvp-poc/pronounce.json` **có sẵn** mục
`"AI": "ây ai"` — file không thiếu, chỉ là không hề được dùng.

**Nguyên nhân đo được:** `pronounce.json` chỉ được đọc ở một chỗ duy nhất trong toàn repo —
`tts-elevenlabs/tts.mjs` (nhánh ElevenLabs trả phí, bị cấm dùng theo `AGENTS.md`). `tools/voice-export.mjs`
— bước duy nhất xuất text thật cho nhánh OmniVoice/Kaggle (`doc-thu.txt`, `voice-batch.jsonl`,
`cau/*.txt`) — ghi thẳng `c.text` gốc, không áp bất kỳ substitution nào. Vì mọi video thật trong repo
đều đi qua OmniVoice (ElevenLabs không được dùng), `pronounce.json` **chưa từng có tác dụng thật** kể
từ khi file này được tạo ra — các mục `POC`/`MVP` "có vẻ đúng" ở các video trước chỉ vì OmniVoice tự
đọc đúng hai từ đó (không có nghĩa tiếng Việt nào để nhầm), không phải vì được substitute.

**Sửa (đã áp dụng):** thêm `--pronounce <json>` vào `tools/voice-export.mjs`, dùng đúng hàm
`ttsText()` (word-boundary regex) đã có sẵn trong `tts-elevenlabs/tts.mjs`, áp vào `doc-thu.txt`/
`voice-batch.jsonl`/`cau/*.txt` — **không** áp vào `doc-thu.md` (người đọc thành tiếng không cần
cách viết ngữ âm). Lệnh chuẩn từ nay:
```bash
node tools/voice-export.mjs <video dir> --out projects/<id>/voice-script \
  --pronounce projects/<id>/pronounce.json
```
Thiếu cờ `--pronounce` khi project có sẵn `pronounce.json` là chạy thiếu bước — công cụ giờ tự in
cảnh báo nếu chạy không kèm cờ này.

**Chưa kiểm chứng:** `tools/voice-import.mjs` so khớp audio với `c.text` **gốc** trong `cues.js` (ví
dụ "AI"), không phải bản đã substitute ("ây ai"). Whisper thường transcribe giọng đọc chữ cái quay
lại đúng "AI", nên nhiều khả năng `matchRatio` không bị ảnh hưởng — nhưng chưa có ca thật nào đo lại
sau khi bật `--pronounce`. Video đầu tiên chạy qua cờ này phải soi kỹ `matchRatio` của đúng những cue
có từ trong `pronounce.json`, đừng giả định là ổn.

---

## FM-20 · Một sơ đồ đứng yên hàng chục giây, không có minh hoạ bổ trợ nào khác

**Triệu chứng:** feedback thật từ chủ repo (16/09/2026), kèm ảnh chụp màn hình: đoạn sơ đồ 2 trục
(4 vòng tròn Prototype/Pilot/MVP/POC) của n5-05 đứng gần như y nguyên suốt ~18 cue (cue 4–21, hơn
60 giây), không có sticker/minh hoạ nào khác chen vào dù mỗi khái niệm mới có một đoạn giải thích
riêng — "chỉ dùng mỗi biểu đồ này rất lâu nhưng không có thêm minh họa nào hết".

**Nguyên nhân:** `visual-assets.md` §1 mặc định "không cần sticker cho mọi cue" và đo lane bằng tỉ lệ
đề xuất sticker **dưới 30%** — luật này chặn được kiểu rải sticker vô tội vạ, nhưng không có luật
ngược lại cho trường hợp một visual duy nhất đứng yên quá lâu. Lane dựng scene n5-05 áp mặc định
"không cần" cho toàn bộ đoạn 18 cue, kết quả zero sticker/minh hoạ trong cả video — không phải do
thiếu thư viện (unDraw/Fluent Emoji/Tabler/Iconoir đều có sẵn, đã soát license) mà do không có ngưỡng
nào bắt buộc phải làm mới hình ảnh.

**Sửa (đã đưa vào `visual-assets.md` §1):** thêm ngưỡng bắt buộc — một visual/diagram không được
đứng yên (không đổi bố cục, không thêm chi tiết mới) quá **6 cue liên tiếp hoặc ~25 giây đo được**
mà không có ít nhất một minh hoạ bổ trợ mới (sticker, icon, hoặc chi tiết mới thêm vào chính diagram
đó) gắn với đúng nội dung cue đang nói, không phải minh hoạ trang trí cho có.

**Về "không có khả năng cắt hình ảnh từ nguồn":** khả năng này **đã có** — `mcp__chrome-devtools`/
WebFetch chụp được ảnh thật từ web (đã dùng đúng cho Evidence cue 26/32 trong chính video này). Cái
thiếu không phải công cụ, mà là **chủ động dùng nó** cho đoạn định nghĩa khái niệm (không có "nguồn
thật" để chụp — đây đúng là lúc cần minh hoạ từ thư viện sticker/icon theo §1, không phải Evidence).
Đừng nhầm hai việc: khái niệm trừu tượng → sticker/icon; case có thật → Evidence ảnh chụp nguồn.

**Đã tự động hoá một phần (17/09/2026, `tools/verify.mjs`):** thêm `visualFingerprint()` — so sánh
"dấu vân tay hình khối" (chỉ tính rect/circle/ellipse/image có kích thước đáng kể, CỐ Ý bỏ qua text
vì caption đổi mỗi cue không liên quan tới diagram có đứng yên hay không, và bỏ qua path vì mascot là
417 path tĩnh dùng chung mọi cue sẽ che mất khác biệt thật) giữa các cue liên tiếp. ≥6 cue liền có
cùng fingerprint → cảnh báo (warning, không chặn build — đây là gợi ý cần xem lại, không phải lỗi
chắc chắn). Đã kiểm chứng bằng unit test (khung cùng diagram khác chữ → fingerprint khớp đúng như kỳ
vọng; khung có thêm hình mới → fingerprint đổi đúng như kỳ vọng) và chạy sạch trên cả 10 video hiện
có (không báo giả, vì đã sửa xong n5-05 nên không còn đoạn nào vi phạm để đối chiếu true-positive
trên video thật — xem thêm phần "Đừng" bên dưới).

**Đừng:** đừng hạ ngưỡng xuống dưới 6 hoặc bật cảnh báo thành lỗi cứng — đây là tín hiệu THAM KHẢO
(một số đoạn cố ý giữ nguyên bố cục vẫn hợp lệ), người dựng scene phải tự nhìn lại, không phải máy
tự động thêm sticker.

---

## FM-21 · Khung đỏ `marks` của Evidence khoanh sai vùng, đè lên chữ/hộp khác

**Triệu chứng:** feedback thật từ chủ repo kèm ảnh chụp (n5-06, 16/09/2026): khung đỏ (`marks` của
`Evidence`, xem `Evidence.jsx`) lẽ ra khoanh đúng một cột/đoạn trong ảnh crop, nhưng lại lệch — trùm
lên cả tiêu đề phía trên, đè xuống banner kết luận phía dưới (cue 8, trang "Phần mềm truyền thống vs
AI"), hoặc trùm sai cả một ô "Overtrust" lẫn viền ngoài không liên quan (cue 22, "Trust calibration").

**Nguyên nhân đo được:** `Evidence.jsx` tính `marks` đúng thuần tuý hình học — `mx=m.x*width`,
`my=m.y*height`... (không có bug trong component). Lỗi nằm ở **lane dựng scene tự đoán/ước lượng**
toạ độ `x,y,w,h` (tỉ lệ 0-1) mà **không mở ảnh crop thật ra đo** — cùng kiểu lỗi đã xảy ra với mũi
tên lệch tâm ở n5-02 (xem lịch sử sửa `n5-02-ai-feedback-loop` case `n===51`): đoán số "nhìn hợp lý"
thay vì đo pixel thật.

**Sửa — luật bắt buộc (áp cho mọi `marks` của `Evidence` từ nay):**
1. Trước khi viết `marks`, **mở file ảnh crop thật** (không phải ảnh gốc cả trang PDF) bằng Read
   tool hoặc tương đương, nhìn trực tiếp vùng cần khoanh.
2. Đo toạ độ pixel của vùng đó trên chính ảnh crop (góc trên-trái, rộng, cao), rồi chia cho kích
   thước thật của ảnh crop (không phải kích thước trang PDF gốc) để ra tỉ lệ 0-1.
3. Sau khi viết `marks`, **shoot lại still đúng frame đó và mở ảnh ra nhìn** — xác nhận khung đỏ ôm
   đúng, không đè lên chữ/hộp khác, không tràn ra ngoài vùng nội dung crop. Đừng tin "số nhìn hợp lý"
   khi chưa thấy ảnh render thật.

**Lưới an toàn:** `Evi` wrapper trong `shared.jsx` (nếu video dùng pattern tương tự n5-06) nên có một
lệnh shoot nhanh cho MỌI cue có `marks` trước khi coi là xong, không chỉ vài cue mẫu.

**Đã tự động hoá một phần (17/09/2026, `tools/verify.mjs`):** `evidenceMarkBounds()` quét thẳng
source `.jsx` (không phải render ra rồi đo, vì `marks` vẽ trong `<g transform>` nghiêng mà verify
không resolve được — giới hạn đã ghi ở FM-18) — chặn build nếu `x,y,w,h` âm, bằng/nhỏ hơn 0, hoặc
`x+w`/`y+h` vượt quá 1 (khung đỏ tràn ra ngoài ảnh). Đây CHỈ bắt được lỗi gõ số sai (typo), KHÔNG bắt
được lỗi ngữ nghĩa "toạ độ hợp lệ nhưng khoanh sai chỗ" như ca thật cue 8/22 — lớp lỗi đó bắt buộc
phải nhìn ảnh thật theo quy trình 3 bước ở trên, không có cách tự động hoá đáng tin.

---

## FM-22 · Dùng card "đang tìm nguồn" thay cho ảnh chụp thật khi nguồn có thể tìm được

**Triệu chứng:** feedback thật từ chủ repo (n5-06, 16/09/2026): cue trích dẫn "Nghiên cứu 2023 —
Người dùng viết prompt sai kiểu gì?" (paper thật: *Why Johnny Can't Prompt*, CHI 2023) chỉ hiện một
`LineIcon name="search"` + `Card` ghi tên nghiên cứu — không có ảnh chụp paper thật nào cả, dù đây là
một paper có thật, tìm được công khai (CHI/ACM DL, arXiv). "Khi có paper thì không mở ra để cap lại
và chèn vô mà chỉ để mỗi tên."

**Nguyên nhân:** lane dựng scene coi "card tên nghiên cứu + icon kính lúp" là mặc định an toàn cho
mọi trích dẫn không có sẵn ảnh trong slide, mà không thử tìm nguồn thật trước — dù quy trình Evidence
§2 (nguồn web thật) hoàn toàn làm được việc này (đã dùng đúng cho Evidence cue 26/32 khác trong cùng
video).

**Sửa — luật bắt buộc:**
1. Gặp một cue trích dẫn tên nghiên cứu/paper cụ thể (có tên, có năm) mà slide không có sẵn ảnh để
   crop: **thử tìm nguồn thật trước** (WebFetch/`mcp__chrome-devtools` tra tên paper — CHI/ACM DL,
   arXiv, trang tác giả) rồi chụp qua Evidence §2 (nguồn web), y hệt quy trình đã dùng cho case
   DoorDash/Fireflies ở n5-05.
2. **Chỉ khi tìm thật sự không ra** (paywall chặn hẳn, không có bản public, hoặc rõ ràng chỉ là số
   liệu tổng hợp không gắn với một paper cụ thể) mới dùng card tên+icon làm phương án cuối — và khi
   đó phải ghi rõ trong `PROMPTS.md` là đã thử tìm và không ra, không phải bỏ qua bước tìm.
3. **`LineIcon name="search"` + `Card` chỉ dành cho đúng tình huống trên** (paper không tìm được ảnh
   thật) hoặc cho một câu hỏi tu từ thuần (ví dụ "câu hỏi này trả lời sao?" — không viện dẫn nguồn cụ
   thể nào). Không dùng làm mặc định chung cho "chưa có ảnh".
4. Xem thêm rule mới trong `visual-assets.md` §2 về việc cần đa dạng template hơn khi không có ảnh
   nguồn — search-icon-card chỉ là MỘT trong nhiều lựa chọn, không phải lựa chọn duy nhất.

---

## FM-23 · Cue thiếu hẳn scene khiến khung trắng tuyệt đối, `verify` cũ không bắt được

**Triệu chứng ca gốc (n5-02, 16/09/2026):** ai đó nối thêm 4 cue mới (n51-n54) vào `cues.js` nhưng
quên tạo file scene (`s51.jsx`...`s54.jsx`) và quên đăng ký vào mảng `SCENES` trong `video.jsx`. Từ
frame tương ứng cue 51 trở đi, `Series` không tìm được scene khớp, trả `null` — màn hình trắng tuyệt
đối (không chrome, không mascot, không caption), trong khi giọng đọc vẫn phát tiếp. `npm run build &&
npm run verify` **vẫn báo "all checks passed"** — chỉ lộ ra khi có người chụp still bằng mắt.

**Vì sao lọt qua `verify` cũ:** check `filledHalves` chỉ so **LỆCH** giữa hai nửa khung (một bên gần
0%, bên kia trên 22%) để bắt lỗi "chừa chỗ cho phần chỉ hiện ở câu sau". Khi **cả hai nửa đều 0%**
(trắng tuyệt đối), không nửa nào "lệch" so với nửa kia, nên điều kiện không khớp và không có gì được
báo — một lỗ hổng tồn tại từ đầu, không ai để ý vì hiếm khi cả khung trắng hoàn toàn.

**Sửa (đã áp dụng trong `tools/verify.mjs`, 17/09/2026):** thêm hàm `contentElementCount()` đếm SỰ
TỒN TẠI (không đo diện tích) của mọi loại phần tử vẽ trong vùng nội dung — rect có diện tích, chữ,
circle/ellipse/image, path có `d` thật, và `<div>` HTML có chữ (cho các scene dùng `overlay` HTML
kiểu `Recap`, xem cảnh báo trong `s16.jsx` của `n5-00-tom-tat-ngay-5` — HTML overlay không phải phần
tử SVG, phải đếm riêng để không báo giả). Ở cuối mỗi cue, nếu `filledHalves` cả hai bên dưới 2% VÀ
`contentElementCount` ≤ 1 → `problems.push` (lỗi cứng, chặn build), không chỉ warning như lệch bố cục.

**Đã kiểm chứng bằng thực nghiệm (17/09/2026):**
- Tái tạo đúng lỗi gốc (bớt 1 phần tử khỏi mảng `SCENES` của `n2-00-gioi-thieu-ngay-2`) → check mới
  báo đúng "câu 16 khung trống hoàn toàn ở frame 3583". Revert lại thì sạch.
- Chạy trên cả 10 video hiện có trong repo → 0 báo giả, trừ đúng 1 lần phát hiện thật một false
  positive kỹ thuật (scene dùng HTML `overlay` bị đếm nhầm là trống) — đã sửa bằng cách thêm đếm
  `<div>` có chữ, xác nhận lại sạch sau khi sửa.

**Đừng:** đừng hạ ngưỡng `contentElementCount` xuống đúng 0 — tag chrome nhỏ (nhãn "HOOK"/"PHẦN X/Y")
vẫn có thể tạo ra 1 phần tử chữ ngay cả khi scene thật sự trống, nên ngưỡng `≤ 1` mới đúng thực tế.

---

## FM-25## FM-25 · Contact sheet thu nhỏ giấu lỗi chồng chữ — ba vòng QA bằng mắt không thấy

**Triệu chứng:** lane dựng mở contact sheet ba lượt, báo "không thấy lỗi bố cục". Owner trích một
frame 1920×1080 từ MP4 và thấy ngay hai lỗi: câu trích `"đi quá xa so với lời hứa"` đè chú thích
`"một thế hệ là xong"`, và một thẻ ảnh bay đè mất chữ `cho` của dòng `cho thật nhiều dữ liệu vào →`.

**Cách đo (số, không cảm tính):** contact sheet gom 47 frame vào một ảnh ~2800px → mỗi ô còn ~460px,
tức **tỉ lệ 1:4,2**. Chữ 20px trong khung gốc còn **4,8px** trên contact sheet. Không mắt nào đọc
được, kể cả khi mở đúng file.

**Nguyên nhân:** brief đòi contact sheet làm bằng chứng QA. Lỗi nằm ở **phương tiện đo**, không ở
người nhìn — và ba vòng lặp cùng một phương tiện thì vẫn ra cùng một kết quả.

**Cách sửa đã kiểm chứng:**
1. `node tools/qa-layout.mjs --video <id>` — đo trong DOM: `Range.getBoundingClientRect()` của mọi
   text node + `elementFromPoint`. Trên chính video này nó bắt lại **đủ cả hai lỗi**, cộng thêm ba
   lỗi mắt chưa thấy (thân máy nuốt 4 nhãn `tầng…`, thẻ ảnh chui vào máy với nhãn cắt giữa chữ, và
   `2006` chạm tiêu đề 76×18px).
2. Trích frame **full-res từ MP4** ở các mốc nhấn (`spokenAt`) rồi mở từng cái.
3. Contact sheet vẫn giữ — nhưng chỉ để nhìn **bố cục tổng và nhịp**, không để soát chữ.

**Đo bề ngang chữ bằng `Range`, không bằng hộp phần tử.** Một khối `left:0;right:0;text-align:center`
có hộp phần tử trải hết khung dù chữ chỉ nằm ở giữa — đo bằng nó thì check "sát mép" báo giả mọi dòng
căn giữa (đã gặp, đã sửa). Và phải cắt hộp theo cha có `overflow:hidden`, nếu không hiệu ứng gõ chữ
(`nowrap` + `width` chạy 0→100%) báo giả ở mọi frame.

## FM-26 · Khung chết: 1–3 giây chỉ có nền và phụ đề

**Triệu chứng:** đầu cảnh `Lighthill` (00:08) và gần cuối `bridge-2` chỉ có nền đêm + thanh phụ đề.
Video vẫn "chạy", verify vẫn xanh, không ai báo gì.

**Cách đo:** `tools/qa-layout.mjs` đọc MP4 qua ffmpeg, cắt vùng nội dung y 0–984 (**bỏ thanh phụ đề**
— nó luôn có mặt và luôn đóng góp ~9% pixel khác nền, để nguyên thì không frame nào "chết"), thu về
240×123 gray, lấy mức xám phổ biến nhất của từng frame làm nền, đếm tỉ lệ pixel lệch > 6 mức.

Phân bố đo được trên video này (5.639 frame): **trung vị 9,5% · p10 2,9% · p05 1,3%**. Ngưỡng chọn
**1,2%** (ngay dưới p05), cửa sổ tối thiểu **1,0s**. Chạy ra đúng hai đoạn `01:12–01:13` và
`02:04–02:07` — đúng hai chỗ owner đã chỉ đích danh, không thêm chỗ nào.

**Cách sửa:** cho vật thể của cảnh vào sớm hơn (mốc `enter` đầu cảnh ≤ 0,3s), và ở cầu nối thì rút
ngắn fade cuối + giữ carrier element sáng tới sát biên cảnh sau.

## FM-27 · OmniVoice nuốt nguyên mệnh đề ở chuỗi đếm và chuỗi tên riêng

**Triệu chứng:** Whisper đối chiếu thấy audio thiếu hẳn một mệnh đề, dù cue không hề dài:
- `"Như cờ vua. Một nước là ba mươi lựa chọn. Hai nước, chín trăm. Ba nước, hai mươi bảy nghìn."`
  → nghe ra `"Như cờ vua, một nước là 30 lựa chọn, hai nước 27.000"` (mất `chín trăm. Ba nước,`).
- `"Lấy bài nhận diện chó mèo. Mình đưa vào cực kỳ nhiều ảnh, chỉ nói đúng một câu: …"`
  → mất hẳn `Mình đưa vào cực kỳ nhiều ảnh,`.
- `"… Google công bố Bard. Chưa đầy ba tuần sau nữa là LLaMA."` → `Bard` thành "bắt", `LLaMA` thành
  "AMEA", `"Sáu mươi tám"` nén thành "sáu tám".

**Cách đo:** `voice-import.mjs --scan` cho % khớp; để biết THIẾU CHỮ NÀO thì transcribe từng clip và
`difflib` so **tập từ**, đừng so số đếm — ASR viết `2006` cho `hai nghìn không trăm lẻ sáu` nên tỉ lệ
khớp thấp mà audio vẫn đúng. Ba cue trên bị nhầm là "lỗi phát âm" cho tới khi so tập từ.

**Nguyên nhân:** chuỗi 3–4 mệnh đề cùng khuôn (`Một nước… Hai nước… Ba nước…`) và chuỗi tên riêng
liền nhau là chỗ model rút gọn mạnh nhất. Không phải do cue dài: cue 29 từ, 2 câu, khớp 100%.

**Cách sửa đã kiểm chứng:**
1. **Mỗi mệnh đề đếm một cue**, tối đa 2 phần tử/cue. Sau khi tách, cả ba cue trên đều đạt.
2. **Trần 2 lượt sinh lại cho một câu.** `Bard` sinh lại 3 lượt vẫn hỏng — lượt 3 là lãng phí.
3. Hỏng sau 2 lượt → **đổi cách viết trong lời đọc, hoặc rút từ đó khỏi lời và để chữ trên hình nói**.
   Bản v2 bỏ hẳn `Bard`/`LLaMA`/`GPT-4`/`Claude`/`Gemini` khỏi lời (`"Google tung ra chatbot của
   riêng mình"`, `"hàng loạt mô hình lớn nối nhau ra mắt"`), pill trên hình vẫn nói đủ tên.
4. `"68 ngày"` → `"hơn hai tháng"`: bỏ chuỗi số để không còn gì để nén, vẫn đúng sự thật.
5. Danh sách phát âm phải có **phương án dự phòng cho MỌI từ tiếng Anh** TRƯỚC khi sinh giọng.
6. **SUB-CLIP — khi KHÔNG được đổi số cue** (lane dựng cảnh đã chạy, cảnh neo theo `n`; thêm
   21/09/2026 trên `d05-v06-human-centered-ai-design`). Cách 1 ở trên đổi số cue nên lúc đó không
   dùng được. Thay vào đó tách **LỜI** của cue thành 2–3 mảnh ở ranh giới câu/vế, sinh riêng từng
   mảnh (mảnh ngắn thì không còn gì để nuốt), rồi NỐI lại thành đúng một `NNN.wav`:
   `node tools/voice-subclip.mjs --plan <plan.json> --batch …` → một lượt Kaggle →
   `--from <dir mảnh> --join <dir clip>` → `voice-import` như bình thường. Wording không đổi một
   chữ — tool chặn nếu nối lại không khớp `cues.js`. Khe nội bộ 0,21 s được ĐO theo đúng luật
   ≤50 ms/≤80 ms của `assemble()`, không cộng mù. Chi tiết: `voice-kaggle.md` §Cue bị nuốt mệnh đề.
7. **Thuật ngữ nghe sai LẶP LẠI ở nhiều cue** (`đòn bẩy` → "đoàn 7" ở cả cue 41 và 45, cả hai take)
   là dấu hiệu lỗi CÓ HỆ THỐNG, không phải nhiễu — retry mù không chữa được. Đưa thuật ngữ vào một
   mảnh sub-clip NGẮN, đứng ĐẦU mảnh, và sinh vài **biến thể cách viết** (`đòn-bẩy`, đổi dấu câu
   cuối) trong cùng lượt Kaggle rồi chọn bằng Whisper đã chuẩn hoá số. Biến thể chỉ vào `ttsText`;
   `text` hiển thị và phụ đề giữ nguyên.

## FM-28 · Lane báo "đã ghi file" nhưng file không tồn tại

**Triệu chứng:** lane khảo sát nộp báo cáo mô tả nội dung một file nó nói đã viết. `ls` cho thấy file
không có. 163k token phải làm lại.

**Cách đo:** `ls -la <đường dẫn>` trước khi đọc báo cáo.

**Cách sửa:** mọi lane có deliverable là file phải **kết thúc báo cáo bằng `ls -la` + `wc -l`** của
chính file đó, dán nguyên output. Owner `ls` trước khi đọc. Đây là luật cho cả brief lẫn lane.

## FM-29 · Khối đặc vẽ sau nuốt nhãn nằm dưới nó

**Triệu chứng:** bốn nhãn `tầng 1 · tầng 2 · tầng 3 · kết quả` không bao giờ xuất hiện trên bản
render. Không lỗi, không cảnh báo, verify xanh — chúng nằm trong DOM, đúng toạ độ, chỉ là bị thân cỗ
máy (một `<div>` nền đặc 1128×672) vẽ ĐÈ lên vì component máy đứng SAU trong cây React.

**Cách đo:** `tools/qa-layout.mjs` → `CHE: "tầng 3" bị DIV 1128x672 bg=rgb(46,61,104)`. Mắt nhìn
contact sheet không thấy vì… nhãn không có ở đó để mà thấy — đây là lớp lỗi "thiếu hẳn", khó hơn
"đặt sai chỗ".

**Cách sửa:** đổi thứ tự vẽ cho đúng nghĩa — nhãn CỦA các lớp nốt bên trong máy thì phải nằm TRÊN
thân máy. Cùng lớp lỗi: cần ăng-ten của máy cắt ngang chữ, một chấm confetti đè lên nhãn `MÈO ✓`,
thẻ ảnh bay đè chữ. Nguyên tắc: **chữ luôn ở lớp trên cùng**, và vật thể chuyển động thì đừng cho nó
bay qua vùng chữ (chỉ nâng `zIndex` là chưa đủ — thẻ vẫn lướt qua ngay dưới chữ trông rất bẩn).

## FM-30 · `position:absolute` trong SSR markup là toạ độ so với CHA, không phải toạ độ khung

**Triệu chứng:** một gate bố cục đọc SSR markup phẳng (`renderToStaticMarkup`), rút `left`/`top` của
mọi `div` có chữ rồi so hộp với nhau, và báo **65 cảnh báo chồng lấn** cho một video. Nghe như vừa
tìm ra một mỏ lỗi.

**Cách đo:** kiểm tay đúng **cặp đầu tiên** trong danh sách — hai nhãn được báo là đè nhau hoá ra
nằm trong **hai panel khác nhau**, mỗi panel có `position:relative` riêng. `left: 40px` của nhãn A
và `left: 40px` của nhãn B là 40px tính từ hai gốc toạ độ khác nhau, cách nhau nửa khung hình. 65
cảnh báo kia phần lớn cùng một dạng.

**Bài học:** markup phẳng **không mang cây toạ độ**. Mọi kết luận về vị trí, khoảng cách hay chồng
lấn rút từ nó là **đoán**, không phải đo — kể cả khi con số trông rất cụ thể. Vị trí chỉ đo được
trong trình duyệt, sau khi layout đã chạy: `tools/qa-layout.mjs` dùng `Range.getBoundingClientRect`
+ `elementFromPoint`, đó mới là toạ độ khung thật.

**Cách sửa:** gate chạy trên SSR markup chỉ được dùng cho thứ markup thật sự nói được — có/không có
phần tử, số lượng, chuỗi ký tự, `NaN` trong attribute. Muốn biết cái gì nằm ở đâu thì mở trình
duyệt. Và trước khi tin một danh sách cảnh báo dài, **kiểm tay cặp đầu tiên**.

## FM-31 · Gate đo trên trình duyệt báo lỗi nghe như thật, trong khi nó đang đo trang lỗi của Chrome

**Triệu chứng:** `qa-layout` in **18 "lỗi bố cục"** với nội dung trông hoàn toàn hợp lệ — `chữ mang
nghĩa 12px`, `chữ sát mép`, tên chuỗi là `ERR_CONNECTION_REFUSED`, `127.0.0.1 đã từ chối kết nối`.
Không dòng nào nói "không mở được trang". Exit code đỏ, và người đọc có mọi lý do để tin là video
hỏng.

**Cách đo:** `npm run serve` chưa chạy → Chrome nạp **trang báo lỗi của chính nó**, và trang đó cũng
có chữ, cũng có hộp, cũng có phần tử sát mép. Gate đo đúng những gì nó thấy; nó chỉ không kiểm là
mình đang thấy cái gì.

**Cách sửa (đã áp):** preflight trước khi đo — thử với tới server, và sau khi nạp thì kiểm phần tử
`#root` của composition có tồn tại không. Không với tới được thì thoát **exit 2** kèm câu "chưa đo
được, cần `npm run serve`", chứ **không** báo 0 lỗi và **không** báo lỗi bố cục.

**Bài học chung cho mọi gate đo trên trình duyệt:** trước khi đo, phải khẳng định được **mình đang
đo đúng trang**. Một gate không phân biệt được "không có lỗi", "chưa đo được" và "đo nhầm thứ khác"
thì ba trạng thái đó sẽ lần lượt bị đọc nhầm thành nhau. Ba exit code khác nhau, ba câu khác nhau.

## FM-32 · Gate đẩy người sửa tới chỗ ĐỔI NGHĨA, không phải rút gọn

**Triệu chứng:** `storyboard-gate` G1 đỏ vì một chuỗi chữ trên hình lặp lời đọc. Lane sửa, gate xanh,
mọi thứ trông như đã xong — nhưng câu trên hình nay nói một điều khác. Ca thật: bia đá
`suy luận logic tổng quát — không đủ` bị rút thành `logic tổng quát ≠ thế giới thật`. Dấu `≠` chỉ
nói **KHÁC**, không nói **KHÔNG ĐỦ**; owner bắt được khi đọc lại và trả về.

**Cách đo:** không có cách máy nào. Gate so **chuỗi ký tự** giữa `onScreen` và `text` của cue; nó
không có khái niệm nghĩa, nên mọi cách làm chuỗi khác đi đều làm nó xanh — kể cả cách làm sai.

**Cách sửa:**
- **Mọi chuỗi bị gate đẩy đổi phải qua mắt owner** trước khi khoá. Gate xanh không phải nghiệm thu.
- Rút gọn đúng là **bỏ chữ**, không phải thay ý: `không một dòng luật nào được viết ra` →
  `0 dòng luật`. Hình nói phần hình, phụ đề nói phần lời.
- Phần tử **CỐ Ý lặp lời** (bia khắc, end-card) khai `kind: "plaque"|"endcard"` trong
  `storyboard.json` để được miễn G1 **theo thiết kế** — đó là cách đúng, không phải bẻ chữ cho qua.

**Lớp lỗi chung:** một gate chỉ nhìn được hình thức thì sức ép của nó sẽ đẩy người sửa đi đổi nội
dung. Gate nào có thể bị "qua" bằng cách viết lại thì phải có một cổng người ở ngay sau nó.

## FM-33 · Điều kiện bỏ qua viết cho MỘT ca im lặng nuốt cả một lớp lỗi khác

**Triệu chứng:** check "chữ mang nghĩa < 22px" của `qa-layout` không báo gì, trong khi trên video
thật có nhãn co xuống tới mức không đọc nổi và nằm như thế hàng giây.

**Cách đo:** check có một điều kiện bỏ qua hợp lý — `settling: scale < 0.95` — viết cho nhịp `pop`
0,4–0,7s, để không kêu về chữ đang trong lúc phóng to. Nhưng (a) một nhóm bị `scale(pull)` chạy
1 → 0,42 **kéo dài nhiều giây** cũng thoả điều kiện đó, và (b) sân khấu poster **luôn** ở
`scale(1.2)` nên cỡ chữ thật = `font-size` × tích mọi `scale` tổ tiên. Kết quả: điều kiện bỏ qua
đúng ở **MỌI frame**, và check im lặng suốt.

**Cách sửa (đã áp):** check mới **`NHỎ KÉO DÀI`** — đo cỡ chữ THẬT (font-size × tích mọi scale tổ
tiên) và chỉ báo khi **cùng một chuỗi nhỏ xuất hiện ở ≥2 frame mẫu**, tức là nhỏ *kéo dài* chứ không
phải nhỏ *trong lúc chuyển động*. Luật dựng kèm theo: nhãn nằm trong nhóm bị `scale` xuống phải fade
ra TRƯỚC khi chữ rơi dưới ngưỡng đọc (`styles/poster.md` §5).

**Còn nợ:** hạ `--per-cue` xuống 1 thì "≥2 frame mẫu" không bao giờ thoả và check này mất tác dụng
mà **không có gì canh**. Chưa có gate nào chặn việc hạ `--per-cue`.

**Lớp lỗi chung:** mỗi điều kiện bỏ qua là một lỗ. Viết nó cho một ca cụ thể thì phải kiểm xem ca
nào khác cũng lọt qua — và tốt nhất là kiểm bằng cách phá thứ nó đáng lẽ phải canh, xem nó có đỏ.

## FM-34 · `External data path escapes model directory` khi nạp model ONNX tải bằng huggingface_hub

**Triệu chứng:** kernel Kaggle chết ngay ở bước nạp model, trước khi sinh được một câu nào:
`onnxruntime … External data path escapes model directory`. Đọc log thì file trọng số **có** nằm
trong thư mục cache, đường dẫn **có** tồn tại — nên dễ kết luận nhầm là tải thiếu file.

**Cách đo:** `ls -l` thư mục cache trong kernel. `huggingface_hub` mặc định KHÔNG copy file: nó tạo
**symlink** từ `…/snapshots/<rev>/model.onnx` trỏ về `…/blobs/<sha>`. Một model ONNX lớn để trọng số
ở file *external data* riêng; onnxruntime giải đường dẫn đó rồi kiểm "có còn nằm trong thư mục model
không" — symlink trỏ ra `blobs/` nên câu trả lời là KHÔNG, và nó từ chối. Đây là kiểm tra an toàn
của onnxruntime, không phải bug của nó.

**Cách sửa (đã áp, `tools/voice-zerotts.mjs`):** tải THẬT ra một thư mục phẳng, không symlink —

```python
local = snapshot_download(repo_id="zeroweight-ai/ZeroTTS", local_dir="zerotts_model",
                          local_dir_use_symlinks=False)
tts = ZeroTTS.from_pretrained(local)
```

**Lớp lỗi chung:** thư viện cache bằng symlink + thư viện khác kiểm "file có nằm trong thư mục X
không" là một cặp xung khắc im lặng. Gặp lỗi đường dẫn mà đường dẫn nhìn vẫn đúng → kiểm xem có
symlink ở giữa không, đừng đi tải lại.


## FM-36## FM-36 · Trang clip Pexels đứng ở trang chặn bot của Cloudflare

**Triệu chứng:** trang tìm kiếm Pexels mở được, nhưng mở **trang chi tiết của một clip** thì tiêu đề
thành `Just a moment...` và nội dung là "Performing security verification … Ray ID … Cloudflare".
Chờ 4s, 9s, 20s đều không đổi.

**Cách đo:** đọc `document.title` + `document.body.innerText` sau mỗi lần chờ. Nội dung không đổi
một chữ qua ba lần chờ ⇒ không phải trang đang tải chậm, mà là đang bị chặn.

**Cách sửa:** **đừng retry.** Sang một nguồn khác trong cùng bảng license đã soát của
`visual-assets.md §3` — Pixabay Video hoặc Coverr; cả hai mở được trang chi tiết và trang license.
Quy trình §3 chỉ đòi "mở đúng trang clip và ĐỌC license tại thời điểm tải", không đòi đúng Pexels.

**Lớp lỗi chung:** một trang chặn bot trả **HTTP 200** kèm nội dung hợp lệ, nên mọi phép kiểm "tải
được không" đều xanh. Kiểm nội dung (có đúng thứ mình cần không), đừng kiểm mã trạng thái.

## FM-37 · Hai chữ đè nhau suốt mấy giây mà gate bố cục im lặng vì một bên đang mờ

**Triệu chứng:** owner nhìn frame trích từ MP4 thấy một dòng chú thích đè lên một nhãn khác; chạy
`qa-layout` trên ĐÚNG frame đó vẫn ra "không lỗi bố cục".

**Cách đo:** dump chính mảng `texts` mà probe trả về ở frame đó. Ca thật (f6943, video demo): nhãn
`BERT` đang ở `dim = 0.32`, mà probe có dòng `if (op < 0.35) continue` — nhãn bị loại ngay trong
trang, nên cặp "BERT × dòng chú thích" (chồng 48×14 px) không bao giờ được so.

**Hai lỗ, không phải một:**
1. **Ngưỡng opacity.** 0,35 dựng để bỏ qua "lớp phủ chưa fade vào". Nhưng chữ kem ở 32% trên nền
   đêm vẫn ĐỌC ĐƯỢC — hai chữ đọc được chồng nhau là lỗi, dù một bên mờ.
2. **Mật độ mẫu.** Nới ngưỡng xong, phép đo bắt được ở frame chỉ định, nhưng mật độ mặc định
   (3 frame/cue) chỉ trúng ĐÚNG MỘT frame trong cửa sổ va chạm, và luật "≥2 frame mẫu mới kết luận"
   lại nuốt mất nó. Vá một lỗ mà không vá lỗ kia thì gate vẫn im.

**Cách sửa (đã áp, `tools/qa-layout.mjs`):** thêm `FAINT_MIN = 0.25` dùng RIÊNG cho phép CHỮ ĐÈ CHỮ
(mọi phép đo khác giữ `VISIBLE_MIN = 0.35`, video cũ không đổi kết quả); cặp có một bên mờ thì báo
`CHỮ ĐÈ CHỮ MỜ` và chỉ kết luận khi va chạm còn ở ≥2 frame mẫu — nếu mới trúng một frame thì hỏi
thêm đúng hai frame quanh nó (`±12`) rồi mới kết luận.

**Lớp lỗi chung:** một bộ lọc chống báo giả và một luật "cần ≥2 mẫu" chồng lên nhau tạo ra vùng mù
mà không bộ nào tự thấy. Mỗi lần thêm một điều kiện bỏ qua, phải hỏi "điều kiện này cộng với điều
kiện đã có thì nuốt mất lớp lỗi nào" — và kiểm bằng cách phá đúng thứ nó canh.

## FM-39## FM-39 · API ảnh trả 0 kết quả cho một truy vấn nghe rất đúng

**Triệu chứng:** `illustration-plan` chạy xong, báo "không tải được thumbnail nào", và `candidates
/<mục>.json` có `candidates: []`. Truy vấn nhìn thì rất hợp đề: `"1970s mainframe computer room tape
drives"`.

**Cách đo:** gọi tay cùng truy vấn rồi đọc `result_count`. Đo 21/09/2026 trên Openverse:

| truy vấn | kết quả |
|---|---|
| `1970s mainframe computer room tape drives` | **0** |
| `mainframe computer room` | 95 |
| `IBM 360 mainframe` | 40 |
| `computer 1970s` | 240 |

Cả Openverse lẫn Commons khớp theo **TỪ KHOÁ**, không hiểu câu: thêm một từ là thêm một điều kiện
AND, và 5–6 từ thì gần như luôn ra rỗng.

**Cách sửa (đã áp ở tool `illustration-plan` cũ; đường ảnh nay là `tools/image-search.mjs`, luật giữ nguyên):** in SỐ kết quả của TỪNG truy vấn kèm gợi ý
"thử cụm NGẮN hơn (2–3 từ)" khi ra 0. Người viết `query` thấy ngay truy vấn nào chết, thay vì kết
luận "chủ đề này không có ảnh nào".

**Lớp lỗi chung:** một API trả 200 kèm mảng rỗng trông y hệt "không có dữ liệu". Tool gọi API phải
in ĐẾM cho từng lần gọi, không chỉ in tổng — tổng bằng 0 không nói được lỗi nằm ở truy vấn nào.

---

## Checklist Stage 3 — tám lỗi lặp lại (QA video d1, 09/2026)

> Gộp về đây từ `SKILL.md` (remote commit `5a65c37`) để chỉ có MỘT chỗ. Mỗi cảnh phải đi qua đủ tám
> mục này trước khi chụp QA. Ba mục cuối đã có check máy: `verify` (cờ quiz), `lib/captions.js`
> `paginate` (ngắt trang), `qa-layout` (nhãn kẹp viền).

1. `HookOverlay` hides scene 1 under a white backdrop for its first 96–150 f, and `spokenAt` is fixed by the
   voice: clamp every beat anchored to a phrase spoken during the hook (`Math.max(spokenAt(N, …), T.hook)`)
   or shorten the hook until the first anchored phrase lands after the fade-out.
2. No meaningless placeholders (grey bars, empty boxes, blank app windows) standing through a câu while the
   narration names the content: dashed slots only when the script says "chưa biết / sẽ có" — otherwise
   fill them with the words being spoken.
3. Never draw a connector or particle to an empty slot: card first, particle after, one pulse.
4. Labels ≥ 24 px from any outline and ≥ 32 px from other text — never wedged between two borders or
   touching a pill / card edge; the câu's key concept is the biggest text in the diagram (`GlassBox`'s
   `label` pill, not a loose 18 px text label of your own).
5. Cards start inside the frame and move along an empty lane — never slide in from outside across another
   card's face.
6. Consecutive câu on one diagram inherit the frame and change only the text — keep positions, colors and
   label names; no wipe-to-white and redraw in the same place (a blank second).
7. Captions: read each câu's pages with `paginate` from lib/captions.js (verify prints only the video's
   total) and re-read every break before "từ / cho / bên"; a break that changes the meaning goes back to
   Stage 1 — never edit the narration here.
8. `quiz: true` only on the `silent` cue (Stage 1 rule); `npm run verify` now reports a problem when it sits
   on a spoken câu.
