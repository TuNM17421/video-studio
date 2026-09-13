# Mẫu kịch bản có hội thoại

Video hội thoại là video có **nhiều hơn một người nói**: một người dẫn, một nhân vật kể chuyện, một
người hỏi… Nó không phải một style mới — vẫn là Lesson Style hay Lesson Lab Style — chỉ là mỗi câu
có thêm **ai nói** và **đọc kiểu gì**.

Viết kịch bản theo đúng mẫu dưới đây thì pipeline nhận được ngay. Viết sai thì `--dry-run` báo lỗi
trước khi tốn một ký tự credit nào.

---

## Luật cứng: chỉ dùng nhân vật đã có trong hệ thống

Nhân vật **phải** là một cái tên đang có trong `voices.json` — một nhân vật (có mặt, có phía, có màu,
mượn sẵn một giọng) hoặc một giọng trần cho video chỉ có người dẫn. Đặt một cái tên chưa khai — `Minh`,
`Hương` — thì cả video dừng lại với thông báo chỉ rõ câu nào sai.

Xem danh sách nhân vật và giọng hiện có bất cứ lúc nào:

```
npm run voices
```

Viết `speaker` bằng **tên** (`Tới`) hay **id** (`toi`) đều được, không phân biệt hoa thường.

Một nhân vật có thể mang **biệt danh** riêng cho một bộ video: khai trong `voices.json` →
`characters[].aliases`, rồi kịch bản gọi thẳng biệt danh. Nó mượn mặt, giọng và phía đứng của nhân vật
gốc, còn tên hiện trên thẻ thoại là biệt danh. Day 04 gọi Tới là **Lucas** theo cách đó.

Nhân vật **chưa có ảnh chân dung** vẫn dùng được: để `avatar` rỗng, thẻ thoại tự vẽ một biểu tượng người
theo màu của nhân vật. Không có ảnh thì đừng mượn tạm ảnh người khác.

Cần một vai chưa có? **Báo dev.** Hai việc khác hẳn nhau, nói rõ bạn cần cái nào:

- **Nhân vật mới dùng giọng đã có** — chỉ cần một cái tên, một ảnh chân dung, chọn một trong các giọng
  sẵn có, rồi khai vào `voices.json`. Nhanh và không tốn credit.
- **Giọng mới** — phải clone giọng trên ElevenLabs, đọc mẫu 10 giây, đẩy mẫu lên kho media rồi mới khai
  được. Tốn credit và lâu hơn.

Hai nhân vật không được dùng chung một giọng — người xem sẽ nghe hai người nói y hệt nhau.

---

## Mẫu kịch bản

Mỗi mục là **một câu được đọc = một cảnh**. Viết đúng bốn dòng này cho mỗi câu:

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

**Ai** — đúng tên nhân vật trong `voices.json`, không phải tên tự nghĩ ra. Nhân vật tự mang sẵn khuôn mặt,
phía đứng và màu của mình, nên kịch bản không cần khai mấy thứ đó.
**Kiểu** — một trong năm kiểu ở bảng dưới; bỏ trống thì hiểu là *giảng*.
**Lời** — lời đọc nguyên văn. Đây là phần sẽ bị khoá: `cues.js` chép đúng từng chữ, máy đọc đúng
từng chữ, và thẻ hội thoại trên màn hình cũng lấy đúng câu này rồi rải chữ theo mốc tiếng nói thật.
Viết sao thì nghe vậy — đừng viết tắt, đừng để số hay ký hiệu mà người đọc không phát âm được.
**Trên màn hình** — mô tả ý đồ hình, không phải lời đọc. **Đừng viết thẻ hội thoại, phía đứng hay khuôn
mặt vào đây** — nhân vật đã mang sẵn cả ba, hệ thống tự dựng. Cột này chỉ dành cho thứ *thêm* bên cạnh
thẻ thoại: một câu trích lớn, một bảng, một danh sách. Nhiều câu thoại không cần gì thêm, để trống là đúng.

---

## Khoảng lặng: viết **Dừng** thay cho **Lời**

Có những chỗ không ai nói gì mà vẫn chiếm thời lượng: khoảng chờ người xem chọn đáp án, một nhịp lặng
trước câu chốt. Viết như một câu bình thường, chỉ thay dòng **Lời** bằng dòng **Dừng**:

```markdown
### Dừng 1
- **Dừng:** 8 giây
- **Trên màn hình:** Hai đáp án đứng yên, vòng đếm giờ chạy hết tám giây
```

Nói rõ **mấy giây**. Con số đó thành một cue `silent` dài đúng bấy nhiêu, và đó là toàn bộ cách thời
lượng khoảng lặng được quyết định — không có chỗ nào khác khai nó. Khoảng lặng không cần **Ai** và
không tốn credit đọc.

---

## Quiz: nhạc chỉ chạy trong lúc chờ

Nếu video có nhạc quiz, mỗi phần hỏi phải tách bạch **ba** mẩu, viết liền nhau theo thứ tự:

1. Câu hỏi — một câu thoại bình thường, có **Ai** và **Lời**.
2. Khoảng chờ — một mục **Dừng** như trên.
3. Phần chữa bài — câu thoại bình thường.

Ranh giới 2 và 3 là chỗ quan trọng nhất: nhạc quiz chỉ phủ mẩu số 2. Lúc người hỏi đang đọc câu hỏi
thì vẫn là nhạc nền, và nhạc quiz phải tắt trước khi bắt đầu giải thích. Kịch bản viết gộp "hỏi rồi
giải thích" mà không tách khoảng chờ thì không dựng được đoạn nhạc quiz nào.

---

## Đừng để quá hai người cùng lúc

Trên màn hình chỉ nên có tối đa hai thẻ hội thoại một lúc. Đây là bài giảng, không phải bản ghi hội thoại:
ba thẻ trở lên thì mắt không biết đọc đâu trước, và chữ phải thu nhỏ tới mức khó đọc. Nếu một đoạn có ba
người cùng nói, cho thẻ cũ biến đi trước khi người thứ ba lên tiếng.

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
