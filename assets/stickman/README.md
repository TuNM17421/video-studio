# Người que (stickman)

25 tư thế người que trong design system bảng trắng — dùng bằng `kind: 'doodle', name: 'nguoi-…'` như
mọi hình vẽ tay khác (xem `components/whiteboard/Whiteboard.prompt.md`).

## Ảnh gốc không nằm trong git

Chúng được **sinh ra** từ một tấm ảnh người que bên ngoài repo (giống ảnh gốc của linh vật Griffin):

- Tệp: `stick-figure-set-pictogram-stickman-free-vector.jpg` (tấm "40 STICKMAN")
- Giấy phép: **free vector**, người chủ repo xác nhận được phép dùng thương mại.
  Ai lấy lại hoặc thay tấm ảnh khác thì kiểm tra điều khoản của nguồn trước — điều khoản "free"
  của mỗi trang stock một khác, và bản ghi ở đây là ghi lại xác nhận đó, không phải kiểm tra tự động.
- Đường dẫn mặc định khai ở `tools/stickman-assets.json` → `source.file`; máy khác thì chạy với `--src`.

## Sinh lại

```
python3 tools/stickman-assets.py --check qa/          # xem thử: qa/stickman-check.svg
python3 tools/stickman-assets.py                      # ghi components/whiteboard/stickman.js
npm run build && npm run verify
```

Ảnh gốc là **raster**, không phải vector, nên không nhập thẳng làm doodle được. Script tách từng hình
(connected component), làm mảnh nét về **nét giữa** (Zhang–Suen), tách thành các đường, giản lược
(Douglas–Peucker) rồi quy về **lưới 24×24** y như icon Lucide. Nhờ vậy `roughenPath` vẫn làm nhăn được
thành nét tay và bút vẫn vẽ dần từng nét như mọi doodle khác.

## Thêm, bớt hay đổi tên tư thế

Sửa `figures` trong `tools/stickman-assets.json` (khoá là **chỉ số hình trên tấm ảnh**, xem bằng
`--check`) rồi chạy lại script. **Đừng sửa tay** `components/whiteboard/stickman.js`.

15 hình trên tấm ảnh bị loại, lý do ghi ở `dropped` trong cùng file json. Hai nhóm hay hỏng:
thân **tô đặc** (áo, cà vạt) — nét giữa của một mảng đặc ra hình cái nơ; và hình mà phần đầu dính
vào tay nên sau khi làm mảnh thì mất vòng đầu.
