---
style: illustrated
extends: lesson-lab
---

# Illustrated Style (lab) — phần thêm

Đọc `styles/lesson.md` rồi `styles/lesson-lab.md` trước; file này chỉ ghi phần thêm. Vẫn dùng `cues.js`,
`timeline.js`, phụ đề, beat theo `spokenAt` như mọi video. Nhưng **không** dùng `Series` và `sNN.jsx`:
style này có cơ chế riêng, giống bảng trắng ở chỗ cả video là một mặt duy nhất.

Video mẫu: `vinuni-lesson-video-ds/ui_kits/lesson-video/videos/n1-03-llm-sinh-tung-token/` — đọc
`canvas.jsx` (bố cục mặt phẳng, mốc camera, vùng soát) và `video.jsx`.

Component riêng, **hai nhóm**:
- `components/illustrated/` — sân khấu và từ vựng nội dung: đọc `Canvas.prompt.md` trước, rồi
  `TokenRow.prompt.md`, `VectorStrip.prompt.md`, `MatrixGrid.prompt.md`, `AttentionLines.prompt.md`.
- `components/morph/` — phép biến đổi: đọc `MorphSequence.prompt.md` trước, rồi `shapes.prompt.md`,
  `Morph.prompt.md`, `Layer.prompt.md`, `Axes.prompt.md`.

Dùng thêm `VectorColumn`, `Heatmap`, `ProbabilityBars`, `TokenChip` của nhóm `data`. Clip thử của phần
biến hình: `ui_kits/lesson-video/videos/thu-morph/` (hai mươi giây, không lời đọc).

## Cơ chế: một mặt phẳng + camera, KHÔNG phải chuỗi cảnh

Đây là điều kiện cần. Dùng `Series` với mỗi câu một `SceneFrame` có tiêu đề thì dù vẽ gì bên trong, video
vẫn đọc ra là Lesson Lab — cái vỏ quyết định thị giác mạnh hơn nội dung. Đã thử và đã phải làm lại.

`video.jsx` vẽ **một** `SceneFrame` `header={false}`, eyebrow qua `overlay`, phụ đề `cueCaptions` của cả
video, bọc lấy `<Canvas frame camera>` (xem `components/illustrated/Canvas.prompt.md`). Mọi phần tử nằm
trên mặt phẳng ấy ở một toạ độ **cố định**; muốn xem gần thì lia camera tới nó.

- **Không tiêu đề cảnh.** Chữ cần thấy viết thẳng lên mặt phẳng, cạnh đúng thứ nó chú thích.
- **Không phần tử nào đổi toạ độ.** Đổi toạ độ là teleport, và teleport chính là cái làm nó thành slide.
- Khai `meta.canvas = { zones, camera }` để `npm run verify` soát: lia hay zoom mà đẩy một cụm lên dưới
  eyebrow hoặc xuống dưới thanh phụ đề thì báo problem. Đây là lỗi **không** nhìn ảnh tĩnh mà thấy được,
  vì nó chỉ xảy ra trong lúc camera đang di chuyển — khai `zones` cho đủ, kể cả nhãn nằm trên nóc hộp.
- Chú thích của một câu (nhãn, mũi tên phụ) được phép mờ đi khi camera rời vùng đó. **Vật liệu chính thì
  không**: hàng token phải còn nguyên tới cuối.

## Vật trên mặt phẳng thì BIẾN HÌNH, không bị thay

Mặt phẳng là sân khấu; thứ diễn trên đó phải biến đổi liên tục, nếu không style này chỉ là slide có
camera. Mỗi vật khai **một** `MorphSequence` (`components/morph/`), là một danh sách trạng thái theo
khung hình — cùng ý tưởng với `marks` của bảng trắng và `camera` ở trên:

```jsx
<MorphSequence frame={frame} states={[
  { at: 0, shape: shapes.strip({ x, y, n: 8 }), fill: C.accent, fillOpacity: 0.1, stroke: C.accentStrong, strokeWidth: 3 },
  { at: spokenAt(9, 'một dãy số'), dur: 110, shape: shapes.arrow({ from: O, to: TIP }), fillOpacity: 0.92, strokeWidth: 0 },
]} />
```

- Trạng thái sau **thừa kế** thuộc tính không khai; `at` lấy bằng `spokenAt(n, 'cụm từ')`.
- **Một vật = một `MorphSequence`.** Đừng cho vật biến mất rồi dựng lại bằng component khác.
- **Mọi hình là path khép kín** từ `components/morph/shapes.js` (`rect · circle · arrow · triangle ·
  wedge · polygon · cell · strip`). Vẽ bằng `<rect>` / `<circle>` trông y hệt nhưng **không biến hình
  được** — flubber cần hai path cùng loại, cùng chiều. Đây là kỷ luật của style, không phải gợi ý.
- Độ đặc chỉ ba mức, qua `Layer`: `main` 100 % · `context` 40 % · `frame` 15 %. `Axes` luôn ở `frame`.

## Nhịp — và vì sao nó nằm ở kịch bản

Mỗi phép biến hình ít nhất khoảng hai giây, rồi **đứng yên** cho người xem ngấm. Nghĩa là kịch bản cho
năm phút ở style này có chừng **mười lăm đến hai mươi câu**, không phải bốn mươi. Thời lượng mỗi cảnh đo
từ giọng đọc, nên viết kịch bản dày rồi mới thấy hình chạy hụt hơi thì sửa là **phải thu lại giọng**.
Nói với người viết kịch bản **trước**.

## Nguyên tắc: một vật liệu sống suốt cả video

Đây là điểm phân biệt style này với mọi style khác, và cũng là chỗ dễ làm sai nhất.

Người xem phải thấy **cùng một thứ** đi qua các trạm, chứ không phải xem một chuỗi hình rời. Một câu
tiếng Việt cắt thành hàng token ở cảnh 1; cảnh 2 hàng token ấy **vẫn ở đó**, dưới mỗi viên mọc ra một dải
vector; cảnh 3 hàng ấy nhân đôi thành hai hàng và nối bằng đường chú ý; cảnh 4 các vector xếp lại thành
ma trận. Không cảnh nào xoá hàng token đi rồi vẽ hình khác.

Cách làm cụ thể:

- Khai **một** hằng `TOKENS` và **một** `ROW` (toạ độ gốc) ở đầu `canvas.jsx`; lấy vị trí từng viên bằng
  `tokenLayout(ROW)`. Không chỗ nào được đặt lại `x`, `y` của hàng token.
- Câu **mọc dần sang phải**: nối thêm viên thì hàng dài ra, camera đi theo. Đó là cách giữ "cùng một câu"
  mà vẫn kể được vòng lặp.
- Thứ mới (bảng khả năng, ma trận) đặt ở một vùng **bên cạnh** trên cùng mặt phẳng, không đè lên vùng cũ.
  Chừa khoảng giữa các vùng đủ rộng để lúc lùi ra không có thẻ nào bị xén nửa ở mép khung.

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

- Không ảnh nào có tiêu đề cảnh ở giữa màn hình; chữ nằm cạnh hình nó chú thích.
- Không cụm nào bị eyebrow hay thanh phụ đề cắt ngang, kể cả ở khung giữa lúc camera đang lia.
- Không có thẻ hay bảng nào của vùng bên cạnh lọt vào mép khung ở dạng bị xén nửa.
- Cùng một hàng token nhận ra được qua các ảnh: cùng chữ, cùng thứ tự, cùng cỡ; vị trí có dịch thì dịch
  liền mạch, không nhảy.
- Không ảnh nào có cả lưới đường chú ý n×n; mỗi ảnh chỉ một `focus`, đường đọc ra được từng sợi.
- Ô dữ liệu chỉ có hai hue (xanh dương, đỏ âm) ở các sắc độ; không có hue thứ ba trong vector / ma trận.
- Vector và ma trận có ngoặc vuông thật, không phải hình chữ nhật trơn.
- Con số trên màn hình (nếu có) khớp đúng với con số trong `kich-ban-goc.md`.
- Chữ nhỏ nhất (nhãn hàng / cột, chỉ số token) vẫn ≥ 18 px ở 1920 và không bị đường nối đè lên.
- Chụp cả **khung giữa** của mỗi phép biến hình, không chỉ đầu và cuối: hình ở giữa phải ra một hình
  trung gian hợp lý, không xoắn và không nhảy. Đây là lỗi ảnh đầu/cuối không bao giờ lộ.
- Độ đặc chỉ rơi vào ba mức 100 / 40 / 15; trục toạ độ ở mức khung, không tranh chú ý với vật.
