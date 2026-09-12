# Mẫu kịch bản có hội thoại

Video hội thoại là video có **nhiều hơn một người nói**: một người dẫn, một nhân vật kể chuyện, một
người hỏi… Nó không phải một style mới — vẫn là Lesson Style hay Lesson Lab Style — chỉ là mỗi câu
có thêm **ai nói** và **đọc kiểu gì**.

Viết kịch bản theo đúng mẫu dưới đây thì pipeline nhận được ngay. Viết sai thì `--dry-run` báo lỗi
trước khi tốn một ký tự credit nào.

---

## Luật cứng: chỉ dùng giọng đã có trong hệ thống

Nhân vật **phải** là một giọng đang có trong `voices.json`. Đặt một cái tên chưa ai thu — `Lucas`,
`Mai Anh`, `Minh` — thì cả video dừng lại với thông báo chỉ rõ câu nào sai.

Xem danh sách giọng hiện có bất cứ lúc nào:

```
npm run voices
```

Cần một nhân vật mới? **Báo dev.** Thêm một giọng nghĩa là clone giọng trên ElevenLabs, lấy mẫu
10 giây, đẩy mẫu lên kho media và khai vào `voices.json` — không phải việc sửa được trong kịch bản.

---

## Mẫu kịch bản

Mỗi mục là **một câu được đọc = một cảnh**. Viết đúng bốn dòng này cho mỗi câu:

```markdown
### Câu 1
- **Ai:** Nhật Phong
- **Kiểu:** kể
- **Lời:** Gần như mọi dự án trí tuệ nhân tạo ở các công ty đều bắt đầu bằng một câu như vậy.
- **Trên màn hình:** Câu trích lớn, dưới có giải nghĩa chatbot

### Câu 2
- **Ai:** Viên
- **Kiểu:** hỏi
- **Lời:** Nhưng em làm nhân sự, bài này có phải cho em không ạ?
- **Trên màn hình:** Thẻ hội thoại bên phải
```

**Ai** — đúng tên trong `voices.json`, không phải tên nhân vật tự nghĩ ra.
**Kiểu** — một trong năm kiểu ở bảng dưới; bỏ trống thì hiểu là *giảng*.
**Lời** — lời đọc nguyên văn. Đây là phần sẽ bị khoá: `cues.js` chép đúng từng chữ, máy đọc đúng
từng chữ, và thẻ hội thoại trên màn hình cũng lấy đúng câu này rồi rải chữ theo mốc tiếng nói thật.
Viết sao thì nghe vậy — đừng viết tắt, đừng để số hay ký hiệu mà người đọc không phát âm được.
**Trên màn hình** — mô tả ý đồ hình, không phải lời đọc.

---

## Năm kiểu đọc

Kiểu đổi **tốc độ đọc** — đây mới là thứ tạo nhịp lên xuống, chứ không phải "mức cảm xúc".

| Kiểu | Viết là | Tốc độ | Dùng cho |
|---|---|---|---|
| kể | `ke` | ×1,06 | kể chuyện, ví dụ — nhanh hơn, tươi hơn |
| giảng | `giang` | ×1,00 | giải thích khái niệm |
| thân mật | `nhe` | ×0,95 | nói riêng với một người |
| hỏi | `hoi` | ×0,90 | câu hỏi |
| chốt | `nhan` | ×0,86 | câu chốt — chậm lại, nặng tay |

Đừng để hai câu liền nhau ở chỗ chuyển ý cùng một kiểu, giọng sẽ đều đều.
Bảng này nằm ở `voices.json` → `deliveries`, sửa được mà không đụng code.

---

## Hai điều khác với video một giọng

**Ngữ điệu không chảy qua ranh giới nhân vật.** Với một người dẫn, mỗi câu được đọc kèm câu trước và
câu sau để nhịp liền mạch. Trong hội thoại, việc đó chỉ áp dụng trong một chuỗi câu cùng người nói —
nếu không, người này sẽ lấy nhịp theo câu người kia sắp nói. Nghĩa là: **gom các câu liền nhau của
cùng một người lại với nhau**, đừng xen kẽ vụn vặt, giọng sẽ tự nhiên hơn.

**Thuật ngữ tiếng Anh luôn đi kèm nghĩa tiếng Việt**, đặt nghĩa **trước** thuật ngữ. Vừa để học viên
không rớt lại, vừa là cách duy nhất bắt máy đọc đúng:

> "Problem Statement, bản phát biểu bài toán" · "AI, tức trí tuệ nhân tạo"

---

## Mốc giờ thì đừng viết

Nếu bạn mang kịch bản từ hệ thống khác sang và nó có sẵn cột mốc giờ, **bỏ cột đó đi**. Repo này làm
giọng trước: máy đọc xong, đo thời lượng thật của từng câu, rồi cảnh mới được dựng theo đúng thời
lượng đó. Đổi giọng hay đổi kiểu đọc là toàn bộ mốc giờ đổi theo. Mốc giờ viết tay chỉ gây hiểu nhầm.

---

## Kiểm tra trước khi tốn tiền

Sau khi `cues.js` được dựng từ kịch bản:

```
node tts-elevenlabs/tts.mjs generate --cues <video>/cues.js --dry-run
```

Nó in ra dàn vai, từng câu ai đọc, kiểu gì, tốc độ bao nhiêu, và tổng số ký tự sẽ bị tính phí —
chưa gửi gì lên ElevenLabs. Nhân vật sai hay kiểu đọc sai thì dừng ngay tại đây.
