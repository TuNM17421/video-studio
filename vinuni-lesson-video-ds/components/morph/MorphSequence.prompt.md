# MorphSequence

**MỘT vật, nhiều trạng thái, sống suốt cả video.** Đây là khung dựng của style biến hình — cùng ý tưởng
với `marks` của bảng trắng: khai một **danh sách trạng thái theo khung hình**, component tự tìm cặp bao
quanh khung hiện tại và nội suy.

```jsx
<MorphSequence frame={frame} states={[
  { at: 0,   shape: shapes.strip({ x: 500, y: 330, n: 8 }), fillOpacity: 0.1, stroke: C.accentStrong, strokeWidth: 3 },
  { at: 150, dur: 110, shape: shapes.arrow({ from: O, to: TIP }), fillOpacity: 0.92, strokeWidth: 0 },
  { at: 430, dur: 90,  shape: shapes.arrow({ from: O, to: TIP2 }) },
]} />
```

- Trạng thái sau **thừa kế** mọi thuộc tính không khai của trạng thái trước — chỉ ghi cái đang đổi.
- `at` là khung bắt đầu chuyển, `dur` là số khung chuyển (mặc định 60). Nhịp của style này chậm: để mỗi
  phép biến hình ít nhất ~2 giây, và chừa thời gian đứng yên sau đó cho người xem ngấm.
- Một vật = **một** `MorphSequence`. Đừng cho vật biến mất rồi dựng lại bằng một component khác: cả một
  style đã hỏng vì lỗi đó ở lần trước.
- Khai `at` theo `spokenAt(n, 'cụm từ')` để phép biến hình xảy ra đúng lúc lời đọc nói tới nó.
