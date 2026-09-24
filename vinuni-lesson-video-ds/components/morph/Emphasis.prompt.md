# Emphasis

Nhấn **tạm thời** vào một vật — ba kiểu của Manim gói trong một component.

| `kind` | Thấy gì |
|---|---|
| `indicate` | phình nhẹ rồi thu lại, ửng màu trong một nhịp |
| `flash` | toả tia ra từ tâm rồi tắt |
| `circumscribe` | một đường bao chạy quanh vật rồi biến mất |

```jsx
<Emphasis kind="indicate" box={cellBox} t={linearProgress(frame, T.nhan, T.nhan + 46)}>
  <TokenRow … />
</Emphasis>
```

- `t` là một **dốc 0→1** chạy suốt nhịp nhấn; component tự dựng hình chuông và tự quét đường bao.
  **Đừng truyền `pulse()`** — nó đã là 0→1→0, chồng thêm chuông thì đúng đỉnh nhịp lại thành 0.
- Nhấn tạm thời khác nhấn vĩnh viễn: sau nhịp đó vật **trở lại như cũ**, nên dùng được nhiều lần trong
  một video mà màn hình không đầy màu đỏ. Đổi màu hẳn chỉ dành cho thứ thật sự đổi trạng thái.
- Một lúc chỉ nhấn **một** chỗ. Hai chỗ cùng nhấp nháy thì không chỗ nào được nhìn.
