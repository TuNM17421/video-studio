# GridTransform

**Cả mặt phẳng bị một ma trận kéo giãn** — hình nền tảng của *Essence of Linear Algebra*.

Đây là thứ `MorphSequence` không làm được: nó biến hình **một vật**, còn ở đây cái biến đổi là **không
gian**. Ý của Grant Sanderson: ma trận không phải bảng số, ma trận là một phép biến đổi; hai cột của nó
là chỗ hai vector cơ sở î và ĵ **đáp xuống** sau phép biến đổi. Vẽ được hình này thì câu ấy không cần
giải thích thêm.

```jsx
<GridTransform o={O} m={[[2, 1], [0, 1]]} t={interpolate(frame, [T.bat, T.xong], [0, 1], CLAMP)}
               unit={90} span={5} vectors />
```

- `m` là ma trận 2×2 **theo cột**: `[[a, c], [b, d]]` — cột một là î đáp xuống đâu, cột hai là ĵ.
- `t` nội suy từ ma trận đơn vị tới `m`, nên lưới **kéo dần** chứ không nhảy. Cho nó ít nhất hai giây.
- **Giữ `ghost`** (mặc định bật): lưới gốc ở lại phía sau ở mức 15 % để so trước / sau. Tắt nó đi là mất
  một nửa ý nghĩa — người xem không còn mốc nào để biết không gian đã méo bao nhiêu.
- `vectors` vẽ î đỏ và ĵ xanh đậm. Bật khi lời đọc đang nói về cột của ma trận.
- `gridPoint(o, matrixAt(m, t), unit, u, v)` để đặt một vật **theo lưới đang méo** — vật sẽ bị kéo theo
  đúng như nền, thay vì đứng yên trong khi nền chạy.
- **Đặt `clip`**: lưới bị kéo sẽ trải rộng hơn khung hình và tràn ra mép, trông như lỗi. `clip` cắt nó
  gọn trong một ô. Nhiều lưới trong một cảnh thì mỗi cái một `id` riêng.
- î và ĵ vẽ sau cùng và có đầu mũi tên, nên chúng không chìm dưới đường lưới.
- Trục y màn hình hướng xuống, component đã lật sẵn: `v` dương đi **lên**.
