# Module kịch bản

Mỗi file `<id>.md` trong thư mục này là **một năng lực chọn thêm** cho video — Studio đọc thẳng thư mục này
để hiện card ở bước Kế hoạch. **Thêm một module = thêm một file**, không phải sửa code.

Mọi video viết theo `templates/kich-ban-co-ban.md`. File module chỉ ghi phần **thêm hoặc đổi** so với mẫu
đó, không nhắc lại.

## Đầu file

```markdown
---
name: Video có hội thoại
summary: Một câu cho card ở bước Kế hoạch — người chọn đọc xong phải biết bật nó thì kịch bản đổi gì.
icon: dialogue
preview: modules/hoi-thoai-mau-v2.mp4
default: true
order: 10
---
```

`default: true` chỉ là **điểm xuất phát của form**, không phải luật: video mới mở ra đã tick sẵn, người
dùng bỏ tick lúc nào cũng được, và video đã tạo không bao giờ bị bật thêm năng lực. Hiện `images` và
`sfx` khai cờ này — hai năng lực chỉ **đề xuất** rồi chờ người dựng duyệt, nên bật sẵn không làm hỏng gì.

| Trường | Bắt buộc | Ý nghĩa |
|---|---|---|
| `name` | có | tên card, cũng là tên ghi vào `REQUEST.md` |
| `short` | không | tên ngắn trên hàng bật tắt ở bước Kế hoạch (đứng dưới nhãn "Video có thêm", nên bỏ "Video có"); thiếu thì dùng `name` |
| `summary` | có | một câu mô tả trên card |
| `icon` | không | `dialogue` · `quiz` · `mascot` · `image` · `audio` có glyph riêng; giá trị khác dùng glyph chung |
| `preview` | không | key video xem thử trên kho media (`media/manifest.json`); thiếu thì card không có nút xem thử |
| `default` | không | `true` = video mới **tick sẵn** năng lực này (bỏ tick vẫn bỏ được) |
| `order` | không | số nhỏ đứng trước; mặc định 100 |

Tên file (bỏ `.md`) là **id** của module, ghi vào `REQUEST.md` và `state.json`. Chỉ dùng chữ thường, số và
gạch nối. **Đừng đổi tên file** của một module đã có video dùng — video cũ sẽ mất module đó.

## Tiêu chí QA

Mục `## Tiêu chí QA` (không bắt buộc) là những gì lượt QA ảnh phải soi **thêm** khi module này bật. Studio
ghép tiêu chí chung (chữ đọc được, không tràn, không chồng, bố cục không trống, nhịp không lặp) với mục này
của đúng những module đang bật — video không bật module thì QA không bao giờ thấy tiêu chí của nó. Viết
mỗi tiêu chí là một điều nhìn thấy được trên ảnh tĩnh; thêm tiêu chí không cần sửa code.

## Khi nào vẫn cần dev

File module đủ cho mọi năng lực **chỉ đổi cách viết kịch bản**. Năng lực cần **cấu hình riêng trên form**
(như chọn bản nhạc cho quiz) hoặc **dữ liệu chèn vào `REQUEST.md`** (như danh sách nhân vật cho hội thoại)
thì vẫn phải thêm code trong `studio/` — file module lo phần hướng dẫn, code lo phần cấu hình.
