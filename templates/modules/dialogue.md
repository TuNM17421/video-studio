---
name: Video có hội thoại
short: Hội thoại
summary: Nhiều nhân vật cùng nói, mỗi người một giọng. Kịch bản phải khai ai nói câu nào.
icon: dialogue
preview: modules/hoi-thoai-mau-v2.mp4
order: 10
---

# Module · Video có hội thoại

Viết kịch bản theo `templates/kich-ban-co-ban.md`, rồi thêm những điều dưới đây. File này chỉ ghi phần
**thêm** — mọi luật của mẫu cơ bản vẫn giữ nguyên.

Video hội thoại là video có **nhiều hơn một người nói**: một người dẫn, một nhân vật kể chuyện, một người
hỏi. Nó không phải một style mới — vẫn là Lesson hay Lesson Lab.

---

## Thêm dòng **Ai** cho mỗi câu

```markdown
### Câu 1
- **Ai:** Tới
- **Kiểu:** kể
- **Lời:** Gần như mọi dự án trí tuệ nhân tạo ở các công ty đều bắt đầu bằng một câu như vậy.
- **Trên màn hình:** Câu trích lớn, dưới có giải nghĩa chatbot

### Câu 2
- **Ai:** Tú
- **Kiểu:** hỏi
- **Lời:** Nhưng em làm nhân sự, bài này có phải cho em không ạ?
- **Trên màn hình:** Không có gì thêm, để thẻ hội thoại đứng một mình
```

**Ai** — đúng tên nhân vật trong `voices.json`. Nhân vật tự mang sẵn khuôn mặt, phía đứng và màu, nên
dòng **Trên màn hình** **không** mô tả thẻ hội thoại, phía đứng hay khuôn mặt — hệ thống tự dựng. Cột đó
chỉ dành cho thứ *thêm* bên cạnh thẻ thoại. Nhiều câu thoại không cần gì thêm, để trống là đúng.

---

## Luật cứng: chỉ dùng nhân vật đã có

Nhân vật **phải** là một cái tên đang có trong `voices.json` — một nhân vật, hoặc một giọng trần. Tên chưa
khai (`Minh`, `Hương`) làm cả video dừng lại với thông báo chỉ rõ câu nào sai. Xem danh sách:

```
npm run voices
```

Viết bằng **tên** (`Tới`) hay **id** (`toi`) đều được, không phân biệt hoa thường.

**Biệt danh.** Một nhân vật có thể mang tên khác cho một bộ video: khai ở `characters[].aliases`, kịch bản
gọi thẳng biệt danh. Nó mượn mặt, giọng và phía đứng của nhân vật gốc, còn tên hiện trên thẻ thoại là
biệt danh. Day 04 gọi Tới là **Lucas** theo cách đó.

**Chưa có ảnh chân dung** vẫn dùng được: để `avatar` rỗng, thẻ thoại tự vẽ biểu tượng người theo màu của
nhân vật. Không có ảnh thì đừng mượn tạm ảnh người khác.

Cần một vai chưa có? **Báo dev**, và nói rõ cần cái nào:

- **Nhân vật mới dùng giọng đã có** — một cái tên, một ảnh, chọn một giọng sẵn có. Nhanh, không tốn credit.
- **Giọng mới** — clone trên ElevenLabs, mẫu 10 giây, đẩy lên kho media. Tốn credit và lâu hơn.

Cả ba nguồn giọng đều đọc được hội thoại. Model local nhân bản mỗi nhân vật từ mẫu giọng của người đó, và
nhận thêm một file mẫu nằm trên máy cho giọng chưa có trong danh mục — nhưng nhân vật thì vẫn phải có
trong `voices.json` trước đã.

Hai nhân vật không được dùng chung một giọng — người xem sẽ nghe hai người nói y hệt nhau.

---

## Đừng để quá hai người cùng lúc

Trên màn hình tối đa hai thẻ hội thoại một lúc. Ba thẻ trở lên thì mắt không biết đọc đâu trước, và chữ
phải thu nhỏ tới mức khó đọc. Nếu một đoạn có ba người nói, cho thẻ cũ biến đi trước khi người thứ ba lên
tiếng.

---

## Ngữ điệu không chảy qua ranh giới nhân vật

Với một người dẫn, mỗi câu được đọc kèm câu trước và câu sau để nhịp liền mạch. Trong hội thoại, việc đó
chỉ áp dụng trong một chuỗi câu **cùng người nói**. Nghĩa là: **gom các câu liền nhau của cùng một người**,
đừng xen kẽ vụn vặt, giọng sẽ tự nhiên hơn.

---

## Kiểm tra trước khi tốn tiền

`--dry-run` của mẫu cơ bản với video hội thoại còn in thêm **dàn vai**: từng câu ai đọc, giọng nào. Nhân
vật sai thì dừng ngay tại đây.

---

## Tiêu chí QA

Lượt QA ảnh chỉ đọc mục này khi video bật hội thoại (mã lỗi `module`).

- Tối đa hai thẻ hội thoại trên màn hình cùng lúc.
- Mỗi nhân vật giữ một màu và một phía suốt video; thẻ có avatar thì mặt nằm dưới đuôi thẻ, đúng phía người nói.
- Thẻ và mặt nằm trong vùng nội dung y 250–960 — tính cả phần mặt thò xuống dưới thẻ.
