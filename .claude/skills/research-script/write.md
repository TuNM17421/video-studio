# Chặng 4 · Viết kịch bản

Không tìm web. Đọc trong `research/<rid>/`: `outline.json`, `claims.json`, `checks/evidence.json` (claim
nào `ok: true` mới được dùng) và `claims/<cid>/finding.json` của các claim đó. Đọc mẫu
`templates/kich-ban-co-ban.md` — và `templates/modules/<id>.md` nếu prompt bật năng lực nào. Ghi
`research/<rid>/output/kich-ban.md`.

## Nội dung

- **Slide là phạm vi.** Đi theo mạch của slide, giảng lại ý của giảng viên — không đổi chủ đề, không thêm
  phần slide không có. Slide `skip` không cần câu.
- **Dữ kiện chỉ lấy từ slide và finding.** Không con số, tên riêng, kết quả nào ngoài hai nơi đó.
  - `ok` → dùng như slide nói. `fix`, `wrong` → dùng đúng câu `corrected`, **không** lặp lại điều sai của slide.
  - `insufficient` → không khẳng định; bỏ ý đó, hoặc nói rõ là chưa có số liệu chắc chắn.
- **Mở đầu** bằng một điều gây tò mò về chủ đề (không chào hỏi dài). **Cuối mỗi phần** có một câu chốt.
- Giải thích trước, gọi tên sau: thuật ngữ tiếng Anh đi kèm nghĩa tiếng Việt đặt **trước** ở lần đầu.

## Hình thức — theo đúng mẫu, Studio soát bằng code

- Đầu file: `# <tên>`, dòng **Mục tiêu:**, dòng **Thời lượng dự kiến:** (viết bằng chữ).
- Phần `## <số> · <tên theo ý>`, câu `### Câu N` đánh số liên tục từ 1.
- Mỗi câu: **Kiểu:** (kể · giảng · thân mật · hỏi · chốt — xen kẽ, không để sáu câu liền cùng kiểu),
  **Lời:** (một câu, không chữ số, không viết tắt đọc không được), **Trên màn hình:** (số liệu để ở đây),
- **Tên riêng giữ đúng cách viết chuẩn** trong Lời — ChatGPT, GPT-4, OpenAI, UBS — vì Lời cũng là phụ đề.
  **Không phiên âm** ("Chát Gi Pi Ti", "U Bi Ét"): cách đọc khai ở `pronounce.json` khi làm video. Chỉ viết
  thành lời những viết tắt thông thường (CTA, JSON, v.v.) và con số.
  và **Nguồn:** — câu dựa vào đâu, ví dụ `slide:4, c3`. Mọi câu đều có dòng Nguồn; câu dùng dữ kiện của
  claim phải ghi mã claim đó.
- Độ dài: khoảng số câu prompt đưa (ước 2,9 tiếng/giây).

## Khi sửa (prompt kèm danh sách lỗi hoặc góp ý)

Chỉ sửa các câu được nêu, giữ nguyên phần còn lại và số thứ tự câu (thêm/bớt câu thì đánh số lại từ đó).
Góp ý của người dùng được ưu tiên hơn gợi ý biên tập.
