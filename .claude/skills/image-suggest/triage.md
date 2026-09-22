# Chặng 1 · Chọn chỗ — câu nào đáng có ảnh thật

Đọc `<video>/cues.js` (lời đọc `text`, chữ trên màn hình `title`/`screen`, phần `section`). Không cần web.
Ghi đúng một file: `projects/<id>/images/triage.json`.

## Câu nào nên

Ảnh thật làm được điều animation không làm được: cho người xem **nhận ra một thứ có thật**.
- **Người, nhóm người, sự kiện có thật**, có tên và (thường) có năm: Alan Turing, hội thảo Dartmouth 1956,
  Deep Blue thắng Kasparov 1997, Frank Rosenblatt với Mark I Perceptron.
- **Hiện vật mà hình dáng là điểm chính**: máy ENIAC, chip TPU, robot Shakey, bàn cờ vây AlphaGo.
- **Hình kinh điển của một khái niệm có tên**, ai học ngành cũng từng thấy: sơ đồ kiến trúc Transformer, ảnh
  "perceptron" gốc. Loại này gần như luôn là `reference` — agent dựng cảnh xem để vẽ lại đúng từng khối,
  không dán hình của paper vào video.

## Câu nào không

- Câu giải thích quy trình, so sánh, vòng lặp, danh sách bước — design system diễn đạt tốt hơn.
- Ví dụ tự đặt ("một học viên…", tình huống MINH HỌA), câu mở/kết, câu chuyển ý.
- Khái niệm trừu tượng không có hình chuẩn ("dữ liệu", "trí tuệ", "đám mây").
- Câu hỏi quiz và khoảng chờ quiz (`quiz: true`), khoảng lặng (`silent: true`).
- Logo, ảnh chụp giao diện sản phẩm thương mại: ảnh có giấy phép tự do hiếm và dễ sai phiên bản — nếu thật sự
  cần thì `reference`, không `use`.
- Câu chỉ **nhắc qua** tên người hay năm mà ý chính là chuyện khác.

## Ít mà trúng

- Tối đa `max(2, số phần của kịch bản)` chỗ, không quá 8 (`images.policy.json → maxSlots`). **Bỏ trống là kết
  quả tốt** khi video không có gì để nhận ra: ghi `"slots": []`.
- Gộp các câu liền nhau nói cùng một chủ thể thành một chỗ; một câu chỉ thuộc một chỗ.
- Giữa hai chỗ na ná, giữ chỗ mà người xem được lợi nhất khi thấy ảnh.

## triage.json

```json
{ "version": 1,
  "slots": [
    { "slot": "s3", "cues": [3, 4], "kind": "use",
      "subject": "Alan Turing",
      "era": "1950s",
      "why": "Câu 3 nêu tên Alan Turing và phép thử năm 1950 — chân dung giúp người xem gắn cái tên với một người thật.",
      "queries": ["Alan Turing portrait", "Alan Turing 1951"] } ] }
```

- `slot` = `s` + số câu đầu tiên trong `cues`; `cues` tăng dần, là `n` có thật.
- `kind`: `use` (dùng ảnh trong video) · `reference` (chỉ để dựng lại bằng component).
- `subject`: ảnh phải cho thấy **ai / cái gì** — viết cụ thể, đó là thứ người dựng đối chiếu với ảnh.
- `why` (≥ 30 ký tự): vì sao ảnh thật hơn animation **ở câu này**.
- `queries`: 1–3 từ khoá **tiếng Anh**, tên riêng viết đúng như trên Wikipedia, thêm năm cho ảnh lịch sử,
  thêm "diagram"/"architecture" cho hình khái niệm. Không dùng câu dài, không dùng dấu ngoặc kép.

Xong thì `node tools/image-check.mjs <video> --stage triage` (khi chạy ngoài Studio) và trả lời mỗi chỗ một
dòng: mã, câu, chủ thể, kiểu.
