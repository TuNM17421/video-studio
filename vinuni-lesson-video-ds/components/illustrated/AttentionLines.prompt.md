# AttentionLines

**Token nào đang nhìn token nào**: đường cong từ hàng token trên xuống hàng dưới, đậm và dày theo
trọng số. Hình khó nhất của style Illustrated và cũng là hình đáng vẽ nhất — nói bằng lời thì mơ hồ.

```jsx
const top = tokenLayout({ x: 240, y: 300, tokens: TOKENS });
const bot = tokenLayout({ x: 240, y: 700, tokens: TOKENS });
<AttentionLines from={anchorsBelow(top)} to={anchorsAbove(bot)} links={LINKS} focus={4} reveal={r} />
```

- `links` là `{ from, to, w }` với `w` trong `[0, 1]`; **trọng số do kịch bản đưa**, không tự sinh —
  một bảng attention bịa ra là dạy sai.
- **Luôn dùng `focus`**: vẽ cả lưới n×n một lúc là mớ chỉ rối không ai đọc được. Một token một lúc,
  đổi `focus` theo câu lời đọc; cần nhìn toàn cảnh thì dùng `Heatmap` chứ không phải đường nối.
- Đường `w ≥ 0.6` chuyển sang đỏ — mắt bắt ngay chỗ mô hình đang nhìn nhất.
- `dip` đẩy đường võng xuống khi hai neo nằm **cùng độ cao** (ô trống ở cuối hàng nhìn về các viên phía
  trước): không có `dip` thì đường thành một gạch ngang chạy đè lên chính hàng token.
- `minWeight` bỏ đường quá nhẹ (mặc định 0.08) để không vẽ nhiễu; `reveal` 0→1 kéo từng đường ra dần.
- Neo lấy bằng `anchorsBelow` / `anchorsAbove` từ `tokenLayout()` của `TokenRow` — đừng tự tính toạ độ,
  lệch một chút là đường rời khỏi viên token.
