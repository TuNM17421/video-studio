# N2-00 · Giới thiệu ngày 2 — bản bảng trắng (lab)

Thử **style bảng trắng** (`styles/whiteboard.json`) trên đúng lời và giọng của `n2-00-gioi-thieu-ngay-2`
(ElevenLabs, 3584 frame = 01:59), để so hai style trên cùng nội dung.

## Khác bản gốc thế nào

- **Một tấm bảng cho cả video.** Không có cảnh, không cắt: `video.jsx` vẽ một `SceneFrame` chứa
  `<Whiteboard>`; mọi nét khai trong `board.js` theo khung hình video (không `Series`, không co giãn beat).
- **Bút dạ vẽ theo lời.** Mốc của mỗi nét = đầu câu + `spokenAt(câu, cụm từ)` − vài frame. Bút chỉ vẽ một thứ
  một lúc: `draw()` cho nét sau chờ nét trước; `LAG` liệt kê nét trễ hơn 12 frame so với lời.
- **Lau bảng** ở câu 03: phần mở đầu bị xoá để viết bản đồ ngày học vào chỗ đó.
- **Camera** lia tới từng ô, lùi ra gạch chân câu hỏi của cột mỗi khi sang cột mới, và lùi ra toàn bảng ở câu 16
  — người xem thấy cả ngày học trên một trang, thứ mà bản cắt cảnh không có.

## Bố cục bảng (đơn vị bảng; 1920 = bề ngang màn hình ở zoom 1)

```
 y -110            Sau hôm nay                                    (câu 16)
 y 170 / 400   XÁC ĐỊNH VIỆC        CHỌN CÁCH            KIỂM TRA ĐIỀU KIỆN
               Cần cải thiện gì? →  Làm thế nào?     →   Đã sẵn sàng chưa?
 y 640         (Cần AI?)            (Làm thay hay hỗ trợ?) (Tiếp, thêm hay dừng?)  (câu 16)
 y 800–1560    [1 Tìm khó khăn]     [3 AI có giúp ích?]  [5 Đánh giá kết quả]
 y 1760–2520   [2 Viết rõ · đo]     [4 Tổ chức việc]     [6 Mô tả · quyết định]
               x 0–1760             x 1960–3720          x 3920–5680
```
Mỗi ô 1760 × 760: tiêu đề phần (số khoanh đỏ), nửa trái = câu đầu của phần, nửa phải = câu sau.
Câu 01–02 vẽ ở giữa hàng tiêu đề và bị lau ở câu 03.

## Theo câu

| Câu | Thời gian · frame | Trên bảng |
|---|---|---|
| 01 | 00:00–00:07 · 0–229 | Bút viết “Bắt đầu từ đâu?” đỏ, vẽ người que nói “Làm một trợ lý AI”, hai mũi tên tới hai ô bằng nhau Chọn công cụ / hay / Hiểu khó khăn. |
| 02 | 00:07–00:13 · 229–406 | Viết “Ngày 2: làm rõ vấn đề trước”; khoanh đỏ Hiểu khó khăn + chữ “trước”, cạnh Chọn công cụ ghi “sau”. |
| 03 | 00:13–00:20 · 406–617 | Cục lau xoá phần mở đầu; camera lùi ra toàn bảng, sáu khung nét đứt hiện; bút viết ba câu hỏi Cần cải thiện gì? → Làm thế nào? → Đã sẵn sàng chưa? kèm nhãn vùng. |
| 04 | 00:20–00:27 · 617–811 | Gạch chân đỏ Cần cải thiện gì?, camera vào ô 1; tiêu đề phần 1; “Khó khăn thật sự?” đỏ, ô lời đề nghị “Làm trợ lý hỗ trợ học viên”, mũi tên “đằng sau”. |
| 05 | 00:27–00:34 · 811–1027 | Nửa phải ô 1: học viên, trang 1 · 2 · 3, người quan sát; khoanh đỏ các trang (tìm ở đâu), ô câu hỏi “Bước nào mất thời gian?”. |
| 06 | 00:34–00:41 · 1027–1246 | Camera xuống ô 2; tiêu đề phần 2; phiếu ba dòng Ai gặp khó? / Vướng ở bước nào? / Chậm trễ hay sai sót gì? với dòng trống nét đứt. |
| 07 | 00:41–00:49 · 1246–1472 | Nửa phải ô 2: ba đồng hồ Hiện nay → Mục tiêu (kim ngắn hơn) → Đo lại; không có số. |
| 08 | 00:49–00:56 · 1472–1684 | Camera lùi ra gạch chân Làm thế nào?, vào ô 3; tiêu đề phần 3; ô AI → mũi tên → Công việc (người que), dấu ? đỏ. |
| 09 | 00:56–01:02 · 1684–1867 | Nửa phải ô 3: Từng việc tách hai nhánh AI làm thay / AI hỗ trợ, ghi “→ con người quyết định”. |
| 10 | 01:02–01:12 · 1867–2170 | Camera xuống ô 4; tiêu đề phần 4; Con người đặt sẵn: Bước 1 → Bước 2 → Bước 3 · hoặc · AI chọn bước tiếp: Kết quả → AI → Bước tiếp, mũi tên đỏ quay về. |
| 11 | 01:12–01:18 · 2170–2352 | Nửa phải ô 4: ô Cách đủ dùng, ba tiêu chí Chi phí / Thời gian chờ / Rủi ro (đỏ) chỉ vào. |
| 12 | 01:18–01:24 · 2352–2548 | Camera lùi ra gạch chân Đã sẵn sàng chưa?, vào ô 5; tiêu đề phần 5; Kết quả AI tách Đạt yêu cầu (tick) / Sai → cần xử lý (đỏ). |
| 13 | 01:24–01:33 · 2548–2814 | Nửa phải ô 5: AI báo nhầm → người “không cần giúp”; AI bỏ sót - - ✗ - → người “đang cần giúp”. |
| 14 | 01:33–01:40 · 2814–3016 | Camera xuống ô 6; tiêu đề phần 6; tờ Bản mô tả: Vấn đề / Cách giải quyết dự kiến / Điều phải kiểm tra. |
| 15 | 01:40–01:48 · 3016–3244 | Nửa phải ô 6: mũi tên từ bản mô tả tới Đi tiếp / Chuẩn bị thêm / Dừng đề xuất; “dựa vào: lợi ích dự kiến, kiểm soát rủi ro”. |
| 16 | 01:48–01:59 · 3244–3584 | Camera lùi ra toàn bảng; viết “Sau hôm nay” và dưới mỗi câu hỏi cột một câu khoanh đỏ: Cần AI? · Làm thay hay hỗ trợ? · Tiếp, thêm hay dừng? |

## Lời đọc (khoá, không sửa)

Nguyên văn trong `cues.js` (trường `text`), giống hệt bản gốc — giọng dùng lại `voice.cues.json` của N2-00
(`voice/out/n2-00-bang-trang/`, không tốn credit). Phụ đề: `cueCaptions` toàn video, ≤ 78 ký tự.

## Kiểm tra

- `npm run build && npm run verify` — video dựng được, phụ đề khớp lời, render thử mọi frame thứ 3.
- Ảnh QA: `projects/n2-00-bang-trang/qa/` (24 frame dọc video).
- Còn chưa hoàn hảo:
  - Bản thu N2-00 không có mốc từng từ, nên `spokenAt` chia theo số tiếng — nét có thể lệch lời vài frame.
  - Vài nét trễ 1–2 giây so với lời ở các câu dày (câu 05, 08, 12 — xem `LAG` trong `board.js`), chủ yếu vì
    tiêu đề phần và cú lia camera chiếm đầu câu.
  - Khi lùi ra toàn bảng, chữ trong ô chỉ còn ~15 px: đọc được đầu mục và hình, không đọc được chi tiết — cố ý,
    câu 16 chỉ cần người xem thấy toàn cảnh.
