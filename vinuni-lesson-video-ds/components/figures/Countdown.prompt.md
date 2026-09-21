# Countdown

Vòng đếm ngược cho **khoảng dừng** trong video có quiz: vành tròn vơi dần, số giây còn lại nằm giữa.
Vành mang núm và nút bấm của đồng hồ bấm giờ (`clock`, mặc định bật) để người xem nhận ra ngay đó là
đồng hồ; `clock={false}` cho vòng tròn trơn.

```jsx
<Countdown x={960} y={560} seconds={30} frame={T} label="giây để suy nghĩ" />
```

## Khi nào dùng

Dùng ở đúng những cue `silent` mang cờ `quiz: true` — khoảng người xem ngồi nghĩ, không ai nói. Độ dài
vòng đếm phải **bằng đúng `silent` của cue đó**, nếu không số chạy về không trước hoặc sau khi cảnh hết.

Đừng dùng cho nhịp lặng ngắn giữa hai câu (dưới ~5 giây) — vòng đếm to sẽ hút hết sự chú ý khỏi thứ
người xem đang cần đọc.

## Khác `Stopwatch` chỗ nào

`Stopwatch` quay một cây kim, hợp cho ý "thời gian đang trôi" trong cảnh minh hoạ. `Countdown` cùng
dáng đồng hồ bấm giờ nhưng trả lời **còn bao lâu nữa** — đó mới là câu hỏi duy nhất người xem có trong
một khoảng dừng. Đừng thay thế nhau.

## Ràng buộc

- `frame` là **frame của cảnh**, không phải đồng hồ thật: render vẽ frame không theo thứ tự và chậm hơn
  thời gian thật rất nhiều.
- Số ở giữa làm tròn lên, nên nó chỉ chạm không khi khoảng dừng thật sự kết thúc.
- Màu lấy từ `lib/tokens.js`. Mặc định đỏ trên vành xám nhạt; đổi `color`/`track` thì vẫn phải là màu
  trong bảng.
