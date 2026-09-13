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
order: 10
---
```

| Trường | Bắt buộc | Ý nghĩa |
|---|---|---|
| `name` | có | tên card, cũng là tên ghi vào `REQUEST.md` |
| `summary` | có | một câu mô tả trên card |
| `icon` | không | `dialogue` · `quiz` có glyph riêng; giá trị khác dùng glyph chung |
| `preview` | không | key video xem thử trên kho media (`media/manifest.json`); thiếu thì card không có nút xem thử |
| `order` | không | số nhỏ đứng trước; mặc định 100 |

Tên file (bỏ `.md`) là **id** của module, ghi vào `REQUEST.md` và `state.json`. Chỉ dùng chữ thường, số và
gạch nối. **Đừng đổi tên file** của một module đã có video dùng — video cũ sẽ mất module đó.

## Khi nào vẫn cần dev

File module đủ cho mọi năng lực **chỉ đổi cách viết kịch bản**. Năng lực cần **cấu hình riêng trên form**
(như chọn bản nhạc cho quiz) hoặc **dữ liệu chèn vào `REQUEST.md`** (như danh sách nhân vật cho hội thoại)
thì vẫn phải thêm code trong `studio/` — file module lo phần hướng dẫn, code lo phần cấu hình.
