# Mẫu kịch bản cơ bản

Đây là mẫu cho **một clip bài giảng bình thường**: một người dẫn, không hội thoại, không quiz. Mọi video đều
bắt đầu từ mẫu này.

Video cần thêm năng lực nào (nhiều người nói, câu hỏi có khoảng chờ…) thì **vẫn viết theo mẫu này**, rồi
đọc thêm file của năng lực đó trong `templates/modules/`. Mỗi file module chỉ ghi **phần thêm hoặc phần
đổi** so với mẫu cơ bản — không nhắc lại những gì đã có ở đây.

| Năng lực | File |
|---|---|
| Video có hội thoại | `templates/modules/dialogue.md` |
| Video có quiz | `templates/modules/quiz.md` |

Viết đúng mẫu thì pipeline nhận được ngay. Viết sai thì `--dry-run` báo lỗi trước khi tốn một ký tự credit.

---

## Đầu kịch bản

Vài dòng cho người dựng biết video này để làm gì. Không ai đọc phần này thành tiếng.

```markdown
# D4-00 · Tổng quan Day 04 — Nói sao cho AI hiểu đúng ý

- **Mục tiêu:** hết video người xem trả lời được hôm nay học gì, làm được gì, mang về gì.
- **Thời lượng dự kiến:** khoảng ba phút rưỡi.
- **Giọng đọc:** Nhật Phong (xem `npm run voices`).
```

---

## Mẫu kịch bản

Chia video thành các **phần**, mỗi phần là một tiêu đề `##`. Tên phần thành tên chương trong file chương
và trong player — đặt tên theo ý của phần, đừng đặt "Phần 1".

Trong mỗi phần, mỗi mục là **một câu được đọc = một cảnh**:

```markdown
## 1 · Mở đầu

### Câu 1
- **Kiểu:** kể
- **Lời:** Hai người hỏi trí tuệ nhân tạo cùng một việc, nhưng nhận về hai kết quả khác hẳn nhau.
- **Trên màn hình:** Hai khung kết quả đặt cạnh nhau, một sáng, một mờ

### Câu 2
- **Kiểu:** chốt
- **Lời:** Khác nhau nằm ở cách hỏi.
- **Trên màn hình:** Dòng chữ lớn giữa màn hình: Khác nhau nằm ở CÁCH HỎI
```

**Lời** — lời đọc **nguyên văn**. Phần này bị khoá: `cues.js` chép đúng từng chữ, máy đọc đúng từng chữ,
phụ đề hiện đúng từng chữ. Muốn đổi một chữ sau khi đã thu giọng là phải thu lại câu đó.

**Trên màn hình** — chữ phải có mặt trong cảnh và ý đồ hình. Không phải lời đọc, và **được phép khác lời
đọc**: lời đọc nói "vai trò, nhiệm vụ, bối cảnh, định dạng" thì màn hình vẫn có thể để
ROLE · TASK · CONTEXT · FORMAT. Viết thứ cần *thấy*, đừng viết thứ đã *nghe*.

**Kiểu** — cách đọc, một trong năm kiểu ở bảng dưới. Bỏ trống thì hiểu là *giảng*.

Có thể thêm dòng **Chuyển động** khi muốn gợi ý nhịp động; đó là gợi ý, người dựng không bắt buộc theo.

---

## Một câu là một câu

Mỗi mục **Lời** nên là **một câu**. Một mục chứa ba câu thì cả ba dồn vào một cảnh, và cảnh đó phải
gánh ba ý cùng lúc.

Ngược lại, đừng tách những mẩu quá ngắn thành mục riêng ("Hết.", "Một.", "Vì sao?"). Chúng thành cảnh
chưa tới nửa giây — viết liền vào câu bên cạnh.

---

## Viết sao thì nghe vậy

Máy đọc đúng từng ký tự, nên lời đọc phải là thứ **phát âm được**:

- **Không có chữ số.** Viết "một trăm hai mươi từ", "hai ngày". Trên màn hình thì cứ để số bình thường.
- **Không viết tắt** mà người đọc không đọc thành tiếng: "CTA", "JSON", "v.v." — thay bằng lời đầy đủ, hoặc
  chỉ để trên màn hình.
- **Thuật ngữ tiếng Anh đi kèm nghĩa tiếng Việt, nghĩa đặt TRƯỚC**, ở lần nhắc đầu tiên trong video:

> "câu lệnh mình viết cho mô hình, gọi là prompt" · "đơn vị chữ mà mô hình đọc và tính tiền, gọi là token"

Vừa để người xem không rớt lại, vừa để nếu máy đọc thuật ngữ sai thì nghĩa vẫn đã được nói. Thuật ngữ nào
máy hay đọc sai thì khai cách đọc trong `projects/<id>/pronounce.json`.

---

## Năm kiểu đọc

Kiểu đổi **tốc độ đọc** — đây là thứ tạo nhịp lên xuống.

| Kiểu | Viết là | Tốc độ | Dùng cho |
|---|---|---|---|
| kể | `ke` | ×1,06 | kể chuyện, ví dụ — nhanh hơn, tươi hơn |
| giảng | `giang` | ×1,00 | giải thích khái niệm |
| thân mật | `nhe` | ×0,95 | nói riêng với một người |
| hỏi | `hoi` | ×0,90 | câu hỏi |
| chốt | `nhan` | ×0,86 | câu chốt — chậm lại, nặng tay |

Đừng để một đoạn dài cùng một kiểu, giọng sẽ đều đều — lỗi này đã ăn thật ở bộ Day 02. Chỉ có năm kiểu
này; một kiểu lạ ("mạnh", "vui") sẽ bị `--dry-run` chặn. Bảng nằm ở `voices.json` → `deliveries`.

---

## Không bịa số liệu

Cảnh chỉ được cho thấy những con số, kết quả, tên riêng **có trong kịch bản**. Muốn màn hình có "giảm 40%"
thì lời hoặc dòng **Trên màn hình** phải nói ra con số đó. Người dựng sẽ không tự thêm.

---

## Mốc giờ thì đừng viết

Nếu kịch bản mang từ nơi khác sang có cột mốc giờ, **bỏ đi**. Repo này làm giọng trước: máy đọc xong, đo
thời lượng thật của từng câu, rồi cảnh mới dựng theo đúng thời lượng đó. Mốc viết tay chỉ gây hiểu nhầm.
Muốn ước thời lượng thì tính khoảng **2,9 tiếng mỗi giây**.

---

## Kiểm tra trước khi tốn tiền

Sau khi `cues.js` được dựng từ kịch bản:

```
node tts-elevenlabs/tts.mjs generate --cues <video>/cues.js --pronounce projects/<id>/pronounce.json --dry-run
```

Nó in từng câu, kiểu đọc, tốc độ và tổng số ký tự sẽ bị tính phí — chưa gửi gì lên ElevenLabs.
