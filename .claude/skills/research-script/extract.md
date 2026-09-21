# Chặng 1 · Bóc tách — đọc slide, chọn điều cần kiểm chứng

Không tìm web ở chặng này. Chỉ đọc slide và ghi hai file.

**Đọc slide:** `research/<rid>/input/slide.md` (chữ + ghi chú người nói từng slide, đã bóc từ PPTX), hoặc
`input/slide.pdf` — đọc bằng Read, tham số `pages` mỗi lần tối đa 20 trang.

## outline.json — dàn ý, mỗi slide một mục

```json
{ "title": "tên bài giảng",
  "outline": [ { "slide": 1, "heading": "tiêu đề slide", "points": ["ý chính, chép sát lời slide"], "skip": true } ] }
```

`skip: true` cho slide không mang nội dung bài: trang bìa, mục lục, cảm ơn, hỏi đáp. Không thêm ý của bạn.

## claims.json — những điều có thể sai hoặc đã cũ

Chỉ đưa vào điều **đáng kiểm**: con số, năm, tỉ lệ, xếp hạng; tên sản phẩm, phiên bản, giá; khẳng định kỹ
thuật; điều gán cho một nghiên cứu, tổ chức, người; chỗ nói "mới nhất", "hiện nay", "gần đây".
**Không** đưa vào: kiến thức phổ thông, nhận định riêng của giảng viên, bài tập, lời dẫn, ví dụ minh hoạ
tự đặt. Gộp chỗ trùng. Thường 3–12 claim, tối đa 25 — bài ít chỗ cần kiểm thì ít claim, đừng đặt cho đủ số.

```json
{ "claims": [ {
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
- `timeSensitive` — `true` khi dữ kiện có thể đổi trong một năm (phiên bản, giá, thống kê, "hiện nay").
- `priority` — `high` | `normal` | `low`: sai thì hậu quả với bài giảng lớn tới đâu.
- `key` — khoá tra thư viện dữ kiện dùng chung giữa các bài: **tiếng Anh, chữ thường, "thực thể + thuộc
  tính"**, không chứa con số của slide. Cùng một dữ kiện thì cùng key ở mọi bài
  ("gpt-4 context window", "transformer paper publication year", "chatgpt weekly active users").
