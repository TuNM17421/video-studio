# ValueReadout

Một **con số gắn với hình**, chạy mượt khi hình đổi.

Đây là thứ biến hình ảnh thành **đo được**: hai mũi tên khép lại thì số cosine chạy từ 0,42 lên 0,97 ngay
cạnh cung góc. Người xem thấy quan hệ giữa "gần nhau" và "số lớn" mà không cần ai nói ra.

```jsx
const cos = Math.cos(a1 - a2);
<ValueReadout x={1240} y={640} value={cos} label="ĐỘ TƯƠNG ĐỒNG" decimals={2} />
```

- **Nối `value` thẳng vào hình học đang chạy** (góc, độ dài, khoảng cách). Đừng tự nội suy một dãy số
  rời: làm thế thì số và hình sẽ lệch nhau, và người xem tin vào số.
- Số chỉ được làm tròn **khi vẽ**; dấu thập phân là dấu phẩy theo cách viết tiếng Việt.
- Chữ số có bề rộng bằng nhau nên số chạy mà chữ không giật sang trái phải.
- Chỉ dùng khi con số **tính ra được từ hình**. Số kịch bản đưa mà không gắn với hình nào thì viết thẳng
  bằng `SvgText`, đừng giả vờ là đang đo.
