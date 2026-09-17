# Griffin · GriffinBadge

Linh vật VinUni (griffin: 4 chân, 2 cánh, khăn VinUni) — **bản 1, dạng sticker nguyên con**.

```jsx
<Griffin x={1540} y={930} h={460} frame={T} enter={spokenAt(1, 'Xin chào')}
  hops={[spokenAt(1, 'chào')]}
  mood={[{ at: 0, name: 'happy' }, { at: spokenAt(2, 'nhưng'), name: 'thinking' }]}
  prop={[{ at: spokenAt(2, 'nhưng'), name: 'question' }, { at: spokenAt(3, 'hiểu'), name: 'lightbulb' }]} />

<GriffinBadge x={180} y={820} r={60} mood="wink" frame={T} enter={30} />
```

## Khi nào dùng

- Người dẫn dắt ở mở bài / chuyển đoạn / kết bài: chào, gợi câu hỏi, "à ra thế", chúc mừng.
- `GriffinBadge` — chỉ gương mặt trong khung tròn: dấu phản ứng nhỏ cạnh một ý, hoặc avatar khi Griffin là
  một bên của hội thoại. `griffinAsset('face_happy')` trả URL để truyền vào `avatar` của `DialogueCard`.

**Không dùng** trong cảnh đang giải thích dày chữ/sơ đồ — linh vật chiếm ~25 % khung và hút mắt. Một cảnh
tối đa một Griffin.

## Có gì

- `pose`: `stand` · `sit` (ảnh lớn, nét ở mọi cỡ; cả hai đều nháy mắt, cánh mở) · `front` · `left` · `right`
  · `back` (ảnh nhỏ ~225 px — giữ `h` ≤ 260, hợp làm "hướng dẫn viên" ở góc).
- `mood` (bong bóng tròn cạnh đầu): `neutral` `happy` `wink` `thinking` `surprised` `sad` `angry`.
- `prop` (bay trên đầu): `lightbulb` `question` `exclamation` `sparkle` `book` `laptop` `hat`.
- Chuyển động: `enter` (bật vào), `motion` `idle` (thở) / `float` (bồng bềnh) / `none`, `hops` (nhảy một nhịp
  tại frame cho sẵn), `tilt`, `flip`.

`mood` và `prop` nhận một tên hoặc danh sách `{ at, name }`: mỗi bước đổi mờ sang trong 8 frame; prop mới
lấp lánh **một lần** lúc đến. Đặt `at` bằng `spokenAt(n, phrase)` để khớp lời.

## Ràng buộc

- `x, y` là **chân** (tâm đáy). Đầu và bong bóng nằm phía trên ~`h` px — với `h` 460, đặt `y` ≈ 930 để cả
  prop lẫn bong bóng vẫn trong vùng nội dung y 250–960.
- Chưa có khớp nối: **không** giơ cánh, không đổi mặt trên thân, không mấp máy mỏ theo giọng — những thứ
  đó cần bộ ảnh bản 2 (thân không đầu, đầu trống, cánh rời cùng tỉ lệ, điểm gắn).
- Tay không có: Griffin không cầm, không chỉ bằng "tay". Đạo cụ chỉ bay cạnh đầu.
- Ảnh nằm ở `assets/mascot/griffin/`, URL tính từ `dist/vk.js`; trang nạp bundle theo cách khác thì truyền `base`.
- Mọi chuyển động là hàm của `frame` — không đồng hồ thật, không ngẫu nhiên.
