# N2-00 · Prompt dán vào Claude Design

Kịch bản: [`kich-ban-goc.md`](kich-ban-goc.md) · 16 câu · 02:48 · 5 040 frame ở 30 fps.
Bản tham chiếu đã dựng sẵn trong design system:
`ui_kits/lesson-video/videos/n2-00-gioi-thieu-ngay-2/` (mở `player.html`, menu **Câu NN** để nhảy tới
từng câu; bảng mốc chi tiết ở `STORYBOARD.md` cùng thư mục).

## Cách dùng

1. Trong Claude Design, tạo project mới và chọn design system **VinUni Lesson Video**.
2. Dán **Prompt 0** một lần để đặt bối cảnh.
3. Dán **Prompt 1** để dựng khung video: cue, bản đồ ngày học, phụ đề, player.
4. Dán lần lượt **Prompt A → D** (theo đoạn). Nếu muốn làm kỹ từng câu, dùng prompt riêng của câu đó ở
   mục "Theo câu".
5. Sau mỗi đoạn, dán **Prompt kiểm tra**. Khi có bản thu giọng, dán **Prompt căn theo bản thu**.

Mốc `@f` trong các prompt là frame (tính trong câu) mà cụm từ bắt đầu được đọc. Mốc ước lượng theo nhịp
3 tiếng/giây của kịch bản. Vật thể nên hiện trước lời 4–8 frame.

---

## Prompt 0 · Bối cảnh (dán một lần)

```
Dùng design system "VinUni Lesson Video" (đọc README.md và SKILL.md trước khi làm).
Dự án: video giới thiệu đầu ngày "N2-00 · Giới thiệu ngày 2 — xác định đúng việc cần giải quyết",
khoá AI in Action 20K. 1920×1080 · 30 fps · 16 câu lời đọc = 16 scene nối cắt thẳng · tổng 168 giây.

Luật bắt buộc:
- Chỉ 9 màu C, chỉ Montserrat 500/600/700, không emoji, không gradient, nền trắng.
- Header chuẩn: eyebrow "NGÀY 02 · XÁC ĐỊNH ĐÚNG VẤN ĐỀ", tiêu đề = "Chữ trên màn hình" của câu,
  watermark, footer "Câu NN / 16", phụ đề burned-in ≤ 78 ký tự/trang (dùng cueCaptions trong
  lib/captions.js, không tự ngắt tay).
- Lời đọc là khoá: copy nguyên văn, không sửa chữ.
- Dùng MỘT bản đồ ngày học (component DayMap) xuyên suốt: câu 03 mở bản đồ đầy đủ, câu 04 thu bản đồ
  thành dải dưới header, câu 04–15 làm sáng phần đang giới thiệu, câu 16 mở lại ba thẻ.
- Không đưa kết quả chưa đo, con số, đáp án hay quyết định lên hình. Tình huống tự soạn gắn tag
  "MINH HỌA" (câu 01, 04, 05, 13).
- Mỗi cảnh chỉ nhấn một ý. Connector là authority: hạt chạy trên đường vẽ, ẩn trên mặt thẻ, thẻ hiện
  trước khi hạt tới và pulse đúng một lần.
- Minh hoạ của câu 04–15 nằm trong vùng y 410–960 (dưới dải bản đồ), x 80–1840.

Bản tham chiếu: ui_kits/lesson-video/videos/n2-00-gioi-thieu-ngay-2/ — đọc cues.js, shared.jsx,
video.jsx và các sNN.jsx để theo cùng cấu trúc.
```

## Prompt 1 · Khung video

```
Dựng khung video N2-00 theo cấu trúc của bản tham chiếu:
- cues.js: 16 cue {n, seconds, mapPart, title, tag?, text}; frame bắt đầu/kết thúc tính từ seconds
  (11, 8, 11, 9, 11, 10, 11, 9, 9, 14, 9, 10, 12, 10, 10, 14 giây); hàm spokenAt(n, cụm từ) ước lượng
  frame cụm từ được đọc (3 tiếng/giây, "AI" = 2 tiếng).
- shared.jsx: ZONES của bản đồ =
  XÁC ĐỊNH VIỆC "Cần cải thiện gì?" (1 Tìm khó khăn, 2 Mô tả và đo) ·
  CHỌN CÁCH "Làm thế nào?" (3 AI có giúp?, 4 Tổ chức việc) ·
  KIỂM TRA ĐIỀU KIỆN "Đã sẵn sàng chưa?" (5 Kết quả và lỗi, 6 Quyết định);
  PartScene = SceneFrame + DayMap dạng dải với phần đang học sáng đỏ, glow một lần ở cảnh đầu mỗi phần.
- video.jsx: Series nối 16 scene; markers "Câu NN · chữ trên màn hình" cho menu nhảy câu.
Tạm để mỗi scene một dòng chữ "đang dựng"; chưa vẽ minh hoạ.
```

## Prompt theo đoạn

### A · Mở đầu — câu 01–03 (00:00–00:30)

```
Dựng câu 01–03 của N2-00.
Câu 01 (330 f, tag MINH HỌA) — lời: "Nếu được nhờ làm một trợ lý trí tuệ nhân tạo, bạn sẽ bắt đầu bằng
việc chọn công cụ hay tìm hiểu người dùng đang gặp khó khăn gì?"
  Hook "Bắt đầu từ đâu?" 120 f đầu. Rồi thẻ nét đứt YÊU CẦU “Làm một trợ lý AI” / yêu cầu còn mơ hồ ở
  trái; hai connector gấp khúc tới hai thẻ bằng nhau CHỌN CÔNG CỤ (icon gear, @170) và HIỂU KHÓ KHĂN
  (icon users, @210); dấu "?" đỏ ở giữa. Không chọn đáp án.
Câu 02 (240 f) — lời: "Chào bạn, ngày hai giúp chúng ta làm rõ vấn đề trước khi quyết định dùng công
nghệ để giải quyết."
  Person "Người dùng" → thẻ VIỆC CẦN HOÀN THÀNH; pill đỏ "LÀM RÕ VẤN ĐỀ TRƯỚC" (@70); connector nét đứt
  tới thẻ nét đứt SAU ĐÓ / CÔNG NGHỆ / quyết định sau (@130).
Câu 03 (330 f) — lời: "Bạn sẽ học cách xác định việc cần cải thiện, chọn cách giải quyết và kiểm tra
xem đã đủ điều kiện để bắt đầu làm hay chưa."
  DayMap đầy đủ (dock 0): ba thẻ hiện lần lượt @40 "xác định", @100 "chọn cách", @150 "kiểm tra", mũi
  tên nối giữa các thẻ. Chưa hiện sáu phần.
```

### B · Lộ trình phần 1–3 — câu 04–09 (00:30–01:29)

```
Dựng câu 04–09 của N2-00. Mọi scene dùng PartScene; minh hoạ trong y 410–960.
Câu 04 (270 f, MINH HỌA, dockIn) — "Đầu tiên, bạn sẽ học cách tìm khó khăn thật sự đằng sau một đề
nghị như làm trợ lý hỗ trợ học viên."
  Bản đồ thu thành dải trong 36 f đầu, phần 1 sáng. Phải: Person "Học viên" (tìm hướng dẫn nộp bài) +
  trang "Hướng dẫn nộp bài"; đường tìm nét đứt dừng giữa chừng với "?" đỏ; khung đỏ "KHÓ KHĂN THẬT"
  (@60). Trái: nhãn ĐỀ NGHỊ + bong bóng “Làm trợ lý / hỗ trợ học viên” (@130); connector nét đứt từ
  bong bóng tới khung, nhãn "đằng sau đề nghị".
Câu 05 (330 f, MINH HỌA) — "Qua ví dụ một học viên tìm hướng dẫn nộp bài, bạn sẽ quan sát họ tìm ở đâu
và hỏi bước nào khiến họ mất thời gian."
  Học viên → Trang 1 → Trang 2 → Trang 3: một hạt đi qua từng trang (trang tô dòng khi được mở), dừng ở
  trang 3 với chấm đỏ "Dừng lại ở đây". Người quan sát (đỏ) + phiếu GHI CHÉP QUAN SÁT: "Trang đã tìm"
  (@160) và "Bước dừng lại"; bong bóng câu hỏi "Bước nào làm bạn / mất thời gian?" (@200).
Câu 06 (300 f) — "Phần hai giúp bạn viết rõ ai đang gặp khó, họ vướng ở bước nào và việc đó gây chậm
trễ hoặc sai sót gì."
  Phần 2 sáng. Một FormSheet "PHIẾU MÔ TẢ VẤN ĐỀ" giữa màn hình, ba dòng Ai gặp khó? (@60) / Vướng bước
  nào? (@110) / Chậm hoặc sai ở đâu? (@190), ô trống nét đứt, dòng đang đọc tô redSoft. Ghi chú muted
  "Các ô để trống · chưa có kết quả đo".
Câu 07 (330 f) — "Bạn sẽ ghi lại hiện nay học viên mất bao lâu để tìm đúng hướng dẫn, chọn thời gian
muốn rút ngắn, rồi đo lại sau khi cải thiện."
  Ba thẻ nối bằng Flow: HIỆN NAY (Stopwatch đỏ quay một vòng, "Mất bao lâu hiện nay?") → MỤC TIÊU
  (Stopwatch xanh, nêm tĩnh, "Muốn rút ngắn còn bao lâu?", @160) → ĐO LẠI (kim ở 12 giờ, "?" đỏ, "Đo lại
  sau khi cải thiện", @230); đường quay về nét đứt có pill ĐO LẠI. Không một con số nào.
Câu 08 (270 f) — "Phần ba đặt câu hỏi: trí tuệ nhân tạo, hay AI, có thực sự giúp ích cho công việc ấy
hay không."
  Phần 3 sáng. Trái: người dùng + thẻ CÔNG VIỆC "Tìm đúng hướng dẫn / nộp bài". Phải: GlassBox "TRÍ TUỆ
  NHÂN TẠO (AI)" (@50). Giữa: connector nét đứt + "?" đỏ + pill "CÓ GIÚP ÍCH?" (@120). Thẻ công việc
  pulse ở @180. Không trả lời.
Câu 09 (270 f) — "Bạn sẽ cân nhắc những việc có thể giao AI làm thay và những việc AI nên hỗ trợ để con
người quyết định."
  Thẻ TỪNG VIỆC tách hai nhánh BẰNG NHAU: AI LÀM THAY (robot, @80) và AI HỖ TRỢ / con người quyết định
  (users, @160). Cùng kích thước, cùng màu — không nhánh nào thắng.
```

### C · Lộ trình phần 4–6 — câu 10–15 (01:29–02:34)

```
Dựng câu 10–15 của N2-00. Mọi scene dùng PartScene; minh hoạ trong y 410–960.
Câu 10 (420 f) — "Ở phần bốn, bạn sẽ so sánh hai cách tổ chức công việc: con người đặt sẵn quy tắc và
các bước xử lý, hoặc để AI chọn bước tiếp theo dựa trên kết quả vừa nhận được."
  Phần 4 sáng. Hai panel (@50): CON NGƯỜI ĐẶT QUY TẮC — Bước 1 → 2 → 3, hạt chạy đường cố định (@130);
  AI CHỌN BƯỚC TIẾP — chip KẾT QUẢ đi vào node AI (@240), ba bước ứng viên, một bước sáng đỏ sau @340;
  khung nét đứt "TRONG PHẠM VI CHO PHÉP" dưới thẻ AI.
Câu 11 (270 f) — "Mục đích là chọn cách đủ giải quyết công việc, đồng thời cân nhắc chi phí, thời gian
chờ và rủi ro."
  Thẻ CÔNG VIỆC CẦN LÀM ở giữa + pill "ĐỦ DÙNG VÀ PHÙ HỢP" (@50); ba tiêu chí CHI PHÍ (@140), THỜI GIAN
  CHỜ (@160), RỦI RO (@200), mỗi tiêu chí có Flow chảy vào thẻ giữa. Không chọn phương án.
Câu 12 (300 f) — "Phần năm giúp bạn xác định thế nào là kết quả đạt yêu cầu và cần làm gì khi hệ thống
AI cho ra kết quả sai."
  Phần 5 sáng. GlassBox HỆ THỐNG AI tách hai đường: ĐẠT YÊU CẦU (Check, hạt xanh @90) và CẦN XỬ LÝ (đỏ,
  thẻ hiện @150, hạt đỏ tới sau @250).
Câu 13 (360 f, MINH HỌA) — "Bạn sẽ xem hai lỗi thường gặp: hệ thống AI báo nhầm rằng một người cần giúp
dù họ không gặp khó, hoặc bỏ sót người thật sự đang cần hỗ trợ."
  Hai panel cân nhau: BÁO NHẦM (@110) — AI → Flow đỏ → "Người không cần giúp" nhận chip "BÁO: CẦN GIÚP";
  BỎ SÓT (@240) — AI → đường nét đứt dừng trước "Người đang cần giúp" (đỏ), dấu Cross ở khoảng hở.
Câu 14 (300 f) — "Phần sáu giúp bạn hoàn chỉnh bản mô tả vấn đề, cách giải quyết dự kiến và những điều
phải kiểm tra trước khi bắt đầu làm."
  Phần 6 sáng. Ba phiếu nhỏ Vấn đề / Cách dự kiến / Điều cần kiểm tra gửi hạt vào ba mục của tài liệu
  lớn "BẢN MÔ TẢ" (@60, @110, @170); dòng chữ chỉ là thanh, không nội dung thật.
Câu 15 (300 f) — "Bạn sẽ cân nhắc đi tiếp, chuẩn bị thêm hoặc dừng đề xuất, dựa vào lợi ích dự kiến và
khả năng kiểm soát rủi ro."
  Tài liệu → ba nhánh bằng nhau ĐI TIẾP (@40) / CHUẨN BỊ THÊM (@60) / DỪNG ĐỀ XUẤT (@100), dưới mỗi nhánh
  ô nét đứt "LÝ DO" để trống; pill LỢI ÍCH DỰ KIẾN (@150) và KIỂM SOÁT RỦI RO (@220). Không chọn nhánh.
```

### D · Kết lại — câu 16 (02:34–02:48)

```
Dựng câu 16 của N2-00 (420 f) — "Sau hôm nay, bạn sẽ biết bài toán nào thật sự cần AI, AI nên làm thay
hay hỗ trợ con người, và khi nào nên làm tiếp, chuẩn bị thêm hoặc dừng ý tưởng sản phẩm đó."
Bản đồ mở lại từ dải về ba thẻ đầy đủ trong 40 f đầu, với câu hỏi mới: CẦN AI? "Bài toán có cần AI?" ·
AI LÀM GÌ? "AI làm thay hay hỗ trợ?" · LÀM TIẾP HAY DỪNG? "Làm tiếp, chuẩn bị thêm hay dừng?".
Mỗi thẻ pulse một lần khi câu hỏi được đọc (@60, @140, @250), rồi giữ tĩnh tới hết. Không hiện quyết định.
```

## Prompt kiểm tra (sau mỗi đoạn)

```
Kiểm tra các câu vừa dựng ở frame đầu, frame giữa chuyển động, mỗi lần xuất hiện, khung dày nhất và
frame cuối của từng câu. Báo và sửa: chữ chồng dải bản đồ / tiêu đề / tag / thanh phụ đề; chữ tràn thẻ;
nhãn cắt connector; hạt đi trên mặt thẻ; vật thể dưới y 960; con số hoặc đáp án không có trong lời đọc;
thiếu tag MINH HỌA ở câu 01, 04, 05, 13; mốc frame vượt thời lượng câu.
```

## Prompt căn theo bản thu (khi có giọng đọc)

```
Đã có bản thu: thời lượng đo được của 16 câu là <dán danh sách frame hoặc giây>.
Giữ nguyên mốc frame đã dựng (authored). Trong video.jsx, đặt duration = thời lượng đo và
authoredDuration = thời lượng cũ cho từng sequence để Series co giãn hoạt ảnh theo lời;
không kéo giãn giọng. Cập nhật cues để phụ đề theo mốc mới, rồi chạy lại Prompt kiểm tra.
```

## Theo câu (khi cần làm kỹ một câu)

Dùng mẫu sau, thay nội dung từ đoạn A–D ở trên:

```
Chỉ sửa câu NN của N2-00 (file sNN.jsx). Lời đọc: "<nguyên văn>". Chữ trên màn hình: "<tiêu đề>".
Hình: <mô tả của câu trong đoạn A–D>. Mốc: <các @f>. Giữ nguyên các câu khác và bản đồ ngày học.
Sau khi sửa, kiểm tra frame đầu, khung dày nhất và frame cuối của câu.
```
