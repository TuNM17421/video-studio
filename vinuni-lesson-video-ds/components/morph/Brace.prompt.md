# Brace

Dấu ngoặc nhọn ôm **một đoạn**, kèm nhãn.

Khác mọi cách nhấn khác ở chỗ nó chú thích một **khoảng**, không phải một điểm: "tám chiều này", "phần bị
cắt", "ba token đầu". Mũi tên chỉ được vào một chỗ; ngoặc nhọn nói được "từ đây tới đây".

```jsx
<Brace from={{ x: cells[0].x, y: 560 }} to={{ x: last.x + last.w, y: 560 }}
       label="tám chiều" side="down" grow={appear(frame, T.ngoac, 26)} />
```

- `grow` 0→1 mở ngoặc ra **từ giữa**, như Manim vẽ nó; nhãn hiện ở cuối, khi ngoặc đã gần xong.
- `side` là phía ngoặc nằm so với đoạn — `down` cho một hàng token, `left` / `right` cho một cột.
- Nhãn là chữ cần **thấy**, không phải chép lời đọc.
