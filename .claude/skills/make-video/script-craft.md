# Script craft — vai `script`. Đọc `SKILL.md` rồi file này, không cần gì khác.

> File này sinh ra từ một lần dựng hỏng có thật (Ngày 5, 13/09/2026 — FM-01) và một lần lời dẫn bị
> chê thiếu tính người (21/09/2026 — retro E10).
> Ví dụ dài · ca cụ thể · lịch sử luật đã bỏ: `script-craft-appendix.md`, mở khi cần.
> Khuôn brief và khuôn nộp: `templates/briefs/script.md`.

## 1. Nguồn sự thật — hai nguồn, hai vai trò khác nhau

**Slide** cho CẤU TRÚC và số liệu; **bản ghi buổi học / e-learning** cho CHẤT NÓI và ví dụ. Thiếu
một trong hai thì nói thiếu, đừng bù bằng suy đoán. Bảng ánh xạ `e-learning ↔ slide`, cách xử lý khi
hai nguồn lệch nhau, và ca đã hỏng thật: `script-craft-appendix.md` §A10.


Lane **research** (read-only, tách khỏi lane viết lời) trả về bốn thứ, và lane viết lời dùng kết
quả đó làm input thay vì đọc lại nguồn: `script-craft-appendix.md` §A7.

## 2. Xưng hô — chốt cho mọi video

Người dẫn là **mascot chim**, xưng **mình**, gọi người xem là **các bạn**. Hiện là kiểu duy nhất.

- **Không tường thuật lại lời giảng viên.** Viết "Có hai kiểu thất bại", đừng viết "Thầy gom về hai
  kiểu thất bại". Người dẫn nói thẳng với người xem, không đứng giữa làm phiên dịch.
- Mascot giáo sư đã bị **bỏ** (14/09/2026). Chưa có giọng thứ hai thì đừng viết hội thoại 2 vai rồi
  đọc bằng một giọng — nghe sẽ giả.

## 3b. Thời lượng và mạch kể

- **Không có độ dài mặc định, không có độ dài mục tiêu.** Thời lượng là bất cứ gì nội dung cần và
  voice đo được ra. Chỉ khi `REQUEST.md` ghi rõ một khoảng phút (vì ràng buộc thật bên ngoài) thì
  `npm run verify` mới gate theo đúng khoảng đó — ngoại lệ, không phải mặc định.
- **Ước thời lượng bằng `node tools/voice-pace.mjs --estimate <nháp>`**, cấm dùng "từ/phút" của
  nguồn ngoài. Lần trước lấy "3,08 âm tiết/giây" từ ghi chú trong storyboard nguồn; giọng harness
  đọc **5,0–5,2** — ước 4:40, đo thật 3:08, sai 1,5 lần, và cả 21 cảnh phải tính lại `dur` sau khi
  đã dựng xong hình (E1).
- Chọn một tình huống hoặc nhân vật xuyên suốt. Hook tạo một câu hỏi; mỗi phần trả lời thêm một
  lớp; phần kế tiếp bắt đầu từ hệ quả còn thiếu; kết bài quay lại đúng tình huống mở đầu.
- Mỗi cue phải đứng được như một câu nói, nhưng không được đứng riêng như bullet. Câu đầu của phần
  mới phải móc vào từ khoá, hệ quả hoặc câu hỏi của phần trước.
- Đan câu ngắn, vừa và dài theo đơn vị cue: ngắn ≤15 từ, vừa 16–22 từ, dài ≥23 từ. Không để quá 3
  cue ngắn liên tiếp.
- **Có HAI luật mở-đầu-lặp, đừng lẫn:** (a) **liên tiếp** — ba cue liền nhau cùng mở đầu hoặc cùng
  cấu trúc là phải viết lại; (b) **toàn bài** — cùng một từ mở đầu lặp quá nhiều lần trong cả video
  là văn công thức. `text-gate`/`verify` đếm cái nào, ngưỡng bao nhiêu thì đọc chính output của nó —
  đừng nhớ số trong đầu rồi tự chấm.
- **Một cue không được dài quá một hơi đọc — trần ~9 giây nói.** Đo trên 514 cue thật: **p90 8,0s ·
  p95 10,3s**, tức vượt 9s là đã nằm ngoài nhịp của gần như cả catalogue. `n5-06` có 25 cue > 9s,
  dài nhất 15,5s → hụt hơi, caption bị cắt giữa từ ghép (FM-10); mọi video KHÔNG bị chê nhịp đều
  ≤7,6s. `verify --video <id>` và `text-gate` đều bắt luật này.
- Trước TTS, đọc liền không nhìn số cue. Nghe ra ranh giới cue, hoặc đảo được hai đoạn mà ý không
  đổi → mạch kể chưa đạt.
- Buổi học có ≥2 video → đọc `script-craft-appendix.md` A2 (neo đầu/cuối vào chuỗi video).

## 3d. Thuật ngữ tiếng Anh: viết trên hình, nói bằng tiếng Việt

Chữ trên hình giữ thuật ngữ gốc; **lời đọc luôn là tiếng Việt**. Không quá 2 cụm tiếng Anh trong
một câu, và cụm nào cũng phải có phương án phát âm (`pronounce.json` hoặc viết lại bằng tiếng
Việt). Số viết bằng chữ. Bảng đầy đủ (từ nào dịch, từ nào giữ, cách Việt hoá từng lớp, ca đã hỏng
thật): `script-craft-appendix.md` §A8.

## 3e. Định nghĩa vấn đề trước khi đưa giải pháp

Feedback thật từ học viên (16/09/2026): "chưa define được bài toán thì đã đến đoạn đưa solution rồi"
(FM-17). **Luật:** với mỗi khái niệm/kỹ thuật mới, lời đọc phải nêu đủ **ba điều trước khi nhắc tên
giải pháp**: (1) ai gặp vấn đề này, trong tình huống nào; (2) hậu quả cụ thể nếu không giải quyết —
đo được hoặc quan sát được, không phải "sẽ không tốt"; (3) vì sao cách thông thường không đủ. Nêu
tên giải pháp ở cue đầu rồi mới quay lại giải thích vấn đề ("giải thích ngược") là phải viết lại.

**Thuật ngữ không phổ thông phải có định nghĩa bằng lời, không chỉ có ví dụ.** Đúng: "POC là kiểm
tra xem một thứ có làm được về mặt kỹ thuật không, chưa cần đẹp hay đầy đủ" rồi mới tới "ví dụ: thử
xem model có tóm tắt đúng văn bản pháp lý không". Thiếu câu định nghĩa, chỉ có ví dụ, là chưa đạt.

## 3f. Tính người: ngắt nghỉ và filler tự nhiên

Yêu cầu thật từ chủ repo (16/09/2026): tăng cảm giác người thật đọc, vẫn giữ chuyên nghiệp.
**OmniVoice không có tag SSML** — không `[pause]`, `[break]`, `[um]`: ngắt nghỉ và filler phải viết
thẳng vào chữ. (Kết quả probe các tag khác: `voice-kaggle.md`.)

> **E5 · Nghỉ chỉ đặt được ở CUỐI cue.** Harness có đúng một chỗ: `pauseAfter` của cue. Viết
> `(nghỉ 0.5s)` vào `text` thì TTS **đọc thành tiếng chữ "nghỉ"**. Muốn nghỉ giữa một câu dẫn thì
> **TÁCH cue tại đúng chỗ đó**. Bản nháp nộp lên **không được còn một dấu `(nghỉ…)` nào**.

> **E22 · `pauseAfter` KHÔNG phải khe tai nghe thấy — đừng khai nhịp bằng nó.** Khai **loại khe**,
> để máy tính ngược ra `pauseAfter`: sáu loại ở `tools/lib/voice-gaps.mjs` (`tight` · `beat` ·
> `count` · `punch` · `scene` · `chapter`). Máy tự suy ranh giới chương/cảnh, chuỗi đếm, câu
> hỏi/câu mời gọi. Thứ máy KHÔNG suy được là "đâu là câu chốt" — chỗ đó vai `script` khai tay đúng
> một trường `gap: 'punch'` trong `cues.js`, và khai tay thắng phần suy. Bật bằng
> `voice-import.mjs … --gaps`; không bật thì đường cũ chạy y nguyên.
> Số đo đã làm nên luật này (ba bậc nhảy, thí nghiệm nghe mù): `script-craft-appendix.md` §A6.

Cách viết, ngắn gọn:
- **Nhịp dừng** bằng dấu phẩy, `…`, `—` ở đúng điểm nhấn (trước một con số, trước một cú twist,
  trước câu chốt). Câu nào cũng chêm thì mất tác dụng.
- **Filler** (`à`, `ừm`, `ờ`) viết như chữ thường, rất hạn chế, ở chỗ người nói đang dừng lại nghĩ
  hoặc chuyển ý. KHÔNG ở câu mở đầu video, KHÔNG ở cue chứa số liệu/định nghĩa (nghe thiếu chắc
  chắn). Đúng: "Ừm, để mình kể một case cụ thể hơn." Sai: "Ừm, POC là proof-of-concept."
- **Cụm đệm** `kiểu` (trước một cách diễn đạt gần đúng) và `ý là` (trước phần nói lại cho rõ) — chỉ
  dùng khi diễn giải SAU khi đã định nghĩa, không dùng hai lần liên tiếp ở hai cue sát nhau.
- **Từ nối mở đoạn** bản Việt, xoay vòng không lặp: "À mà,", "Thôi,", "Được rồi,", "Giờ thì,".
- **Cảm xúc nằm trong CHỮ**, không nằm trong giọng model: câu mang phản ứng cá nhân (ngạc nhiên,
  hoài nghi, hào hứng), câu hỏi tu từ, câu twist ngắn — xen vào đúng lúc chuyển ý, không rải đều.

**Đo bằng máy, đừng đo bằng cảm giác:**
```console
node tools/text-gate.mjs --human <cues.js|nháp.md>     # --all: cả catalogue · --fixture: đối chứng v1↔v2
```
Nó in **năm chỉ số "tính người"** — *cue mồ côi · tiếng đệm · ngôi xưng · câu phản ứng cá nhân ·
câu hỏi* — kèm ngưỡng đang dùng. **Ngưỡng sống trong code, không chép vào tài liệu**: đọc đúng con
số tool in ra ở lượt chạy của mình. Đây là mức CẢNH BÁO, không phải sự thật; nhưng đây chính là bộ
số duy nhất tách sạch được bản v1 (bị chê thiếu tính người) khỏi bản v2, nên đừng bỏ qua khi nó
vàng — đọc câu giải thích tool in kèm mỗi dòng đỏ rồi sửa đúng chỗ đó.

**QA bắt buộc:** nghe thử audio thật sau TTS, xác nhận filler/ngắt nghỉ nghe tự nhiên chứ không
gượng. Nghe gượng thì bỏ bớt, đừng cố giữ cho đủ.

## 3g. Nộp VĂN XUÔI trước, chia cue sau (E10 — phần lõi, đừng bỏ)

Bản v1 viết theo **ô cảnh**: mỗi cảnh một khối kín, câu đầu cảnh không bắt vào câu cuối cảnh trước.
Gọn, qua hết gate — và chết. Thái xem xong nói thiếu tính người và các câu không nối vào nhau.

- **Nộp §1 là một bài văn xuôi liền mạch**, đọc to từ đầu đến cuối được. Bảng chia cue là §2, làm
  SAU, và chỉ là việc cắt bài văn đó thành cue.
- **Luật "câu sau bắt vào câu trước":** câu mở một cảnh phải dùng lại một chữ/ý của câu vừa kết cảnh
  trước.
- **Phép thử xoá-một-câu:** xoá một câu bất kỳ, hai câu kẹp nó phải đọc ra hơi sượng. Không sượng
  thì câu đó chỉ là kê, bỏ được — hoặc cả đoạn đang là danh sách chứ không phải mạch kể.
- **Không cắt chất nói của nguồn để lấy độ gọn.** Gọn hơn, và chết hơn.
- **Owner đọc to liền một mạch** trước khi khoá — duyệt bằng mắt trên bảng cue sẽ không phát hiện
  được mạch gãy, vì bảng vốn đã chia sẵn thành ô.

Ví dụ cụ thể cho bốn gạch đầu dòng trên: `script-craft-appendix.md` A4.

## 3h. Chạy `text-gate` trên bản nháp TRƯỚC khi nộp (E4)

```console
node tools/text-gate.mjs <cues.js hoặc nháp>
```
Lần trước script khoá xong mới biết đỏ, implement lane phải gộp 6 tách 3 khi chữ đã khoá.

## 3i. Mở nối bài trước · kết gợi bài sau · ba câu trắc nghiệm

**Bắt buộc với mọi video trong một series** (Thái, 22/09/2026, sau khi xem `d05-v06` 10:54: lời và
giọng đạt, nhưng video "đứng một mình"). Khai ở `REQUEST.md`: `prev:` · `next:` · `quiz: 3`.

**1. Mở phải NỐI, không phải TÓM TẮT.** Gọi lại **đúng một** ý hoặc hình ảnh người học vừa gặp ở
video liền trước, rồi nói **vì sao hôm nay phải xem tiếp**. Câu nối là một *lý do*, không phải một
*lời chào*. Đặt **sau** cold open — hook đáp trước, nếu không video mở màn bằng thủ tục. Câu cuối
đoạn nối phải bắt vào chữ mở đầu chương một (§3g). Cảnh đặt tên `intro-link`.
- ✅ *"Video liền trước khép lại bằng ba câu hỏi trước khi chọn cách làm. Câu thứ ba: phần khó nhất
  có giả bằng tay được không? … Mà thật ra hôm nay là chỗ cả hai cái đó gãy."*
- ❌ *"Ở video trước chúng ta đã học về prototype, pilot, MVP và POC. Hôm nay chúng ta sẽ học về…"*
  — tóm tắt bài cũ rồi đọc mục lục bài mới; không cho người xem lý do nào để ở lại.
- **Ngoại lệ:** video ĐẦU series → nối vào câu hỏi lớn của cả khoá, **không bịa ra một bài trước**.

**2. Kết phải GỢI phần sau, bằng NGUỒN THẬT.** Xác định phần kế tiếp bằng **trang LMS của buổi**,
không bằng trí nhớ. Trích **nguyên văn** tên mục cho chữ trên hình; lời đọc Việt hoá theo §3d.
Không tìm được thì ghi `KHÔNG TÌM THẤY` trong `kich-ban-goc.md` và viết một câu gợi mở **trung
tính** — **tuyệt đối không bịa tên bài sau**, học viên sẽ đi tìm cái không tồn tại. Cảnh `outro-next`.
- ❌ *"Hẹn gặp lại các bạn ở video tiếp theo nhé!"* — không nói được tiếp theo là gì.
- **Đừng trỏ vào phần mà video này đã dạy xong** — nghe như lặp.
- **Ngoại lệ:** video CUỐI buổi/series → gợi mở về **việc áp dụng**, không gợi một bài không có.

**3. Ba câu trắc nghiệm ở cuối, KHÔNG giải thích.** Mỗi câu là **một tình huống sản phẩm ngắn** —
không hỏi định nghĩa, không hỏi "theo video thì…". Ba lựa chọn, **đúng một đáp án**, phủ ba ý lớn
nhất của bài (mỗi câu một chương khác nhau). Đọc câu hỏi → lựa chọn thật gọn → **một khe lặng cho
người xem nghĩ** → đáp án bằng một câu ngắn. Hết. Lý do sai nằm ở chính bài.
- **Lựa chọn sai phải là lỗi THẬT** — lấy thẳng từ các `Don't` trong bài, hoặc lỗi ngược chiều.
  ❌ *"hiện một con mèo"* — phương án ngớ ngẩn biến trắc nghiệm thành câu hỏi một lựa chọn.
- **Không đọc "A · B · C"** — chữ cái đơn là từ tiếng Anh ngắn (§3d) và `voice-risk` gắn cờ. Đọc
  **"Một · Hai · Hoặc ba"**; chữ trên hình đánh số `1 2 3` cho khớp.
- **Hai lựa chọn một cue, lựa chọn thứ ba một cue riêng.** Ba cue riêng + cue lặng + cue đáp án =
  6 cue ngắn liên tiếp, `text-gate` đỏ thật (đã gặp 22/09/2026).
- `quiz: true` chỉ đặt ở **cue lặng**, cuối entry. Cảnh đặt tên `quiz-1/2/3`, chữ trên hình khai
  `kind: "quiz"` (chúng CỐ Ý chép lời đọc). Gate: `storyboard-gate` G7.

**Cả ba thứ này LÀM DÀI video.** Đo trên `d05-v06`: `intro-link` 23,8 s + quiz 54,4 s +
`outro-next` 18,7 s = **+97 giây**. Tính vào ngân sách từ đầu, đừng cắt nội dung chính để bù.

**Chỉ số "tính người" tính trên phần TRẦN THUẬT.** 26 cue quiz không có (và không nên có) câu phản
ứng cá nhân; `text-gate --human` in riêng một dòng bỏ cảnh `quiz-*` + cue `silent`. Đừng chêm tiếng
đệm vào câu hỏi trắc nghiệm cho "đủ chỉ số".

## 4. Anti-pattern — dấu hiệu văn AI, sửa ngay khi thấy

"Văn AI" ở harness này đến từ **cấu trúc**, không từ từ vựng — đã đo 21/09/2026 (39 cụm sáo ngữ,
1,7 hit/video). Đừng mở rộng bảng này thành từ điển sáo ngữ.

| Dấu hiệu | Ví dụ hỏng | Sửa thành |
|---|---|---|
| Câu cụt, liệt kê khô | "Module 2: viết PRD cho AI feature." | "Qua phần hai — viết PRD. Nhưng PRD cho AI thì khác PRD thường lắm nha." |
| Thuật ngữ không kèm ví dụ | "test bằng bậc fidelity rẻ nhất" | "...cả nhà có thể tự đóng giả AI, ngồi trả lời tin nhắn học viên bằng tay một buổi." |
| Thuật ngữ không phổ thông chỉ có ví dụ, thiếu định nghĩa (FM-17) | "Ví dụ: thử xem model có tóm tắt đúng văn bản pháp lý không" | "POC — kiểm tra xem một thứ có làm được về mặt kỹ thuật không, chưa cần đẹp. Ví dụ: ..." |
| Nêu giải pháp trước khi định nghĩa xong vấn đề (§3e) | "Hôm nay mình nói về Wizard of Oz MVP." rồi mới giải thích vì sao cần | Nêu ai gặp vấn đề gì, hậu quả nếu không giải quyết, rồi mới đặt tên giải pháp |
| Tính từ thay số liệu | "nhanh hơn đáng kể" | "trả lời trong dưới 5 giây ở p95" |
| Không cảm xúc cá nhân | "Điều này rất quan trọng." | "Đây mới là chỗ nhiều team vấp." |
| Mọi câu cùng độ dài | 17 câu đều 12-15 từ | Xen câu 4 từ vào giữa các câu dài. |
| Một pose mascot xuyên suốt | `idle` cả video | Đổi pose + emotion theo ý từng câu (`visual-assets.md` §9). |
| Nói về code/prompt/API/log mà không có minh hoạ đúng dạng | "AI nhận input rồi gọi tool để lấy dữ liệu." | Cho xem đúng thứ đang nói: `CodeBlock` · `JsonView` · `LogCard` (`visual-assets.md` §10) |
| Ví dụ chung chung, không định danh được | "một công ty gọi vốn thành công" | Case có tên thật, số liệu thật (DoorDash 2013, Fireflies.ai $5M — §1b, FM-22) |

## 6. Checklist trước khi chốt lời

Bảng đầy đủ ở `script-craft-appendix.md` §A9 — mở nó ra và tick từng dòng trước khi nộp.
Ba dòng không được bỏ qua: `text-gate` + `--human` xanh · đã ĐỌC TO liền một mạch ·
`prev`/`next`/`quiz` của §3i đã có mặt trong `cues.js`.
