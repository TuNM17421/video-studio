# Griffin · GriffinBadge

Linh vật VinUni (griffin: 4 chân, 2 cánh, khăn VinUni) — **bản 2: ảnh nguyên con, mỗi dáng × mỗi biểu cảm
một ảnh**, đổi theo nhịp lời.

```jsx
<Griffin x={1540} y={930} h={460} frame={T}
  pose={[{ at: 0, name: 'walk-left' }, { at: spokenAt(1, 'Xin chào'), name: 'wave' }, { at: spokenAt(2, 'nhưng'), name: 'stand' }]}
  mood={[{ at: 0, name: 'happy' }, { at: spokenAt(2, 'nhưng'), name: 'thinking' }, { at: spokenAt(3, 'hiểu'), name: 'surprised' }]}
  prop={[{ at: spokenAt(2, 'nhưng'), name: 'question' }, { at: spokenAt(3, 'hiểu'), name: 'lightbulb' }]}
  hops={[spokenAt(3, 'hiểu')]} />

<GriffinBadge x={180} y={820} r={60} mood="wink" frame={T} enter={30} />
<DialogueCard … speaker="Griffin" avatar={griffinAsset('face-happy')} … />
```

## Khi nào dùng

- Người dẫn dắt ở mở bài / chuyển đoạn / kết bài: bước vào, vẫy cánh chào, gợi câu hỏi, "à ra thế", chúc mừng.
- `GriffinBadge` — gương mặt trong khung tròn: dấu phản ứng nhỏ cạnh một ý (ảnh mặt riêng, nét tới `r` ≈ 100).
- `griffinAsset('face-<mood>')` là ảnh vuông cho `avatar` của `DialogueCard` khi Griffin là một bên của hội thoại.

**Không dùng** trong cảnh đang giải thích dày chữ/sơ đồ — linh vật chiếm ~25 % khung và hút mắt. Một cảnh
tối đa một Griffin.

## Có gì

- **Dáng có biểu cảm** (`mood` đổi mặt ngay trên thân): `stand` (đứng, cánh xếp) · `sit` (ngồi) · `wings`
  (đứng, hai cánh giơ cao) · `turn` (ba phần tư, cánh mở — các biểu cảm của bộ này lệch dáng nhau nhiều hơn,
  đổi mặt trông như một cử động nhỏ).
- **Động tác** (hiện mới vẽ một biểu cảm — `neutral`, vui mắt mở): `wave` (giơ cánh phải — thay cho "giơ tay"), `welcome` (dang
  cánh chào đón), `cheer` (hai cánh giơ, vui), `rest` (ngồi nghỉ), `walk-left` / `walk-right` (đi chéo —
  tự nhún nhịp bước; tự dịch `x` bằng `interpolate` để đi vào khung).
- `mood`: `neutral` `happy` `wink` `surprised` `thinking` (nhìn lên) `sad` `stern` (`angry` = `stern`).
- `prop` (bay chéo phía trên bên phải đầu, ngang mào — `flip` thì sang trái): `lightbulb` `question` `exclamation` `sparkle`.
- Chuyển động: `enter` (bật vào), `motion` `idle` / `float` / `none`, `hops`, `tilt`, `flip`.

`pose`, `mood`, `prop` nhận một tên hoặc danh sách `{ at, name }`. Đặt `at` bằng `spokenAt(n, phrase)`.

Tư thế nào có biểu cảm nào: `GRIFFIN_POSE_MOODS` (sinh cùng ảnh). Gọi một biểu cảm tư thế chưa có thì hiện
ảnh mặc định của tư thế đó, không lỗi và không có nhát cắt — nên có thể khai `mood` cho cả cảnh rồi đổi
`pose` tự do; khi bộ ảnh bổ sung biểu cảm cho tư thế, cảnh cũ tự dùng ảnh mới.

## Ràng buộc

- Đổi dáng/biểu cảm là **cắt thẳng** kèm một nhịp nhún 8 frame — ảnh là các bản vẽ riêng, chồng mờ sẽ hiện
  hai đường viền. Đừng đổi nhanh hơn ~1 lần/giây, nhân vật sẽ giật.
- `x, y` là **chân** (tâm đáy). Đạo cụ nằm ngang mào, lệch sang bên ~`0.2h` — với `h` 460, đặt `y` ≈ 930 để cả con vẫn
  trong vùng nội dung y 250–960.
- Không có tay: Griffin không cầm, không chỉ. "Giơ tay" = `wave`. Mỏ không mấp máy theo lời.
- Ảnh ở `assets/mascot/griffin/` (xem README ở đó để dựng lại từ bộ gốc), URL tính từ `dist/vk.js`; trang nạp
  bundle theo cách khác thì truyền `base`. Mọi ảnh sẽ dùng đều được tải sẵn từ frame 0.
- Mọi chuyển động là hàm của `frame` — không đồng hồ thật, không ngẫu nhiên.
