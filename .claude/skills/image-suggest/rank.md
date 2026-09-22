# Chặng 3 · Xếp hạng — nhìn ảnh, chọn tối đa 3 ảnh mỗi chỗ

Với mỗi chỗ trong `projects/<id>/images/triage.json`: đọc `candidates/<slot>.json` (ảnh đã qua lọc giấy
phép, kèm metadata của nguồn), rồi **Read từng thumbnail** (`candidates/<slot>/cNN.<ext>`, đường dẫn trong
trường `thumb`). Ghi đúng một file: `projects/<id>/images/suggest.json`. Không web, không tìm thêm ảnh.

## Loại ảnh khi

- **Sai chủ thể**: metadata hoặc ảnh cho thấy người khác, sự kiện khác, thời điểm khác với `subject` / `era`.
  Tượng, tranh vẽ, ảnh do AI tạo, ảnh bìa sách về một người **không phải** chân dung người đó — trừ khi câu
  nói về chính nó. Với người và sự kiện có thật, chỉ ảnh chụp thật mới là tư liệu.
- Có watermark, chữ hay logo chồng lên, viền của trang scan, ảnh ghép, ảnh chụp màn hình trang web.
- Mờ, vỡ, quá tối; hoặc chủ thể quá nhỏ trong khung.
- Metadata mơ hồ tới mức người dựng không kiểm được ảnh là gì (không tiêu đề, không mô tả, không trang nguồn).
- Với `kind: "reference"`: hình không cho thấy cấu trúc cần vẽ lại (chỉ là ảnh minh hoạ chung chung).

`lowRes: true` (cạnh dài < 800 px) không tự loại — nhưng chỉ chọn khi không còn ảnh nào tốt hơn, và nói rõ.

## Ảnh từ trang research (`source: "research"`)

Video đóng gói từ "Đóng gói kịch bản" có thêm vài ứng viên là ảnh đại diện (og:image) của đúng những trang
research đã dẫn cho câu đó — trường `research` ghi claim và nguồn. Giấy phép của chúng **không rõ**
(`license: "unknown"`, `referenceOnly: true`): người dựng chỉ dùng làm tham khảo, trừ khi tự kiểm giấy phép.
- Chọn khi ảnh cho thấy **đúng chủ thể** tốt hơn các ảnh có giấy phép rõ — nhất là với chỗ `kind: "reference"`
  (sơ đồ trong bài gốc, ảnh chụp giao diện). Nói rõ trong `why` là ảnh từ trang research.
- Loại: ảnh bìa chung của bài/trang (chân dung tác giả bài báo, banner chuyên mục, ảnh minh hoạ stock), ảnh có
  chữ tít chồng lên, ảnh logo.
- Giữa một ảnh research và một ảnh có giấy phép rõ ngang nhau, đặt ảnh có giấy phép rõ lên trước.

## Chọn

- Tối đa 3 ảnh, tốt nhất đứng đầu. `fit`: `good` (đúng chủ thể, dùng được ngay) · `ok` (dùng được, có điểm trừ
  — nêu trong `why`).
- `why` (≥ 20 ký tự) nói về **quan hệ với câu** ("chân dung đúng giai đoạn ông viết bài báo 1950"), dựa vào
  metadata. **Không bịa** chi tiết ảnh mà metadata không ghi (năm chụp, người đứng cạnh, địa điểm).
- Không ảnh nào đạt → `"candidates": []` và ghi lý do vào `none`. Đó là kết quả hợp lệ: chỗ đó sẽ dùng
  animation.
- Ghi vài ảnh bị loại đáng chú ý vào `rejected` (ảnh mà người dựng có thể thắc mắc vì sao không có).

## suggest.json

```json
{ "version": 1,
  "slots": [
    { "slot": "s3",
      "candidates": [
        { "id": "commons:File:Alan Turing Aged 16.jpg", "fit": "ok",
          "why": "Chân dung đúng người nhưng lúc 16 tuổi — trẻ hơn nhiều so với năm 1950 trong câu." } ],
      "rejected": [ { "id": "openverse:d10ede1e-…", "reason": "tượng đồng ở Manchester, không phải chân dung" } ] },
    { "slot": "s9", "candidates": [], "none": "Không ảnh nào cho thấy đúng hội thảo 1956; chỉ có ảnh tấm bia kỷ niệm." } ] }
```

`id` chép nguyên từ `candidates/<slot>.json`. Xong thì trả lời mỗi chỗ một dòng: mã, số ảnh chọn, ảnh đầu.
