# LEXCE revamp — dáng đứng, biểu cảm và hành động

`MascotRevamp` dùng một nguồn vector đã duyệt: `lexce-revamp-transparent.svg`, tách thành 417 path trong
`revampArtwork.js`. Mọi action hiện vẽ đúng thứ tự path gốc, xoay **toàn thân** −12° rồi đặt lại trong
khung để đầu, bụng và hông cùng trục. Chỉ `leanFoot` giữ dáng nghiêng nhấc một chân của ảnh gốc.
`hop` giữ bóng đất cố định và nhấc toàn nhân vật lên. Không tách riêng đầu/cánh cho action nữa, vì
rig cũ làm hở nét ở má và khiến thân trông lệch hông.

```jsx
<MascotRevamp pose="stand" emotion="idle" frame={frame} />
<MascotRevamp pose="waveRight" emotion="happy" frame={frame} />
<MascotRevamp pose="read" emotion="thinking" frame={frame} />
```

`pose` và `emotion` độc lập. Bỏ `pose` thì dùng `stand` đã duyệt; `emotion` thay mắt, lông mày, miệng
và dấu cảm xúc. `look` dịch ánh nhìn ngang trong giới hạn của artwork chính diện; không phải profile thật.
`talking` điều khiển khẩu hình bằng `frame`. `gesture="point"`/`"teach"` vẫn là alias cho cue cũ.

Các pose vẫy dùng vệt chuyển động lớn cạnh bàn tay; `point*` dùng gậy chỉ, `read` dùng sách mở,
`sketch` dùng bảng vẽ. Đây là các lớp SVG nằm trên cùng nhân vật, không phải nhân vật/bitmap mới.
Cánh gốc vẫn dang ngang; muốn cánh gập hoặc đưa tay vào bụng thật sự cần artwork cánh riêng,
không tăng góc xoay rig cũ vì đã đo thấy nó chồng cánh lên má và lộ mép vector.

## QA một lệnh

`npm run qa:mascot -- --quick` build và chụp bảng 11 biểu cảm, 12 hành động ở hai frame,
card 700×400 và bốn action ở cỡ slide 300 px vào `reports/mascot-qa/`. Mở ảnh ra nhìn,
đặc biệt là `slide-size.png` để kiểm tra đạo cụ và hai chân. Trước bàn giao chạy
`npm run qa:mascot` để thêm `verify`; lệnh tự mở và đóng preview server. Trang nguồn ở
`ui_kits/lesson-video/demos/mascot-qa.html` và `mascot-slide-qa.html`.
