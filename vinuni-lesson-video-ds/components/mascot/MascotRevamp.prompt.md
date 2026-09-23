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

## Đã kiểm chứng bằng ảnh thật (2026-09-16) — pose nào thật, pose nào chỉ đổi tên

Chụp `stand` cạnh `handsDown`, `lookLeft`, `lookRight`, `profileLeft`, `profileRight`, `nod`,
`curious` (cùng frame, cùng emotion) rồi diff pixel:

- `handsDown` và `nod` **render y hệt `stand`** — 0 pixel khác biệt. `liftL`/`liftR`/`tilt`/`nod`
  trong `POSE_SPEC` không được đọc ở đâu trong `MascotRevamp.jsx`; đây là field chết, giữ lại chỉ để
  tương thích API với script cũ.
- `lookLeft`/`lookRight`/`profileLeft`/`profileRight`/`think`/`curious`/`lookUp`/`lookDown`/`peek`/
  `shrug`/`leanIn` chỉ khác `stand` ở **một dịch chuyển tròng mắt vài pixel** (`look` × 13 trong viewBox
  1122×1402) — thân, tay, cánh không đổi. Ở cỡ card 400-500px còn thấy hơi khác nếu zoom vào mặt; ở
  cỡ slide ~300px theo `mascot-slide-qa.html` thì gần như không phân biệt được bằng mắt thường.
- Pose có ActionAccent (`wave*`, `point*`, `teach`, `present`, `read`, `sketch`, `cheer`, `clap`)
  cũng dùng ĐÚNG một dáng người y hệt `stand` (tay giơ cao, cánh dang ngang) — khác biệt duy nhất là
  đạo cụ/vệt chuyển động vẽ đè lên trên. Chỉ `leanFoot` (dáng nghiêng, một chân nhấc) và `hop` (nhảy)
  thật sự đổi silhouette.
- `revampRig.js` + `revampOutline.js` (cùng commit với file này) là bản rig cắt vùng đầu/tay riêng,
  có sinh viền bù mép — **chính là "rig cũ" bị bỏ** ở đoạn trên, không phải một hướng chưa thử. Nó
  KHÔNG được import ở `MascotRevamp.jsx`. Đừng khôi phục để hạ tay: đã thử, đã bỏ, cùng lý do chồng
  cánh lên má/lộ mép vector dù đã có outline bù.
- Không tìm thấy layer/path nào trong `lexce-revamp.svg`/`lexce-revamp-transparent.svg` vẽ sẵn tay
  buông hoặc đầu quay ngang thật — `revampArtwork.js` là trace của đúng MỘT tư thế gốc.
- **Kết luận:** muốn có pose tay buông thật hoặc đầu quay ngang thật, phải có artwork nguồn mới
  (`.ai`/`.fig` hoặc SVG có biến thể tay/đầu khác), không sửa được bằng tham số trong component này.

## QA một lệnh

`npm run qa:mascot -- --quick` build và chụp bảng 11 biểu cảm, 12 hành động ở hai frame,
card 700×400 và bốn action ở cỡ slide 300 px vào `reports/mascot-qa/`. Mở ảnh ra nhìn,
đặc biệt là `slide-size.png` để kiểm tra đạo cụ và hai chân. Trước bàn giao chạy
`npm run qa:mascot` để thêm `verify`; lệnh tự mở và đóng preview server. Trang nguồn ở
`ui_kits/lesson-video/demos/mascot-qa.html` và `mascot-slide-qa.html`.
