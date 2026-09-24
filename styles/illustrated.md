---
style: illustrated
extends: lesson-lab
---

# Illustrated Style (lab) — phần thêm

Đọc `styles/lesson.md` rồi `styles/lesson-lab.md` trước; file này chỉ ghi phần thêm. Vẫn là video Lesson
bình thường: `cues.js`, `sNN.jsx`, `Series`, `SceneFrame`, phụ đề, beat theo `spokenAt` — không có cơ chế
mới như bảng trắng. Cái mới là **cách kể**.

Component riêng: `components/illustrated/` — đọc `TokenRow.prompt.md`, `VectorStrip.prompt.md`,
`MatrixGrid.prompt.md`, `AttentionLines.prompt.md`. Dùng thêm `VectorColumn`, `Heatmap`,
`ProbabilityBars`, `TokenChip` của nhóm `data`.

## Nguyên tắc: một vật liệu sống suốt cả video

Đây là điểm phân biệt style này với mọi style khác, và cũng là chỗ dễ làm sai nhất.

Người xem phải thấy **cùng một thứ** đi qua các trạm, chứ không phải xem một chuỗi hình rời. Một câu
tiếng Việt cắt thành hàng token ở cảnh 1; cảnh 2 hàng token ấy **vẫn ở đó**, dưới mỗi viên mọc ra một dải
vector; cảnh 3 hàng ấy nhân đôi thành hai hàng và nối bằng đường chú ý; cảnh 4 các vector xếp lại thành
ma trận. Không cảnh nào xoá hàng token đi rồi vẽ hình khác.

Cách làm cụ thể:

- Khai **một** hằng số `TOKENS` và **một** toạ độ gốc cho hàng token ở `shared.jsx`, mọi cảnh dùng chung.
  Lấy vị trí từng viên bằng `tokenLayout(...)` với đúng tham số đó — đừng cảnh nào tự đặt lại `x`, `y`.
- Cảnh sau chỉ **thêm** hoặc **biến đổi**: hàng token trượt lên nhường chỗ, dải vector mọc ra dưới một
  viên, ma trận dựng lên bên phải. Chuyển cảnh là chuyển vị trí, không phải cắt.
- Khi buộc phải bỏ hàng token (ví dụ sang phần RAG), cho nó **thu nhỏ về một góc** làm mốc chứ đừng cho
  biến mất — người xem cần biết mình vẫn đang ở trong cùng một câu chuyện.

## Vẽ gì, khi nào

| Muốn nói | Dùng |
|---|---|
| Câu này cắt thành token thế nào | `TokenRow` (`ids` khi bài nói về chỉ số) |
| Mỗi token là một dãy số | `VectorStrip` ngay dưới viên token, `tokenLayout()` cho toạ độ |
| Dãy số dọc, có con số cụ thể | `VectorColumn` (nhóm `data`) |
| Token nào nhìn token nào | `AttentionLines` với `focus` một token |
| Toàn cảnh bảng chú ý | `Heatmap` (nhóm `data`) — **không** dùng đường nối cho toàn cảnh |
| Một đại lượng trong phép tính | `MatrixGrid`, tô sáng hàng / cột đang nhân |
| Phân bố token tiếp theo | `ProbabilityBars` (nhóm `data`) |

## Nhịp

- Token hiện **từng viên theo lời đọc**: `shown` tăng theo `spokenAt(n, 'từ khoá')`, không đổ cả hàng.
- `reveal` của `VectorStrip` / `MatrixGrid` mở dần trong lúc lời đọc đang tả nó, xong trước khi câu kết thúc.
- Đổi `focus` của `AttentionLines` đúng lúc lời đọc gọi tên token khác. Mỗi lần đổi để hở ít nhất 15 khung
  hình cho mắt bắt kịp.
- Một cảnh chỉ làm **một** biến đổi. Vừa hiện token vừa mọc vector vừa kéo đường là không ai theo kịp.

## Màu

Không thêm màu mới. Giá trị **dương tô xanh `C.accent`, âm tô đỏ `C.red`**, độ lớn ra **sắc độ** (alpha
10 %–100 %); ngoặc vuông dùng `C.accentStrong`. Trọng số chú ý từ 0,6 trở lên tự chuyển sang đỏ — đó là chỗ
mắt phải bắt. Màu vai trò của Lesson Lab vẫn chỉ dùng cho nhãn vùng như bình thường, không tô vào ô dữ liệu.

## Số liệu

Token, trọng số, giá trị ô — **tất cả lấy từ kịch bản**. Một bảng attention bịa ra trông vẫn đẹp nhưng dạy
sai, và người xem không có cách nào biết. Nếu kịch bản không đưa số thì để ô trống (`showValues: false`):
đậm nhạt đã đủ kể chuyện "chỗ này lớn, chỗ kia nhỏ". Cách cắt token cũng vậy — nó chính là nội dung bài học.

## Tiêu chí QA

- Cùng một hàng token nhận ra được qua các ảnh: cùng chữ, cùng thứ tự, cùng cỡ; vị trí có dịch thì dịch
  liền mạch, không nhảy.
- Không ảnh nào có cả lưới đường chú ý n×n; mỗi ảnh chỉ một `focus`, đường đọc ra được từng sợi.
- Ô dữ liệu chỉ có hai hue (xanh dương, đỏ âm) ở các sắc độ; không có hue thứ ba trong vector / ma trận.
- Vector và ma trận có ngoặc vuông thật, không phải hình chữ nhật trơn.
- Con số trên màn hình (nếu có) khớp đúng với con số trong `kich-ban-goc.md`.
- Chữ nhỏ nhất (nhãn hàng / cột, chỉ số token) vẫn ≥ 18 px ở 1920 và không bị đường nối đè lên.
