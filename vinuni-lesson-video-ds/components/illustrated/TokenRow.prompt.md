# TokenRow

Một câu đã **cắt thành token**: mỗi token một viên gạch, xếp hàng và tự xuống dòng khi hết `maxW`.
Vật liệu mở đầu của style Illustrated — hàng này rồi thành vector, thành ma trận, và là hai đầu của
`AttentionLines`.

```jsx
const TOKENS = ['Hôm', 'nay', 'mình', 'học', 'về', 'chú', 'ý'];
<TokenRow x={240} y={320} tokens={TOKENS} shown={n} enter={appear(f, T.tok)} highlight={5} ids />
```

- `shown` là **số token đã hiện**, đếm theo lời đọc; `enter` là phần hiện dở của viên kế tiếp. Hiện
  từng viên theo `spokenAt` khi lời đọc đang đọc chính câu đó.
- **Không tự cắt token.** Danh sách token do kịch bản đưa — cách cắt chính là nội dung bài học
  (`'không'` một token hay `'kh'` + `'ông'`), bịa ra là dạy sai.
- `tokenLayout({...})` trả về vị trí từng viên (`x, y, w, h, cx, cy`): dùng để đặt `VectorStrip` ngay
  dưới một token, hoặc làm neo cho `AttentionLines` qua `anchorsBelow` / `anchorsAbove`.
- `ids` viết chỉ số dưới mỗi viên — bật khi bài nói về "token thứ mấy", tắt cho các cảnh khác.
