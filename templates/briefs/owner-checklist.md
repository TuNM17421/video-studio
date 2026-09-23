# Owner checklist — thứ owner phải TỰ làm ở mỗi cổng

Không giao đi được. Mỗi dòng tương ứng một lỗi đã xảy ra thật.

## Cổng 0 · Trước khi giao bất cứ lane nào

- [ ] Đọc kịch bản từ đầu đến cuối. **DỪNG LẠI HỎI** nếu: file chứa nhiều video/phần (bảng V0–V3,
      nhiều dòng "Tổng") · id mơ hồ (`d2-v2` = video V2 hay bản v2 của d2?) · kịch bản sai dạng
      (không lời đọc, chỉ storyboard, transcript video cũ, cụt giữa cảnh) · nội dung sai (cảnh trùng,
      placeholder, số liệu kịch bản bắt hiện mà không nêu, chỉ dẫn phá design system). Trích đúng
      dòng làm mình dừng, nêu cách hiểu mình cho là đúng, rồi chờ.
- [ ] **Hỏi Thái HAI CÂU TÁCH RỜI, không hỏi gộp "poster hay slide":**
      (1) *"Ngôn ngữ chuyển động nào?"* → `motion: poster | slide`
      (2) *"Nền và màu theo mẫu VinUni như mọi video, hay khác?"* → `theme: vinuni-light | night`
      **`vinuni-light` (NỀN TRẮNG + bảng màu VinUni) là mặc định và là nhận diện bất biến của
      series.** Chỉ ghi `night` khi Thái nói rõ, và chép nguyên văn câu đó vào "Ghi chú".
      Hỏi gộp một câu ngày 22/09/2026 → hiểu "poster" = cả nền đêm → **≈0,75M token + 1h50** để
      re-theme 36 cảnh đã dựng xong.
- [ ] Chốt `prev:` · `next:` · `quiz: 3` · `quiz-track:` trong `REQUEST.md` — ba thứ này là LUẬT
      của series (`script-craft.md` §3i), không phải tuỳ chọn, và chúng làm video dài thêm ~90 giây
      nên phải vào ngân sách độ dài TỪ ĐẦU.
- [ ] Ghi câu trả lời vào `REQUEST.md` mục "Phạm vi" trước khi ai dựng cảnh.
- [ ] **PROBE phải chụp trên THEME SẼ GIAO**, và đặt cạnh một frame của video chuẩn cùng series
      (`n5-01` …). Probe trên theme khác = probe vô nghĩa: nó không trả lời được câu "cái này có
      cùng nhà với các video kia không".

## Cổng 1 · Nhận bản script

- [ ] `ls -la projects/<id>/loi-dan.md` **trước khi đọc báo cáo của lane** (FM-28).
- [ ] **Đọc to §1 văn xuôi liền một mạch.** Duyệt bằng mắt trên bảng cue không lộ ra mạch gãy, vì
      bảng đã chia sẵn thành ô (E10). Chỗ nào ngượng miệng là chỗ phải sửa.
- [ ] Tự chạy `node tools/text-gate.mjs` — đừng tin output lane dán vào.
- [ ] Fact-check các khẳng định, **kể cả khi nguồn là lời của sếp** (E9).
- [ ] Khoá wording bằng **file delta** `projects/<id>/loi-dan-lock.md` (chỉ chỗ đổi + lý do) — không
      viết lại cả script, không nhét vào cuối `kich-ban-goc.md`.

## Cổng 2 · Trước khi tiêu tiền / GPU cho giọng

- [ ] MỌI từ tiếng Anh và tên riêng đã có phương án dự phòng phát âm (E6)? Không còn dấu `(nghỉ…)`
      nào trong `text` (E5)? Đã xem dry-run và đồng ý, nếu là ElevenLabs?

## Cổng 3 · Nhận bản dựng cảnh

- [ ] Tự chạy `qa-layout` và `verify`, đừng đọc lại exit code của lane.
- [ ] **Tự trích frame full-res 1920×1080 từ MP4** ở các mốc nhấn, mở từng cái ra nhìn. Contact
      sheet chỉ để nhìn bố cục tổng (FM-25).
- [ ] **Nghe các câu rủi ro** (có từ tiếng Anh, chuỗi liệt kê, số) — bằng tai, trên audio thật.
- [ ] **Soát NGHĨA từng chuỗi chữ trên hình mà gate đã đẩy lane đổi.** `storyboard-gate` G1 thấy
      chuỗi, không thấy nghĩa — rút gọn thì được, đổi nghĩa thì hỏng (FM-32).
- [ ] **Xem video phát LIÊN TỤC một lượt.** Nhịp chuyển động chỉ người xem được; mọi gate đo frame
      tĩnh, easing sai nghĩa và chuyển động không chạm đích không có check nào bắt.

## Khi viết brief cho một lane

- [ ] Toạ độ / hằng số kèm `file:dòng`, hoặc ghi rõ `GIẢ THUYẾT` (E8: brief ghi gốc cây (800,860),
      cảnh kế thật ra (800,640)). Không trộn việc đổi hành vi vào phạm vi đã cam kết không đổi.
- [ ] Dùng khuôn có sẵn: `script.md` · `implement-poster.md` · `fix-round.md` · `audit.md`.

## Cổng 4 · Deliver — nộp gì

- [ ] `chapters/<Day>/<id>-chương.txt`: `MM:SS: tên chương`, mỗi dòng một section (`SECTIONS`), lấy
      mốc bắt đầu của câu đầu section (`voice.cues.json` → `seconds`), tiêu đề tóm từ lời đọc.
- [ ] `transcripts/<Day>/<id>.txt` đã có; `projects/<id>/PROMPTS.md` đủ mục (kịch bản nguồn, style,
      cấu hình giọng, bảng feedback, lệnh đã chạy, giới hạn) — cùng heading với `projects/d2-01-lab/PROMPTS.md`.
- [ ] Gate cuối: `npm run stage:build -- --video <id>` rồi `npm run stage:verify -- --video <id>`.
- [ ] **Báo token khi đóng stage tự viết:** `node tools/video-workflow.mjs run finish --video <id>
      --run-id <id> --status done --input-tokens N --output-tokens N --model <tên>` — ledger hiện
      **0/298 dòng có token** vì chưa ai báo; không báo thì không so được lần dựng nào rẻ hơn.
- [ ] `node tools/video-workflow.mjs report --video <id>` để xem lại toàn bộ stage đã ghi.
- [ ] Đổi id video thì dùng `node tools/rename-video.mjs <cũ> <mới>` (mặc định **dry-run**, đọc kế
      hoạch trước; `--apply` mới đổi thật). Nó KHÔNG đụng `.studio/` — ledger giữ id cũ, đúng quy ước.
- [ ] **Ghi token của từng lane vào ledger** — lấy con số trong thông báo hoàn tất của lane, rồi
      `node tools/video-workflow.mjs run finish --video <id> --run-id <ID> --status done
      --input-tokens N --output-tokens N --model <tên> --note "<lane nào>"`. Lane không tự ghi
      được số của chính nó; không ghi thì ledger vẫn 0 dòng có token và không so được lần nào rẻ hơn.
- [ ] `node tools/trace-report.mjs --video <id>` sau khi mọi lane đã append `TRACE.md` — đọc mục
      "Friction" trước khi mở lần dựng kế tiếp.
- [ ] Không commit nếu không được yêu cầu.

## §quiz — khi nào đánh `quiz: true` trong `cues.js` (chuyển từ `video-anatomy.md` §2, 21/09/2026)

`quiz` phải nằm **cuối** entry: `voice-timing.mjs --write-cues` ghi đè phần giữa `n:` và `frames:`.
`quiz: true` chỉ đánh ở **khoảng chờ người xem suy nghĩ** (cue `silent`, lúc đồng hồ chạy) — KHÔNG ở
câu đọc câu hỏi, KHÔNG ở phần chữa bài. Chỉ đánh khi `REQUEST.md` khai một quiz track.
Luật đầy đủ (gom đoạn, fade, nhạc nền tắt hẳn): `CLAUDE.md` §"Nhạc nền và nhạc quiz".

- **Kết thúc việc = `node tools/trace-report.mjs --video <id> --stamp "<LANE-NN> · <stage> · <vai>"`**
  rồi điền thân mục (≤15 dòng, chín trường, có dòng `token:`). ĐỪNG gõ tiêu đề/giờ bằng tay. Nếu bạn tự viết một stage (`cues`/`scenes`/`deliver`)
  thì đóng ledger bằng `node tools/video-workflow.mjs run finish --video <id> --run-id <ID>
  --status done --input-tokens N --output-tokens N --model <tên>`. Không ghi = lần dựng sau
  không trace lại được (`node tools/trace-report.mjs --video <id>`).
- **Chờ lane khác = `node tools/handoff.mjs wait --video <id> <khoá> [--equals <v>]`**, KHÔNG chờ
  một mục TRACE xuất hiện. Xong phần của mình thì `handoff set` (vd `voice.state --value staged`).
  Cần server tĩnh: `npm run stage:serve -- --status` TRƯỚC khi mở cái thứ hai; tắt bằng `--stop`.
