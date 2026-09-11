# N2-00 · Giới thiệu ngày 2 — storyboard

16 câu · 168 giây · 5 040 frame · 30 fps · 1920×1080. Nguồn: kịch bản rà ngày 10/09/2026 (xem
`cues.js`). Thời lượng đang theo ước lượng của kịch bản (3 tiếng/giây + 1 giây nghỉ). Khi có bản thu,
giữ các mốc dưới đây là *authored* và truyền thời lượng đo được qua `Series` (`authoredDuration`).

Mốc trong cột "Nhịp" là frame **trong câu**. `@f` là lúc cụm từ được đọc (`spokenAt`).
Câu 04–15 dùng `PartScene`: header, dải bản đồ ngày học (y 288–384) với phần đang học sáng đỏ, glow một
lần ở câu đầu mỗi phần. Minh hoạ nằm trong vùng y 410–960.

| Câu | Thời gian · frame | Chữ trên màn hình | Hình (visual proof) | Component | Nhịp |
|---|---|---|---|---|---|
| 01 | 00:00–00:11 · 0–330 | Bắt đầu từ đâu? · MINH HỌA | Yêu cầu mơ hồ “Làm một trợ lý AI” tách hai thẻ bằng nhau Chọn công cụ / Hiểu khó khăn, dấu ? đỏ | HookOverlay, Card (dashed, icon), Flow gấp khúc | hook 0–120 · yêu cầu 122 · chọn công cụ 166 (@170) · hiểu khó khăn 204 (@210) · ? 268 |
| 02 | 00:11–00:19 · 330–570 | Ngày 2 · Xác định đúng vấn đề | Người dùng → Việc cần hoàn thành; pill Làm rõ vấn đề trước; Công nghệ = quyết định sau (nét đứt) | Person, Card, Pill, Flow | người 6 · flow 30–70 · pill 76 (@70) · công nghệ 112 (@130) |
| 03 | 00:19–00:30 · 570–900 | Lộ trình ngày 2 | Bản đồ ngày đầy đủ: Cần cải thiện gì? → Làm thế nào? → Đã sẵn sàng chưa? | DayMap (dock 0) | thẻ 34 / 94 / 144 (@40 / 100 / 150) |
| 04 | 00:30–00:39 · 900–1170 | 1 · Tìm khó khăn đằng sau lời đề nghị · MINH HỌA | Bản đồ thu thành dải; đề nghị “Làm trợ lý hỗ trợ học viên” nối tới khung KHÓ KHĂN THẬT: học viên tìm hướng dẫn nộp bài, đường tìm dừng giữa chừng | DayMap dockIn, SpeechBubble, Person, DocumentSheet, Enclosure, Flow | dock 0–36 · học viên 42 · khung 56 (@60) · đường tìm 66–126 · đề nghị 124 (@130) · nối 150–190 |
| 05 | 00:39–00:50 · 1170–1500 | Quan sát họ tìm ở đâu · Hỏi bước làm mất thời gian · MINH HỌA | Hạt đi Trang 1 → 2 → 3, dừng ở trang 3; người quan sát ghi phiếu và đặt câu hỏi | Person, DocumentSheet, FormSheet, SpeechBubble, Flow | trang 6 · hạt 34–120 · phiếu 124 (@130) · Trang 1·2·3 156 (@160) · Trang 3 190 · câu hỏi 196 (@200) |
| 06 | 00:50–01:00 · 1500–1800 | 2 · Viết rõ người, việc và ảnh hưởng | Phiếu mô tả ba dòng, ô trống nét đứt, dòng đang đọc tô đỏ nhạt | FormSheet, Icon | dòng 54 / 104 / 160 (@60 / 110 / 190) · ghi chú ô trống 248 |
| 07 | 01:00–01:11 · 1800–2130 | Đo hiện tại · Chọn mục tiêu · Đo lại | Hiện nay → Mục tiêu → Đo lại, đồng hồ không số, vòng quay về | Card, Stopwatch, Flow, Pill | hiện nay 14 (@20) · kim 30–140 · mục tiêu 150 (@160) · đo lại 222 (@230) · vòng 250–274 |
| 08 | 01:11–01:20 · 2130–2400 | 3 · Trí tuệ nhân tạo (AI) có giúp ích? | Công việc của người dùng ··· ? ··· glassbox Trí tuệ nhân tạo (AI); chưa trả lời | Person, Card, GlassBox, Pill | công việc 46 · AI 44 (@50) · nối 90–130 · ? + pill 116–122 (@120) · pulse công việc 176 (@180) |
| 09 | 01:20–01:29 · 2400–2670 | Chọn vai trò của AI trong từng việc | Từng việc tách hai nhánh bằng nhau AI làm thay / AI hỗ trợ con người quyết định | Card (icon), Flow, Person | nhánh 1 70–106, thẻ 74 (@80) · nhánh 2 150–186, thẻ 154 (@160) · con người ~200 (@220) |
| 10 | 01:29–01:43 · 2670–3090 | 4 · Con người đặt sẵn bước làm · AI chọn bước tiếp | Hai panel: quy tắc cố định Bước 1→2→3 / kết quả → AI → chọn một bước trong phạm vi cho phép | Card, GlassBox, Flow, Enclosure | panel 44–50 (@50) · bước 132–148, hạt 160–224 (@130) · AI 238 (@240) · phạm vi ~286 · chọn Bước B 334–364 (@340) |
| 11 | 01:43–01:52 · 3090–3360 | Đủ dùng và phù hợp | Chọn cách ở giữa, ba tiêu chí Chi phí / Thời gian chờ / Rủi ro chảy vào | Card (icon), Pill, Flow | pill 44 (@50) · chi phí 134 (@140) · thời gian chờ 156 (@160) · rủi ro 186 (@200) |
| 12 | 01:52–02:02 · 3360–3660 | 5 · Đánh giá kết quả AI và xử lý sai | Hệ thống AI tách hai đường Đạt yêu cầu (check) / Cần xử lý (đỏ) | GlassBox, Card, Check, Cross, Flow | AI 8 · đạt 76, hạt 80–114 (@90) · cần xử lý 142 (@150) · hạt đỏ 228–254 (@250) |
| 13 | 02:02–02:14 · 3660–4020 | Báo nhầm người không cần giúp · Bỏ sót người cần giúp · MINH HỌA | Hai panel cân nhau: AI báo nhầm tới Người không cần giúp / AI bỏ sót Người đang cần giúp | Card, Person, Chip, Flow, Cross | báo nhầm 102 (@110), đường 120–194 · bỏ sót 232 (@240), đường 248–294 |
| 14 | 02:14–02:24 · 4020–4320 | 6 · Hoàn chỉnh mô tả để ra quyết định | Ba phiếu ghép vào tài liệu Bản mô tả: Vấn đề / Cách dự kiến / Điều cần kiểm tra | DocumentSheet, Flow, tài liệu vẽ trong scene | phiếu 46 / 96 / 156 (@60 / 110 / 170) · hạt tới 82 / 132 / 192 |
| 15 | 02:24–02:34 · 4320–4620 | Chọn hướng đi và giải thích lý do | Tài liệu → Đi tiếp / Chuẩn bị thêm / Dừng đề xuất, ô Lý do trống; Lợi ích dự kiến, Kiểm soát rủi ro | DocumentSheet, Card, Flow, Pill | nhánh 32 / 52 / 92 (@40 / 60 / 100) · lợi ích 144 (@150) · rủi ro 214 (@220) |
| 16 | 02:34–02:48 · 4620–5040 | Sau hôm nay | Bản đồ mở lại ba thẻ: Bài toán có cần AI? → AI làm thay hay hỗ trợ? → Làm tiếp, chuẩn bị thêm hay dừng? | DayMap (undock) | mở 0–40 · pulse 56 / 136 / 246 (@60 / 140 / 250) · giữ tới 420 |

## Lời đọc (khoá, không sửa)

Nguyên văn nằm trong `cues.js` (trường `text`). Phụ đề sinh bằng `cueCaptions`: 34 trang, mỗi trang
≤ 78 ký tự, ngắt ở ranh giới cụm từ.

## Kiểm tra

- `node tools/verify.mjs`: file đủ, phụ đề khớp lời đọc, render thử mọi frame thứ 3 và các frame biên
  mà không lỗi.
- Ảnh QA: frame cuối của cả 16 câu, và 4–7 frame cho mỗi câu 04–15 (lúc vật thể hiện, lúc đang chuyển
  động, khung dày nhất).
- Còn chưa hoàn hảo (chấp nhận được):
  - Câu 09 và 11 chỉ giữ trạng thái cuối khoảng 20–30 frame, vì lời đọc kết thúc muộn.
  - Nhịp pulse làm thẻ đỏ lên thoáng qua khi hạt tới (câu 13, 15). Trạng thái cuối vẫn trung lập.
