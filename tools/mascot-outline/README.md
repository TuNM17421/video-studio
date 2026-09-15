# mascot-outline — sinh `components/mascot/revampOutline.js`

Chạy lại **mỗi khi đổi `RIG_POLYS` trong `revampRig.js`**. Không sửa tay `revampOutline.js`.

## Vì sao cần
`revampArtwork.js` là bản trace của một tấm hình: nó chỉ có đường viền ở chỗ NHÌN THẤY được trong
tấm hình đó. Mép trong của cánh vốn áp vào thân nên ở đó đường viền thuộc về thân. Rig tách cánh ra
là mép ấy trơ kem, và cánh giơ lên chồng vào đầu thì kem chồng kem — lỗi "dính cánh và tay".
Script này dò lại bóng dáng thật của từng vùng rồi vẽ bù đúng phần viền còn thiếu.

## Chạy
```bash
npm run build
python3 -m http.server 8765 --bind 127.0.0.1 --directory vinuni-lesson-video-ds &
node tools/mascot-outline/render-masks.mjs            # 3 mask PNG + polys.json vào thư mục tạm
python3 tools/mascot-outline/trace.py <thư mục tạm>   # in ra revampOutline.js
```

## Hai tham số quyết định kết quả
- `CUT_NEAR` (11) — điểm biên cách mép polygon dưới ngần này bị coi là **mép cắt của rig**, không
  phải bóng dáng nhân vật, nên KHÔNG vẽ viền. Bỏ lọc này là kẻ một vết sẹo ngang cổ và ngang vai.
- `OUTLINE_WIDTH` (22) — vẽ đè lên chính vùng đó rồi clip theo bóng dáng, nên chỉ nửa trong ăn màu:
  viền dày 11 đơn vị, khớp bề dày viền của artwork, và bóng dáng không to thêm pixel nào.
