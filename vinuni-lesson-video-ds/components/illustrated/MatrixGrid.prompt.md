# MatrixGrid

Một **ma trận thật**: ngoặc vuông hai bên, mỗi ô một sắc độ, nhãn hàng / cột nếu cần. Tô sáng được cả
một hàng hoặc cả một cột để chỉ ra tích vô hướng đang lấy hàng nào nhân cột nào.

```jsx
<MatrixGrid x={300} y={280} values={W} rowLabels={TOKENS} label="Ma trận trọng số"
            highlightRow={2} reveal={r} />
```

- Khác `Heatmap` (nhóm `data`): `Heatmap` là **lưới thuần** để nhìn phân bố; `MatrixGrid` là **một đại
  lượng trong phép tính** — có ngoặc, có nhãn, tô sáng được hàng / cột đang tham gia.
- `highlightRow` / `highlightCol` làm mờ phần còn lại xuống 25 % và kẻ viền đỏ quanh phần đang nói.
  Mỗi lúc chỉ nên sáng một thứ.
- `reveal` mở dần **theo hàng**, hợp với lời đọc kể từng hàng một.
- `showValues` chỉ khi kịch bản có số thật. Ma trận minh hoạ thì để trống ô.
