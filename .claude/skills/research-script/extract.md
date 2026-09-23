# Chặng 1 · Bóc tách — đọc slide, chọn điều cần kiểm chứng

Không tìm web ở chặng này.

**Thường gặp — Studio đã bóc chữ** (`input/slide.md` có sẵn, prompt nói "outline.json do Studio dựng"): đọc
`input/slide.md` — chữ từng trang (PDF qua PDF.js, PPTX kèm ghi chú người nói), đã bỏ chân trang lặp lại. **Đừng
đọc cả PDF** và **đừng ghi `outline.json`**: code dựng dàn ý từ đúng chữ đó, đánh số theo trang. Trang ghi "ít chữ"
có thể chỉ có hình — chỉ khi tiêu đề cho thấy nó có số liệu, bảng hay biểu đồ đáng kiểm thì Read đúng trang đó trong
`input/slide.pdf` (tham số `pages`, ví dụ `"43"`). Việc của bạn chỉ là `claims.json`; trang không mang nội dung bài
mà code chưa tự bỏ (bìa, lời dẫn) thì liệt kê trong `"skip": [1, 2]` của file đó.

**PDF quét ảnh hay mã hoá** (không có `input/slide.md`): đọc `input/slide.pdf` bằng Read, tham số `pages` mỗi lần
tối đa 20 trang, rồi ghi cả `outline.json` lẫn `claims.json`.

**`slide` là số trang, không phải số thứ tự bạn tự đếm.** PDF: số trang trong file (trang đầu là 1) — đúng số
bạn truyền cho `pages`, kể cả trang trùng (slide dựng dần) hay trang chỉ có hình. PPTX: đúng N của `## Slide N`.

## outline.json — chỉ khi phải tự viết (PDF không bóc được chữ)

**Mỗi trang đúng một mục**, không gộp, không bỏ số — trang không mang nội dung vẫn có mục, với `skip: true`. Ghi
`"pages"` = tổng số trang của file (Read báo con số này). Studio soát: số slide đi từ 1 tới `pages`, không trùng,
không hổng. Kịch bản dẫn nguồn theo đúng số này (`**Nguồn:** slide:N`) — lệch một trang là người kiểm lại mở nhầm slide.

```json
{ "title": "tên bài giảng",
  "pages": 78,
  "outline": [ { "slide": 1, "heading": "tiêu đề slide", "points": ["ý chính, chép sát lời slide"], "skip": true } ] }
```

`skip: true` cho slide không mang nội dung bài: trang bìa, mục lục, cảm ơn, hỏi đáp. Không thêm ý của bạn.

## claims.json — những điều có thể sai hoặc đã cũ

Chỉ đưa vào điều **đáng kiểm**: con số, năm, tỉ lệ, xếp hạng; tên sản phẩm, phiên bản, giá; khẳng định kỹ
thuật; điều gán cho một nghiên cứu, tổ chức, người; chỗ nói "mới nhất", "hiện nay", "gần đây".
**Không** đưa vào: kiến thức phổ thông, nhận định riêng của giảng viên, bài tập, lời dẫn, ví dụ minh hoạ
tự đặt, tên model hay đoạn mã trong ví dụ code, trích dẫn bài báo ở chân slide — những thứ không đi vào lời
giảng. Gộp chỗ trùng.

**Số claim tối đa là con số prompt đưa** (khoảng một nửa số câu của kịch bản): kịch bản chỉ dùng được chừng đó
dữ kiện, và mỗi claim thêm là thêm việc research. Nhiều hơn thì chọn điều người xem sẽ nghe và dễ sai hay đã cũ
nhất — con số, giá, phiên bản, mốc thời gian nằm trong ý chính. Bài ít chỗ cần kiểm thì ít claim, đừng đặt cho đủ số.

```json
{ "skip": [1],
  "claims": [ {
    "id": "c1",
    "slides": [4],
    "text": "GPT-4 có cửa sổ ngữ cảnh 128K token",
    "question": "Cửa sổ ngữ cảnh hiện tại của GPT-4 là bao nhiêu token?",
    "kind": "number",
    "difficulty": "normal",
    "timeSensitive": true,
    "priority": "high",
    "key": "gpt-4 context window"
} ] }
```

- `text` — slide nói gì, chép sát lời slide.
- `question` — câu hỏi cụ thể mà research phải trả lời.
- `kind` — `number` | `date` | `product` | `technical` | `quote` | `example`.
- `difficulty` — quyết định cần bao nhiêu nguồn, nên chấm thật:
  `easy` = định nghĩa/dữ kiện ổn định có tài liệu chính thức (1 nguồn gốc là đủ);
  `normal` = dữ kiện cụ thể cần xác nhận chéo; `hard` = số liệu mới, hay đổi, dễ tranh cãi.
- `timeSensitive` — `true` khi **giá trị hiện tại** có thể đổi trong một năm (giá, phiên bản mới nhất, số người
  dùng, xếp hạng, "hiện nay"). `false` cho dự báo hay báo cáo gắn với năm công bố ("PwC 2017 dự báo…"), sự kiện
  lịch sử, trích dẫn bài báo: nguồn của chúng cũ là đúng, và luật "nguồn trong 12 tháng" chỉ bắt research đi tìm
  vô ích — lượt thật đã research lại một dự báo năm 2017 rồi vẫn trượt.
- `priority` — `high` | `normal` | `low`: sai thì hậu quả với bài giảng lớn tới đâu.
- `key` — khoá tra thư viện dữ kiện dùng chung giữa các bài: **tiếng Anh, chữ thường, "thực thể + thuộc
  tính"**, không chứa con số của slide. Cùng một dữ kiện thì cùng key ở mọi bài
  ("gpt-4 context window", "transformer paper publication year", "chatgpt weekly active users").
