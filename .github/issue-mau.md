# Nội dung để đăng lên GitHub Issues

Tạo một issue mới, gắn nhãn `template`, rồi dán phần dưới đây.
Ảnh minh hoạ: kéo thả `.github/vi-du/sidebar-khong-cuon-theo.png` vào ô soạn thảo tại đúng chỗ đánh dấu.

---

## Tiêu đề

```
📌 [MẪU] Cách báo lỗi — copy issue này rồi sửa nội dung
```

---

## Nội dung issue

> 📌 Issue này là **mẫu**, không phải lỗi thật. Muốn báo lỗi, hãy bấm **⋯ → Copy issue** (hoặc chọn hết phần
"Mẫu điền" bên dưới, dán vào issue mới), rồi thay bằng thông tin của bạn.

**⭐ Ba điều quyết định lỗi được sửa nhanh hay chậm**

1. **🔁 Các bước làm lại lỗi** — người sửa phải lặp lại được trên máy họ. Đánh số từng bước, từ lúc mở ứng dụng,
   ghi rõ bấm vào đâu, nhập gì.
2. **Tách "mong đợi" và "thực tế"** — "bị lỗi" không nói lên điều gì; "đáng lẽ A, nhưng lại B" thì rõ ngay.
3. **Ảnh hoặc video** — khoanh đỏ chỗ sai. Lỗi về chuyển động (cuộn trang, animation, video render) thì quay
   màn hình vài giây tốt hơn ảnh tĩnh.

**📌 Quy ước**

- Một issue = một lỗi. Gặp ba lỗi thì mở ba issue.
- Tiêu đề nói rõ chỗ sai, không viết "lỗi UI" hay "không dùng được".
- **Không dán API key, nội dung `.env` hay thông tin cá nhân.** Dán log thì xoá key trước.
- Chưa chắc là lỗi hay do mình dùng sai? Cứ báo, ghi thêm "mình chưa chắc".
- Lỗi chặn hẳn công việc: báo issue rồi nhắn trực tiếp, đừng chỉ chờ.

**🏷️ Gắn nhãn khi gửi**

Chọn 1 nhãn loại (`bug` / `đề xuất` / `tài liệu` / `câu hỏi`), 1 nhãn khu vực (`studio`,
`pipeline`, `design-system`, `tts`, `render`) và 1 nhãn mức độ. Không chắc thì để trống,
người phát triển sẽ gắn khi phân loại.

---

### 📝 Mẫu điền (copy từ đây)

**🐛 Lỗi là gì?**
<!-- Một câu, nói rõ chỗ nào sai -->

**📍 Xảy ra ở đâu?**
<!-- Studio (giao diện web) · Studio (một bước trong luồng) · Công cụ dòng lệnh · Design system · Video đã render · Tài liệu -->

**🏷️ Loại lỗi**
<!-- Giao diện/UX · Chạy sai kết quả · Crash/treo · Dữ liệu sai hoặc mất · Chậm · Chữ nghĩa hiển thị sai -->

**🌡️ Mức độ**
<!-- Chặn (không làm tiếp được) · Nặng (phải lách) · Vừa (khó chịu, vẫn làm được) · Nhẹ (hiển thị) -->

**🔁 Các bước làm lại lỗi**
1.
2.
3.

**✅ Kết quả mong đợi**

**❌ Kết quả thực tế**

**📸 Ảnh / video**
<!-- Kéo thả file vào đây -->

**🎬 Mã video đang làm (nếu có)**

**🖥️ Môi trường**
- Hệ điều hành:
- Trình duyệt (nếu lỗi giao diện):
- Nhánh / commit:
- Node:

**📋 Log hoặc thông báo lỗi**
```
(dán vào đây, nhớ xoá API key)
```

**🔍 Trước khi gửi, tự kiểm**
- [ ] Đã thử lại, lỗi vẫn xảy ra
- [ ] Đã tìm issue cũ, chưa ai báo
- [ ] Không có API key hay thông tin nhạy cảm trong issue

---

### 💡 Ví dụ một issue điền đầy đủ

> Tiêu đề: `🐛 [BUG] Sidebar trái không cuộn theo khi cuộn trang chi tiết video`

**🐛 Lỗi là gì?**
Ở trang chi tiết video của Video Studio, khi cuộn xuống thì sidebar trái trôi lên theo cả trang, bị cắt ngang
và để lộ một mảng trắng, thay vì đứng yên tại chỗ.

**📍 Xảy ra ở đâu?** Studio — giao diện web (`npm run studio`)

**🏷️ Loại lỗi** Giao diện / trải nghiệm (UI/UX)

**🌡️ Mức độ** Vừa — khó chịu, vẫn làm việc bình thường

**🔁 Các bước làm lại lỗi**
1. Chạy `npm run studio`, mở `http://127.0.0.1:3100`.
2. Vào **Các video**, bấm vào một video bất kỳ (mình mở `d03-v1-duong`).
3. Thu nhỏ cửa sổ trình duyệt cho nội dung dài hơn màn hình, hoặc mở video có nhiều bước.
4. Cuộn chuột xuống cuối trang.

**✅ Kết quả mong đợi**
Sidebar trái (Video mới · Các video · Thư viện) đứng yên, cao hết màn hình; chỉ phần nội dung bên phải cuộn.

**❌ Kết quả thực tế**
Sidebar cuộn theo cả trang. Xuống tới giữa trang thì phần dưới sidebar bị cắt ngang, lộ nền trắng, và các mục
điều hướng trôi khỏi màn hình nên phải cuộn ngược lên mới bấm được.

**📸 Ảnh / video**
<!-- kéo thả .github/vi-du/sidebar-khong-cuon-theo.png vào đây -->

**🎬 Mã video đang làm** `d03-v1-duong`

**🖥️ Môi trường**
- Hệ điều hành: Ubuntu 24.04
- Trình duyệt: Chrome, cửa sổ 1920×1080
- Nhánh / commit: `lab` @ `611f066`
- Node: v22.22.1

**📋 Log hoặc thông báo lỗi**
Không có lỗi trong console.

**🔍 Trước khi gửi, tự kiểm**
- [x] Đã thử lại, lỗi vẫn xảy ra
- [x] Đã tìm issue cũ, chưa ai báo
- [x] Không có API key hay thông tin nhạy cảm trong issue
