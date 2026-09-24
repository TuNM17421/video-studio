# Plot

Đường cong của một hàm, tô được vùng dưới đường.

Dùng cho phân bố xác suất, đường học (loss), bất cứ thứ gì là "giá trị theo một trục".

```jsx
const plot = { o: { x: 300, y: 820 }, w: 1200, h: 420, from: -3, to: 3, min: 0, max: 1 };
<Plot {...plot} fn={(x) => Math.exp(-x * x / 2)} fill reveal={linearProgress(frame, T.ve, T.xong)} />
```

- `reveal` vẽ đường **từ trái sang**, hợp với lời đọc kể dần.
- `plotPoint(plot, x, y)` đặt một chấm hay một nhãn đúng chỗ trên đường mà không phải tự tính lại hàm.
- Hàm phải là hàm **kịch bản nói tới**. Đừng vẽ một đường cong đẹp rồi gán cho nó ý nghĩa: người xem đọc
  hình dạng đường là đọc một khẳng định.
