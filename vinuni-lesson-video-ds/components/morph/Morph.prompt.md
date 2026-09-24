# Morph

Một vật đang **biến hình** giữa hai trạng thái. Không chỉ đổi hình: màu tô, độ đặc, màu viền và bề dày
viền cùng nội suy theo một `t` — đó mới là thứ làm mắt tin "vẫn là cùng một vật". Đổi hình mà màu nhảy
một phát thì người xem đọc thành hai vật khác nhau.

```jsx
import { Morph, shapes } from '../../../../components/index.js';

<Morph from={shapes.strip({ x: 500, y: 330, n: 8 })}
       to={shapes.arrow({ from: O, to: TIP })}
       t={interpolate(frame, [150, 260], [0, 1], CLAMP)}
       fill={C.accent} fillOpacity={[0.1, 0.92]} stroke={[C.accentStrong, 'none']} strokeWidth={[3, 0]} />
```

- `from` / `to` **phải là path khép kín cùng chiều** — dùng `shapes.*`, đừng tự viết `d` bằng tay và đừng
  dùng `<rect>` / `<circle>`: chúng đẹp như nhau nhưng không biến hình được.
- Mỗi prop nhận một giá trị (giữ nguyên) hoặc cặp `[đầu, cuối]`.
- Nhiều hơn hai trạng thái thì dùng `MorphSequence`, đừng xâu chuỗi nhiều `Morph`.
