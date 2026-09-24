# VectorStrip

Một vector **nằm ngang**, vẽ thành dải ô — mỗi chiều một ô, đậm nhạt theo giá trị. Dùng ngay dưới một
`TokenRow` để nói "mỗi token là một dãy số"; cũng là một hàng của `MatrixGrid`.

```jsx
<VectorStrip x={640} y={520} values={[0.8, -0.3, 0.1, 0.6, -0.9]} label="Vector minh họa" reveal={r} />
```

- Giá trị trong `[-domain, domain]`: **dương tô mực chính, âm tô đỏ**, nên một dải có cả hai dấu vẫn
  đọc được mà không cần thêm màu ngoài bảng.
- `reveal` 0→1 mở dần từ trái — khớp với lúc lời đọc kể "mỗi chiều là một con số".
- `showValues` chỉ bật khi **kịch bản đưa số thật**. Không có số thì để ô trống, đậm nhạt đã đủ ý.
- Dùng `VectorColumn` (nhóm `data`) khi cần vector **dọc có số**; `VectorStrip` là bản nằm ngang,
  nhấn vào hình dạng và độ lớn chứ không vào con số.
