# Brief — lane `script` (dán nguyên, điền `<…>`)

Bạn viết **lời dẫn**, không dựng cảnh, không đụng code. Đọc `.claude/skills/make-video/SKILL.md` rồi
`script-craft.md`. Không đọc gì khác trừ khi hai file đó trỏ tới.

## Việc
Video `<id>` · Ngày `<N>` · vị trí trong buổi: `<tổng quan | module thứ mấy | cuối buổi>`.
Yêu cầu: `projects/<id>/REQUEST.md`.

## Đầu vào tối thiểu (chỉ dùng những thứ này)
- Nguồn nội dung: `<đường dẫn slide .pdf/.pptx>` + `<URL/đường dẫn trang e-learning>`.
- Video khác cùng buổi đã có: `<danh sách id>` — đọc `kich-ban-goc.md` của chúng để không trùng.
- `pronounce-verified.json` (gốc repo) — từ nào đã xác nhận cách đọc.
- Nhịp đọc: chạy `node tools/voice-pace.mjs` và dùng số nó in ra. **Cấm ước bằng "từ/phút" của
  nguồn ngoài** — lần trước sai 1,5 lần và cả 21 cảnh phải tính lại (E1).

## Đầu ra bắt buộc — một file `projects/<id>/loi-dan.md`, đúng 5 mục theo thứ tự này
1. **§1 Văn xuôi liền mạch** — owner sẽ ĐỌC TO bản này. Ghi chú cảnh để trong backtick (không đọc).
   Không chia ô cảnh. Câu mở mỗi đoạn phải bắt vào câu vừa kết đoạn trước.
2. **§2 Bảng cue + `pauseAfter`** — nguyên văn từ §1, không thêm một chữ. Không `(nghỉ …)` giữa
   dòng: muốn nghỉ thì TÁCH cue tại đó (E5).
3. **§3 Output thật của `node tools/text-gate.mjs`** dán vào, không tóm tắt lại.
4. **§4 Fact-check** — từng khẳng định có số/năm/tên, kèm nguồn. Kể cả khẳng định lấy từ nguồn của
   sếp (E9: "cả ngành hội tụ về trục Transformer" là sai).
5. **§5 Phát âm** — MỌI từ tiếng Anh và tên riêng trong lời, kèm phương án dự phòng. Không có dự
   phòng thì đừng đưa từ đó vào lời (E6).

Kèm một file thứ hai: **`projects/<id>/storyboard.json`** — phần bạn quyết được ở bước này là
**chữ trên hình** và **mốc nhấn**: mỗi cảnh ghi `metaphor`, `beats: [{ cue, anchor }]` (`anchor` là
cụm từ CÓ THẬT trong `text` của cue đó) và `onScreen: [{ text, kind? }]`. Chữ trên hình **không lặp
lời đọc** — hình nói phần hình, phụ đề nói phần lời; phần tử cố ý lặp (bia khắc, end-card) khai
`kind: "plaque"|"endcard"`. `node tools/storyboard-gate.mjs --video <id>` kiểm cả ba luật đó.

- **`prev:`** `<id video liền trước>` + **một câu** nói rõ ý/hình ảnh nào của nó sẽ được gọi lại.
  Không có video trước → `prev: KHÔNG CÓ (video đầu series)`.
- **`next:`** `<tên nguyên văn mục kế tiếp trên LMS>` + URL đã đọc + **ngày đọc**.
  Không xác định được → `next: KHÔNG RÕ` + câu gợi mở trung tính (`script-craft.md` §3i.2).
  **Không bịa tên bài sau** — học viên sẽ đi tìm cái không tồn tại.
- **`quiz: 3`** — ba câu trắc nghiệm ở cuối, không giải thích (§3i.3). Kèm `quiz-track` chọn từ
  `music.json`. Ba thứ này làm video dài thêm ~90 giây: tính vào ngân sách độ dài từ đầu.

## Ràng buộc
- Không có độ dài mục tiêu. Đừng cắt hay độn để về một con số.
- Wording đã khoá (nếu có `loi-dan-lock.md`): **không tự đổi**, kể cả khi thấy hay hơn.
- Một cue ≤ 9 giây nói. Chuỗi liệt kê: mỗi phần tử một cue, tối đa 2/cue.
- Không quá 2 cụm tiếng Anh trong một câu. Số viết bằng chữ.
- Toạ độ / hằng số nào bạn nêu phải kèm `file:dòng`, hoặc ghi `GIẢ THUYẾT`.
- **§6 Quiz** trong bản nộp: mỗi câu ghi **tình huống · ba lựa chọn · đáp án · ý của bài nó kiểm ·
  vì sao hai lựa chọn kia là lỗi THẬT**. Không viết phần giải thích cho người xem.

## Nghiệm thu
- `node tools/text-gate.mjs` xanh (hoặc vàng có giải thích từng dòng) **trước khi nộp**.
- Đọc to cả bài một lượt; phép thử xoá-một-câu đã chạy.
- **Kết thúc báo cáo bằng `ls -la projects/<id>/loi-dan.md` và `wc -l` của chính nó** (FM-28).
- Có gì bạn không kiểm chứng được thì mở đầu dòng đó bằng `CHƯA KIỂM CHỨNG ĐƯỢC:`.
- **Kết thúc việc = `node tools/trace-report.mjs --video <id> --stamp "<LANE-NN> · <stage> · <vai>"`**
  rồi điền thân mục (≤15 dòng, chín trường, có dòng `token:`). ĐỪNG gõ tiêu đề/giờ bằng tay. Nếu bạn tự viết một stage (`cues`/`scenes`/`deliver`)
  thì đóng ledger bằng `node tools/video-workflow.mjs run finish --video <id> --run-id <ID>
  --status done --input-tokens N --output-tokens N --model <tên>`. Không ghi = lần dựng sau
  không trace lại được (`node tools/trace-report.mjs --video <id>`).
- **Chờ lane khác = `node tools/handoff.mjs wait --video <id> <khoá> [--equals <v>]`**, KHÔNG chờ
  một mục TRACE xuất hiện. Xong phần của mình thì `handoff set` (vd `voice.state --value staged`).
  Cần server tĩnh: `npm run stage:serve -- --status` TRƯỚC khi mở cái thứ hai; tắt bằng `--stop`.
