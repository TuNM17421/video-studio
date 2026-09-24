# shapes

Từ vựng hình cho biến hình — mọi hàm trả về **một path khép kín, cùng chiều kim đồng hồ**, là điều kiện
để `morphPath` (flubber) nội suy sạch.

```js
import { shapes } from '../../../../components/index.js';
shapes.rect({ x, y, w, h, r: 12 })      shapes.circle({ cx, cy, r })
shapes.arrow({ from, to, width, head }) shapes.triangle({ cx, cy, r, rotate })
shapes.wedge({ cx, cy, r, from, to })   shapes.polygon([[x, y], …])
shapes.strip({ x, y, n })               shapes.cell({ x, y, i })
```

**Vẽ bằng `<rect>` / `<circle>` thì không biến hình được.** Đây là kỷ luật của style: mọi trạng thái của
một vật phải là path cùng loại, nếu không flubber sẽ xoắn hình hoặc nhảy. Đường cong đã được chia thành
đa giác sẵn — đừng tăng `n` / `seg` quá tay, nhiều đỉnh không làm mượt thêm mà chỉ nặng.

Cần một hình chưa có? Thêm hàm vào `shapes.js` (cùng quy ước khép kín, cùng chiều), đừng viết `d` tay
trong file video.
