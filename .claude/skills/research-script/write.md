# Chặng 4 · Viết kịch bản

Không tìm web. Prompt Studio gửi đã có sẵn dàn ý slide, kết luận research từng claim, những ý người duyệt đã bỏ
và mức độ dài — đừng Read lại các file đó; chỉ Read `claims/<cid>/finding.json` khi cần xem trích đoạn gốc. Chạy
tay không qua Studio thì đọc trong `research/<rid>/`: `outline.json`, `claims.json`, `checks/evidence.json` (claim
nào `ok: true` mới được dùng) và `claims/<cid>/finding.json` của các claim đó. Đọc mẫu
`templates/kich-ban-co-ban.md` — và `templates/modules/<id>.md` nếu prompt bật năng lực nào. Ghi
`research/<rid>/output/kich-ban.md`.

## Nội dung

- **Slide là phạm vi.** Đi theo mạch của slide, giảng lại ý của giảng viên — không đổi chủ đề, không thêm
  phần slide không có. Slide `skip` không cần câu.
- **Độ dài đúng mức prompt đưa** (số câu, số từ mỗi câu). Slide nhiều hơn số câu thì **gộp**: một câu dựa được
  vào vài slide; giữ ý chính và các chỗ research đã sửa, bỏ ví dụ phụ. Đừng nhồi mỗi slide một câu, cũng đừng
  viết câu dài để nhét thêm ý — Studio soát độ dài và bắt rút gọn khi vượt.
- **Dữ kiện chỉ lấy từ slide và finding.** Không con số, tên riêng, kết quả nào ngoài hai nơi đó.
  - `ok` → dùng như slide nói. `fix`, `wrong` → dùng đúng câu `corrected`, **không** lặp lại điều sai của slide.
  - `insufficient` → không khẳng định; bỏ ý đó, hoặc nói rõ là chưa có số liệu chắc chắn.
  - Claim ghi **hay đổi** (giá, phiên bản mới nhất, bảng xếp hạng): nói kèm mốc thời gian prompt đưa ("tính đến
    tháng 3/2025"). **Không** nói "hiện nay", "mới nhất", "hiện tại" — video còn được xem nhiều tháng sau.
- **Bảng số** (bảng giá, bảng thông số): cả bảng để ở **Trên màn hình**; Lời chỉ nói ý chính — cái nào rẻ nhất,
  chênh nhau bao nhiêu lần — tối đa hai, ba con số một câu. Đọc cả bảng thành lời thì người nghe không nhớ nổi
  con số nào.
- **Mở đầu** bằng một điều gây tò mò về chủ đề (không chào hỏi dài). **Cuối mỗi phần** có một câu chốt.
- Giải thích trước, gọi tên sau: thuật ngữ tiếng Anh đi kèm nghĩa tiếng Việt đặt **trước** ở lần đầu.

## Hình thức — theo đúng mẫu, Studio soát bằng code

- Đầu file: `# <tên>`, dòng **Mục tiêu:**, dòng **Thời lượng dự kiến:** (viết bằng chữ; Studio ghi lại dòng này
  theo độ dài lời đọc thật mỗi lần soát).
- Phần `## <số> · <tên theo ý>`, câu `### Câu N` đánh số liên tục từ 1.
- Mỗi câu có bốn dòng:
  - **Kiểu:** kể · giảng · thân mật · hỏi · chốt — xen kẽ, không để sáu câu liền cùng kiểu.
  - **Lời:** một câu, không chữ số (số đọc thành chữ, số lẻ đọc "hai phẩy năm"), không viết tắt đọc không được.
  - **Trên màn hình:** số liệu, bảng, tên — thứ người xem cần *thấy*.
  - **Nguồn:** câu dựa vào đâu, ví dụ `slide:4, c3`. Mọi câu đều có; câu dùng dữ kiện của claim phải ghi mã
    claim đó, và một câu dẫn được nhiều claim (`slide:12, c4, c5`).
- **Tên riêng và thuật ngữ giữ đúng cách viết chuẩn** trong Lời — ChatGPT, GPT-4, OpenAI, và viết tắt có trên
  slide như LLM, API — vì Lời cũng là phụ đề. **Không phiên âm** ("Chát Gi Pi Ti", "U Bi Ét"): cách đọc khai ở
  `pronounce.json` khi làm video. Chỉ viết thành lời những viết tắt thông thường không có trên slide (CTA, v.v.)
  và con số.

## Khi sửa (prompt kèm danh sách lỗi hoặc góp ý)

Chỉ sửa các câu được nêu, giữ nguyên phần còn lại và số thứ tự câu (thêm/bớt câu thì đánh số lại từ đó).
Góp ý của người dùng được ưu tiên hơn gợi ý biên tập. Đừng xoá thuật ngữ, tên riêng hay con số chỉ để hết cảnh
báo; câu dài thì cắt ý phụ, đừng tách thành nhiều câu.
