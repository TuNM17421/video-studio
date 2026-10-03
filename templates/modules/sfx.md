---
name: Video có tiếng động
short: Tiếng động
summary: Studio đề xuất những chỗ đáng có tiếng nhấn, người dựng nghe thử từng chỗ rồi mới duyệt.
icon: audio
default: true
order: 50
---

# Module · Video có tiếng động

Viết kịch bản theo `templates/kich-ban-co-ban.md`, rồi thêm những điều dưới đây. File này chỉ ghi phần
**thêm** — mọi luật của mẫu cơ bản vẫn giữ nguyên.

Mặc định video **không có tiếng động nào** ngoài giọng đọc và nhạc nền. Bật module này thì Studio đi tìm
những chỗ đáng có tiếng và đề xuất, **quyền quyết định vẫn là của người dựng video** — y như ảnh tư liệu.

---

## Studio làm gì

Tiếng động căn theo **mốc lời thật**, nên chặng này chạy **sau khi đã có giọng** (khác ảnh tư liệu — ảnh
chỉ cần lời đã chốt nên chạy song song với bước Giọng đọc):

1. agent đọc kịch bản + `voice.cues.json` rồi chọn vài chỗ đáng có tiếng, mỗi chỗ kèm **lý do** và cụm từ
   neo vào (`projects/<id>/sfx/triage.json`);
2. code soát luật ngay: trần 4 tiếng nhấn mỗi video, ngân sách mật độ foley, không đặt tiếng vào khoảng
   chờ quiz;
3. **người dựng duyệt** ở bước **Render**, panel "Tiếng động": mỗi chỗ nghe thử được **đúng đoạn đó của
   video, có tiếng và không tiếng**, rồi chọn dùng · đổi tiếng khác · bỏ;
4. chỗ nào được duyệt mới vào bản trộn; chỗ không duyệt thì im lặng như cũ.

Hai tiếng Studio tự đề xuất sẵn — một `whoosh-long` mở màn và một `whoosh` ở đầu mỗi phần — cũng hiện
trong panel và **bỏ được**, không phải luật bất biến.

---

## Kịch bản khai gì

Người viết kịch bản **không bắt buộc khai gì cả**: bật module là đủ, Studio tự đề xuất. Nhưng chỗ nào
người viết đã biết chắc là phải có tiếng (vì chính hình đang diễn thứ đó) thì khai thẳng, Studio giữ
nguyên và không đề xuất đè lên:

```markdown
## 3 · Mùa đông AI
- **Nền:** wind

### Câu 14
- **Kiểu:** kể
- **Lời:** Bộ đếm nhảy từ mười lên mười nghìn chỉ trong hai năm.
- **Trên màn hình:** Bộ đếm chạy 10 → 10.000
- **Tiếng:** counter @ "nhảy từ mười" · chuỗi tám nhịp
```

- **Tiếng:** đặt trong một **câu**, dạng `<id> @ "<cụm từ trong lời>"`. Cụm từ là chỗ tiếng rơi vào —
  đúng lúc người đọc đọc tới chữ đó, nên tiếng và hình mới trùng nhau. Thêm mô tả sau dấu `·` nếu muốn
  một chuỗi dồn nhịp.
- **Nền:** đặt ngay dưới tiêu đề một **phần**, chỉ gồm id. Nó phủ cả phần đó, rất nhỏ, có fade hai đầu.

`<id>` phải là một tiếng **có thật trong danh mục** — danh mục nằm trong `REQUEST.md` của video này, và
xem được ở Studio → **Thư viện · Tiếng động** (nghe thử từng tiếng). Đừng bịa id, đừng mô tả tiếng bằng
lời ("tiếng chuông leng keng"): không tra được thì chỗ đó bị bỏ.

---

## Bốn lớp, mỗi lớp một việc

| Lớp | Để làm gì | Luật |
|---|---|---|
| **Tiếng nhấn** | kéo sự chú ý về một mốc | **trần cứng 4 lần cả video** — hết trần là hết, không nới |
| **Chuyển đoạn** | ranh giới giữa hai phần | Studio tự đặt, người viết hiếm khi phải khai |
| **Tiếng của chuyển động** | tiếng của chính thứ đang động trên hình | nhỏ, khô, nằm **dưới** lời; ngân sách 12 sự kiện mỗi phút |
| **Tiếng nền** | không khí của cả một phần | rất nhỏ, không phải một sự kiện |

Phân biệt quan trọng nhất là **tiếng nhấn** với **tiếng của chuyển động**. Một ý chốt hiện ra là tiếng
nhấn (và tiêu một suất trong bốn suất). Một con dấu đóng xuống, một nhánh nở, một trang giấy lật — đó là
tiếng của chính chuyển động, không tiêu suất nào. Lẫn hai thứ này thì hoặc video hết trần từ phút đầu,
hoặc tai nghe ra một tràng tiếng lẻ không có trọng tâm.

---

## Ba chỗ không đặt tiếng

**Một · Khoảng chờ quiz.** Lúc đồng hồ chạy là nhạc quiz, người xem đang nghĩ. Một tiếng "tách" ở đó đọc
thành "hết giờ" và cắt ngang suy nghĩ. Câu hỏi và câu chữa bài thì đặt được bình thường.

**Hai · Giữa một chữ quan trọng.** Tiếng rơi đúng lúc đang đọc con số hay tên riêng thì người xem nghe
hụt mất chữ đó. Neo vào đầu một cụm, hoặc vào chỗ nghỉ giữa hai câu.

**Ba · Chỗ không có gì xảy ra trên hình.** Tiếng không đi kèm một thay đổi nào trên màn hình thì người
xem quay đi tìm thứ vừa kêu và không thấy gì. Tiếng là để **chỉ vào** một chuyển động, không phải để lấp
chỗ trống.

---

## Vì sao file này không có mục `## Tiêu chí QA`

Lượt QA của Studio soi **ảnh tĩnh**, mà tiếng thì không nhìn thấy trên ảnh. Chỗ soát của tiếng động là
bản trộn: `node tools/sfx-mix.mjs --video <id> --dry` in ra từng tiếng kèm mốc thời gian, lớp, mức thật
và cờ "đè lời", cộng với cuesheet sinh kèm bản trộn. Panel "Tiếng động" ở bước Render đọc đúng những số
đó, nên người duyệt thấy cùng một thứ mà không phải chạy lệnh.
