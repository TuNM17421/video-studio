---
name: Video có linh vật Griffin
short: Linh vật Griffin
summary: Griffin xuất hiện trên màn hình để chào, gợi câu hỏi, reo vui — hoặc tự dẫn cả video bằng giọng của mình.
icon: mascot
preview: samples/mau-huong-dan/mau-huong-dan.mp4
order: 30
---

# Module · Video có linh vật Griffin

Viết kịch bản theo `templates/kich-ban-co-ban.md`, rồi thêm những điều dưới đây. File này chỉ ghi phần
**thêm** — mọi luật của mẫu cơ bản vẫn giữ nguyên. Dùng được cùng hội thoại (`dialogue.md`) và quiz
(`quiz.md`).

Griffin là linh vật VinUni: bốn chân, hai cánh, khăn VinUni. Trong video nó là component `Griffin` (cả con)
và `GriffinBadge` (gương mặt trong khung tròn) — xem `vinuni-lesson-video-ds/components/mascot/Griffin.prompt.md`
và Studio → **Thư viện · Mascot** để biết từng dáng, biểu cảm và đạo cụ.

**Không bật module này thì video không có Griffin** — không component `Griffin`, không `GriffinBadge`, không
để Griffin nói.

---

## Chọn một trong hai vai, ghi ở đầu kịch bản

```markdown
- **Linh vật:** Griffin đi cùng — xuất hiện ở mở bài, chuyển phần và kết bài.
```

| Vai | Ai đọc lời | Griffin làm gì |
|---|---|---|
| **Đi cùng** (mặc định) | người dẫn bình thường (giọng ở dòng **Giọng đọc**) | đứng một bên khung, phản ứng theo lời: chào, nghĩ, "à ra thế", reo vui. Không nói |
| **Dẫn** | Griffin — giọng Nhật Phong mượn qua nhân vật `Griffin` trong `voices.json` | kể cả video, xưng "mình". Video mẫu `mau-huong-dan` là vai này |

Vai **Dẫn** thì dòng **Giọng đọc** ghi `Griffin`. Có bật cả hội thoại thì Griffin là một nhân vật như mọi nhân
vật khác — câu nào Griffin nói thì **Ai:** Griffin.

---

## Thêm dòng **Griffin** cho câu có linh vật

```markdown
### Câu 1
- **Kiểu:** kể
- **Lời:** Chào bạn, hôm nay mình cùng xem vì sao cách hỏi quyết định câu trả lời.
- **Trên màn hình:** Tiêu đề bài học
- **Griffin:** bước vào từ mép phải, vẫy cánh chào · vui

### Câu 5
- **Kiểu:** hỏi
- **Lời:** Vậy nếu mình hỏi thiếu bối cảnh thì sao?
- **Trên màn hình:** Câu lệnh gốc in to
- **Griffin:** nghiêng đầu nghĩ, dấu hỏi hiện ở "thì sao"
```

Viết bằng lời thường: làm gì, biểu cảm gì, gắn vào **chữ nào** trong **Lời**. Người dựng đổi sang dáng /
biểu cảm / đạo cụ thật và đặt đúng lúc chữ đó được đọc (`spokenAt`). Câu **không** có dòng này thì không có
Griffin — đừng rải nó khắp video.

Những gì Griffin làm được: đi vào · đứng · ngồi · vẫy cánh chào · dang cánh đón · giơ hai cánh reo · nhảy một
nhịp. Biểu cảm: vui · nháy mắt · ngạc nhiên · đang nghĩ · buồn · nghiêm. Đạo cụ bay cạnh đầu: bóng đèn · dấu
hỏi · dấu chấm than · lấp lánh. Griffin **không có tay**: không cầm, không chỉ vào gì, mỏ không mấp máy theo lời.

---

## Luật đặt Griffin

- **Chỗ hợp:** mở bài, chuyển phần, câu hỏi gợi mở, lúc "à ra thế", kết bài. Vai **Dẫn** thì có thể đứng
  suốt, nhưng vẫn nhường chỗ ở cảnh dày chữ.
- **Chỗ không hợp:** cảnh đang giải thích bằng sơ đồ hay nhiều chữ — Griffin chiếm khoảng một phần tư khung
  và hút mắt. Ở đó bỏ hẳn, hoặc dùng `GriffinBadge` nhỏ ở góc.
- **Một Griffin mỗi cảnh**, đổi dáng hay biểu cảm không nhanh hơn khoảng một lần mỗi giây.
- Griffin chỉ phản ứng với ý **đã có trong lời đọc** — không thêm lời thoại, không thêm con số hay kết luận.
- Ảnh Griffin nằm trên kho media, nên xem thử và render cần có mạng.
