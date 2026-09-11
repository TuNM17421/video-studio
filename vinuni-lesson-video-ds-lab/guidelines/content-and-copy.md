# Nội dung & copy

Giọng văn, cấu trúc và chữ trên màn hình của video bài giảng **AI in Action 20K**.

## 1. Giọng đọc

- Tiếng Việt tự nhiên như một người hướng dẫn nói với lớp: "mình" – "bạn", câu ngắn, một ý mỗi câu.
- Mở bằng tình huống đời thường, rồi mới gọi tên khái niệm: *"Khi bạn bật công tắc đèn, bạn chờ bóng
  đèn sáng ngay…"* → *"Đó là kỳ vọng tất định."*
- Thuật ngữ tiếng Anh quen dùng giữ nguyên và giải nghĩa lần đầu: *"độ ngẫu nhiên (temperature)"*,
  *"token, tức một mảnh văn bản"*. Không dịch máy móc từng từ tiếng Anh; không chêm tiếng Anh khi đã có
  từ Việt tự nhiên.
- Không cường điệu, không hứa hẹn quá mức; nói rõ giới hạn (*"trôi chảy không bảo đảm đúng sự thật"*).

## 2. Cấu trúc

| Phần | Nội dung | Hình |
|---|---|---|
| Hook (150 f) | một câu hỏi gây tò mò | `HookOverlay` 72 px |
| Scene 1…n | mỗi scene trả lời một câu hỏi con; một cue lời đọc = một scene | `SceneFrame` + sơ đồ |
| Recap | 3–4 ý đánh số | `Recap` |
| Kiểm tra | một câu hỏi + lựa chọn, dừng suy nghĩ, đáp án | `QuestionCard` / `check-question` |
| Nối tiếp | một câu nối sang video sau | phụ đề / `Statement` |

## 3. Chữ trên màn hình

- **Eyebrow** = `NGÀY 0N · CHỦ ĐỀ NGÀY` (IN HOA). Ví dụ thật: `NGÀY 01 · NỀN TẢNG AI & LLM` ·
  `NGÀY 02 · TỪ VẤN ĐỀ ĐẾN PHƯƠNG ÁN` · `NGÀY 03 · TỪ MÔ HÌNH ĐẾN TÁC TỬ` ·
  `NGÀY 04 · PROMPT VÀ TOOL CALLING` · `NGÀY 05 · THIẾT KẾ SẢN PHẨM AI`. Video chia phần dùng
  `PHẦN 1 · LLM LÀ GÌ`.
- **Tiêu đề scene** — câu hỏi hoặc mệnh đề, ≤ 40 ký tự: *"Hai kiểu kỳ vọng"*, *"Bất định xuất hiện ở
  đâu?"*, *"Khám phá — mở rộng hiểu biết"*, *"Lớp 2: ứng dụng kiểm tra trước khi chạy"*.
- **Nhãn thẻ** — IN HOA 1–3 từ: `YÊU CẦU`, `QUY TẮC`, `DỮ LIỆU`, `GIAO DIỆN`, `KẾT QUẢ`, `BẢN A`,
  `CÂU B`, `NHẬN THỨC`, `SUY LUẬN`, `HÀNH ĐỘNG`, `TRÍ NHỚ`.
- **Nội dung thẻ** — dòng 1 là danh từ chính (IN HOA hoặc đậm), dòng 2 giải thích thường:
  `CÔNG TẮC` / đóng mạch · `TRA SỐ DƯ` / cùng phiên · `15 TRIỆU` / giá trị nguồn.
- **Pill** — `THAO TÁC RÕ`, `CHỌN → NỐI → LẶP LẠI`, `CHƯA ĐỦ ĐỂ CHẤM NGÔN NGỮ`, `HỎI LẠI`.
- **Tag trung thực** — `MINH HỌA`, `DỮ LIỆU · KẾT QUẢ · MINH HỌA`, `SO SÁNH`, `GLASSBOX`, `BA LỚP`,
  `KIỂM TRA`; ghi chú muted *"Cách chia token và số liệu minh họa"*, *"Model A (giả định)"*.
- **Ký hiệu** — ` · ` ngăn cách; `→` quan hệ / trình tự; số kiểu Việt `8.192`, `1,2 tỷ`; `50%`;
  ngoặc kép cong `“…”`.

## 4. Phụ đề (burned-in)

- Là lời đọc thật, không tóm tắt lại. Mỗi trang một dòng **≤ 78 ký tự**, chia đều theo độ dài và ưu
  tiên ngắt ở dấu câu (`, ; : ! ? – — .`).
- Mảng `captions: [{ start, end, text }]` theo frame của scene; liên tục, không chồng nhau.
- Thanh phụ đề có thể che footer và vùng dưới y 984 — đừng đặt nội dung ở đó.

## 5. Câu hỏi kiểm tra

- Câu hỏi gắn với tình huống thực tế (*"Nếu trợ lý AI trả lời sai một câu hỏi thực tế, việc đầu tiên
  bạn nên kiểm tra là gì?"*).
- Hai lựa chọn trình bày **trung lập** (cùng màu, cùng độ đậm) trong lúc dừng suy nghĩ; tín hiệu đáp
  án chỉ bắt đầu từ frame reveal đã đặt tên.
- Sau đáp án: một câu giải thích vì sao + một câu nối sang video sau.

## 6. Kiểm tra copy trước khi xong

- [ ] Dấu tiếng Việt đầy đủ (không "khong", "tieu chi").
- [ ] Không emoji, không chấm than, không câu dài IN HOA.
- [ ] Mọi số liệu / log / model ví dụ có nhãn minh họa.
- [ ] Mỗi thẻ ≤ 3 dòng, không chữ tràn thẻ; tiêu đề ≤ 40 ký tự.
- [ ] Phụ đề ≤ 78 ký tự / trang, khớp lời đọc.
