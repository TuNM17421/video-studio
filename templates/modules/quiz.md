---
name: Video có quiz
summary: Đặt câu hỏi, dành thời gian suy nghĩ và tách rõ phần hỏi khỏi phần chữa bài.
icon: quiz
preview: modules/quiz-mau.mp4
order: 20
---

# Module · Video có quiz

Viết kịch bản theo `templates/kich-ban-co-ban.md`, rồi thêm những điều dưới đây. File này chỉ ghi phần
**thêm** — mọi luật của mẫu cơ bản vẫn giữ nguyên. Quiz dùng được cho cả video một người dẫn lẫn video
hội thoại (bật thêm `templates/modules/dialogue.md`).

---

## Một chỗ dừng gồm ba mẩu, viết liền nhau

1. **Câu hỏi** — một hoặc vài câu bình thường, có **Lời**.
2. **Khoảng chờ** — một mục **Dừng**, không có lời đọc.
3. **Chữa bài** — câu bình thường.

```markdown
### Câu 27
- **Kiểu:** hỏi
- **Lời:** Với bối cảnh vừa rồi, theo bạn phải viết câu lệnh cho trí tuệ nhân tạo thế nào?
- **Trên màn hình:** Bối cảnh cửa hàng · câu lệnh gốc in to · câu hỏi · việc phải làm

### Dừng 1
- **Dừng:** 30 giây
- **Trên màn hình:** Giữ nguyên bối cảnh và câu hỏi, vòng đếm ngược chạy hết ba mươi giây

### Câu 28
- **Kiểu:** giảng
- **Lời:** Câu này thiếu người đọc và mục đích, nên máy chỉ viết được một bài chung chung.
- **Trên màn hình:** Hai ô còn thiếu sáng lên
```

**Dừng** thay cho dòng **Lời**, và **phải nói rõ mấy giây**. Con số đó thành một cue `silent` dài đúng bấy
nhiêu — không có chỗ nào khác khai thời lượng khoảng chờ. Khoảng chờ không cần **Ai**, không cần **Kiểu**,
không tốn credit đọc.

Ranh giới mẩu 2 và 3 là chỗ quan trọng nhất. Kịch bản viết gộp "hỏi rồi giải thích" mà không tách khoảng
chờ thì không dựng được chỗ dừng nào.

---

## Nhạc quiz chỉ chạy trong lúc chờ

Nếu video dùng nhạc quiz, nó **chỉ** phủ mẩu số 2. Lúc người hỏi đang đọc câu hỏi thì vẫn là nhạc nền;
nhạc quiz vào khi câu hỏi đã dứt và đồng hồ bắt đầu chạy, rồi tắt trước khi bắt đầu chữa bài. Người viết
kịch bản không phải làm gì thêm ngoài việc tách đúng ba mẩu — pipeline tự đánh dấu cue `silent`.

Trên màn hình khoảng chờ luôn có **vòng đếm ngược** (component `Countdown`), chạy đúng số giây của mục Dừng.

---

## Ba luật cho một câu hỏi tốt

**Một · Chất liệu phải nằm sẵn trên màn hình.** Câu hỏi không được bắt người xem tự lôi ví dụ ra từ trí
nhớ. Ba mươi giây mà họ còn đang cố nhớ thì chưa kịp nghĩ, và khoảng chờ thành ra chết.

**Hai · Bối cảnh phải đủ để làm được việc.** Đừng viết "một bạn marketing, sản phẩm mới" rồi bắt viết câu
lệnh — người xem không biết bán gì, sản phẩm nào, viết cho ai đọc. Bối cảnh phải trả lời xong **bán gì ·
sản phẩm nào · ai đọc · để làm gì** trước khi đặt câu hỏi.

**Ba · Một thứ trên màn hình, một việc phải làm.** Hỏi bằng lời người ta nói, bắt đầu từ thứ vừa dựng:
"Với câu lệnh này, theo bạn…", không bắt đầu bằng một mệnh lệnh trống. Việc phải làm nói gọn: viết một dòng
· chọn một con số · viết hai ba điều.

Tránh kiểu *"Trong bốn phần, bạn đang thiếu phần nào?"* — nghe như đề thi, và người xem không biết bắt đầu
từ đâu.

---

## Câu có đáp án thì câu mẫu phải in sẵn

Câu hỏi có một đáp án đúng (chọn một con số, giơ tay) phải hỏi về **một câu mẫu in trên màn hình**, không
hỏi về thứ người xem tự viết — mỗi người viết một kiểu thì không có đáp án chung. Ghi rõ trong kịch bản
rằng câu mẫu **không được sửa**, vì sửa là lệch đáp án.

Câu hỏi mở (viết ra, không đúng sai) thì không cần câu mẫu.

---

## Nhân vật học viên trả lời hụt, không trả lời sai

Nếu video có hội thoại và một nhân vật học viên trả lời câu hỏi: cho họ nói **một ý đúng nhưng thiếu**, để
người dẫn bổ sung nốt. Đừng dựng học viên lên để làm sai rồi bị sửa.

---

## Cách viết đầu kịch bản

Thêm một dòng ở đầu kịch bản cho người dựng biết có bao nhiêu chỗ dừng và mỗi chỗ dài bao lâu:

```markdown
- **Chỗ dừng:** ba chỗ, mỗi chỗ ba mươi giây.
```

---

## Tiêu chí QA

Lượt QA ảnh chỉ đọc mục này khi video bật quiz (mã lỗi `module`).

- Ảnh của khoảng chờ có vòng đếm ngược (`Countdown`) và vẫn giữ bối cảnh cùng câu hỏi trên màn hình.
- Câu hỏi có đáp án thì câu mẫu được hỏi tới phải in sẵn trên màn hình, đọc được.
