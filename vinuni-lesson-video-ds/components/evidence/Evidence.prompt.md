# Evidence — ảnh chụp nguồn thật, dán kiểu phóng sự

Hiện một **ảnh chụp nguồn có thật** (trang web, văn bản pháp quy, biểu đồ trong paper, báo cáo)
lên khung: giấy hơi nghiêng, băng keo bốn góc, khung đỏ khoanh dòng quan trọng, con dấu, và một
dòng chú thích nói rõ đang xem cái gì.

Dùng khi câu đọc viện dẫn một nguồn cụ thể. Sơ đồ tự vẽ chỉ nói "theo lý thuyết"; ảnh chụp nguồn
thật nói "có thật, đây, xem đi".

## ⚠️ Luật trung thực — đọc trước khi dùng

Component này **khẳng định với người xem rằng thứ trên màn hình là thật**. Nên:

1. **Chỉ dùng cho ảnh chụp nguồn CÓ THẬT.** Không bao giờ đưa ảnh dựng, ảnh mock, hay screenshot
   chế vào đây. Làm vậy là mượn dấu hiệu đáng tin để bán thứ không có thật.
2. Nội dung mô phỏng thì dùng `IllustrativeStamp` với nhãn `MINH HỌA` (xem `components/labels/`),
   **không** dùng Evidence.
3. `caption` phải nói đúng nguồn là gì và ở đâu, đủ để người xem tự tra lại được.
4. `stamp` chỉ để nhấn, không thay cho `caption`. Đừng đóng dấu khẳng định mạnh hơn thứ nguồn
   thực sự chứng minh.

Khác `figures/SourceCard.jsx`: cái đó là **thẻ trích dẫn bằng chữ** (tên nguồn + trạng thái đối
chiếu). Evidence là **ảnh chụp thật**. Cần dẫn nguồn mà không có ảnh thì dùng SourceCard.

## Props

| Prop | Mặc định | Ý nghĩa |
|---|---|---|
| `frame` | `0` | Frame hiện tại của scene. Bắt buộc để có chuyển động. |
| `href` | — | Đường dẫn ảnh. Ảnh nặng để trong `media/` theo luật repo, không commit. |
| `caption` | — | Dòng chú thích nguồn, hiện ngang (không nghiêng theo ảnh). |
| `stamp` | `null` | Chữ trong con dấu, ví dụ `"NGUỒN THẬT"`. Bỏ trống thì không vẽ dấu. |
| `marks` | `[]` | Khung đỏ khoanh dòng quan trọng, toạ độ **tương đối 0..1** so với ảnh: `{x,y,w,h}`. |
| `x,y,width,height` | `300,250,1320,660` | Vị trí và kích thước tấm ảnh trên canvas 1920×1080. |
| `tilt` | `-1.4` | Độ nghiêng của giấy (độ). Giữ nhỏ, nghiêng nhiều đọc mệt. |

Dùng `marks` bằng toạ độ tương đối để đổi ảnh không phải tính lại pixel.

## Nhịp chuyển động (đều là hàm của `frame`)

| Frame | Xảy ra gì |
|---|---|
| 0–8 | Ảnh rơi vào khung, nảy nhẹ bằng `spring()`, hiện dần |
| 10–18 | Thanh chú thích trượt hiện |
| 16+ | Khung đỏ vẽ dần từ trái sang, mỗi khung cách nhau 8 frame |
| 22–30 | Con dấu đóng xuống (to rồi thu lại) |

Nghĩa là cue dùng Evidence nên dài **ít nhất ~1.5 giây** (45 frame) thì mới kịp diễn hết.

## Ví dụ

```jsx
<EvidenceBoard />
<Evidence
  frame={f}
  href="/media/files/aiact-2024-article6.png"
  caption="EU AI Act 2024, Điều 6 — phân loại hệ thống rủi ro cao"
  stamp="NGUỒN THẬT"
  marks={[{ x: 0.10, y: 0.34, w: 0.78, h: 0.07 }]}
/>
```
