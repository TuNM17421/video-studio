# Chặng 2 · Research — kiểm từng claim trên web

Chỉ làm các claim được giao. Prompt đã ghi sẵn nội dung và câu hỏi của từng claim — **không cần đọc
`claims.json` hay liệt kê thư mục**; Write tự tạo thư mục `claims/<cid>/`. Claim trượt soát lần trước thì prompt
ghi sẵn lỗi, bảng nguồn và các trang lượt này đã tải — sửa **đúng các lỗi đó**, đừng research lại từ đầu.

Hai lệnh shell được phép, chạy từ gốc repo và bắt đầu đúng bằng `node tools/…` — thêm `cd … &&`, `mkdir`,
`cat`, `ls` là bị chặn và mất một lượt (đọc file bằng Read):
- `node tools/page.mjs …` — đọc trang (bên dưới). Trong `--find` đừng dùng ký tự `$` (viết `2.50`, không `$2.50`).
- `node tools/research-verify.mjs research/<rid> --stage evidence --dry --claims c1,c2` — tự soát (bước 5).

## Cách làm một claim — dừng ngay khi đủ nguồn

1. **Tìm** bằng công cụ tìm web của bạn, tối đa 3 lượt mỗi claim. Tiếng Anh khi chủ đề có tài liệu tiếng
   Anh tốt hơn. Ưu tiên: tài liệu chính thức của đơn vị làm ra sản phẩm → bài nghiên cứu → trang tham khảo
   (Wikipedia, từ điển chuyên ngành) → báo có tên tác giả và ngày đăng → blog.
2. **Đọc** bằng lệnh của repo, không đọc cả trang:
   ```
   node tools/page.mjs research/<rid> <url> --find "từ khoá|từ khoá khác"
   ```
   Lệnh in mã nguồn `[s3]`, nơi xuất bản, ngày đăng, rồi những đoạn **nguyên văn** có từ khoá. `--find`
   không phân biệt hoa thường và không cần đúng dấu câu; không thấy gì thì đổi từ khoá, bỏ `--find` để xem
   đầu trang. **PDF đọc được** — system card, báo cáo, bài nghiên cứu cứ đưa thẳng URL `.pdf`, và ưu tiên
   chúng hơn một trang tin thuật lại. Trang báo "không đọc được" (PDF quét ảnh, trang dựng bằng
   JavaScript) → chọn nguồn khác; trích đoạn từ trang đó sẽ không soát được. Chỉ dùng công cụ đọc trang
   riêng của bạn (WebFetch…) khi `page.mjs` không đọc được — nó tốn token hơn và không cho trích đoạn soát được.
3. **Đủ nguồn thì dừng:**
   - `easy`: 1 nguồn `official` / `paper` / `reference`, hoặc 2 nơi xuất bản khác nhau.
   - `normal`, `hard`: 2 nơi xuất bản khác nhau, hoặc 1 nguồn `official`. Hai trang cùng một tên miền hay
     cùng một công ty là **một** nơi.
   - `timeSensitive: true`: ít nhất một nguồn ủng hộ đăng/sửa trong 12 tháng (xem ngày lệnh in ra), **hoặc**
     trang giá/tài liệu chính thức của đúng hãng trong claim (`official`) — không ghi ngày cũng được, đó là bản
     hiện hành. Đừng thêm bài ra mắt cũ bên cạnh cho "đủ nguồn": nó chỉ kéo ngày của claim về quá khứ.
4. **Ghi** `research/<rid>/claims/<cid>/finding.json` rồi sang claim kế.
5. **Tự soát rồi mới dừng:** `node tools/research-verify.mjs research/<rid> --stage evidence --dry --claims <mã các
   claim được giao>`. Lệnh không tải web, không ghi file — nó soát trích đoạn với trang đã tải, số nguồn, độ mới,
   đúng như Studio soát sau đó. Sửa hết dòng ✗ rồi chạy lại, tối đa hai lần. Còn ✗ vì không tìm thêm được nguồn
   thì ghi `insufficient` kèm `reason` — một finding trượt soát là cả một lượt research lại.

## finding.json

```json
{ "claim": "c1",
  "verdict": "fix",
  "answer": "GPT-4 Turbo có cửa sổ 128K token; GPT-4 bản gốc là 8K và 32K.",
  "corrected": "GPT-4 Turbo, không phải GPT-4 bản gốc, có cửa sổ ngữ cảnh một trăm hai mươi tám nghìn token.",
  "reason": "Slide gộp hai model.",
  "sources": [ { "id": "s3", "kind": "official" }, { "id": "s5", "kind": "news" } ],
  "evidence": [ { "source": "s3", "quote": "GPT-4 Turbo … 128,000 token context window", "stance": "supports" } ] }
```

- `verdict`: `ok` slide đúng · `fix` slide đúng một phần / đã cũ · `wrong` slide sai · `insufficient` không
  tìm được đủ nguồn (ghi `reason`, `evidence` có thể rỗng). Không đủ nguồn thì nói thế, **đừng đoán**.
- `corrected` (bắt buộc với `fix`, `wrong`): câu đúng, viết sẵn để đặt vào kịch bản.
- `sources[].id` là mã `sN` lệnh `page.mjs` in ra; `kind`: `official` | `paper` | `reference` | `news` | `blog`.
- `evidence[].quote`: **chép nguyên văn** từ đoạn `page.mjs` in ra, ít nhất 25 ký tự, bỏ dấu `…` ở hai đầu.
  Lược giữa câu thì dùng `…`. Không dịch, không diễn đạt lại — Studio so từng chữ với trang gốc.
  `stance` so với **câu của slide** (`text`): `supports` (trang nói như slide) | `contradicts` (trang nói
  khác slide — căn cứ cho `corrected`) | `context` (liên quan nhưng không xác nhận hay bác bỏ).

Không ghi file nào khác. Xong thì trả lời mỗi claim một dòng: mã, kết luận, số nguồn.
