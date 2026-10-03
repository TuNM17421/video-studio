---
name: Video có ảnh tư liệu
summary: Studio đề xuất vài ảnh thật (người, sự kiện lịch sử, hiện vật, hình kinh điển) dựa theo kịch bản để sử dụng trong video.
icon: image
preview: modules/anh-tu-lieu-mau.mp4
default: true
order: 40
---

# Module · Video có ảnh tư liệu

Viết kịch bản theo `templates/kich-ban-co-ban.md` — module này **không đổi gì ở kịch bản**. Ảnh được chọn sau
khi lời đã chốt (bước Lời & cue được duyệt), dựa trên chính lời đọc.

Animation vẫn là mặc định. Ảnh thật chỉ dành cho chỗ người xem cần **nhận ra một thứ có thật**: một người,
một sự kiện, một hiện vật, một hình kinh điển của khái niệm có tên. Không bật module này thì video không có ảnh
nào — không `PhotoCard`, không tự tìm ảnh.

---

## Studio làm gì

Khi bước **Lời & cue** được duyệt, Studio chạy phần đề xuất ảnh song song với bước **Giọng đọc** (skill
`.claude/skills/image-suggest/`):

1. agent chọn vài câu đáng có ảnh, kèm lý do và từ khoá (`projects/<id>/images/triage.json`);
2. code tìm ảnh trên Wikimedia Commons và Openverse, **chỉ giữ ảnh có giấy phép dùng thương mại**
   (`images.policy.json`: không NC, không ND, không ảnh không rõ giấy phép);
3. agent nhìn ảnh, xếp hạng tối đa 3 ảnh mỗi chỗ;
4. **người dựng video duyệt** trong panel "Ảnh đề xuất": dùng ảnh · dùng làm tham khảo · bỏ, dùng animation.

Ảnh được chọn tải về `<thư mục video>/img/` và ghi vào `<thư mục video>/images.js`. Chỗ nào chưa quyết coi như
dùng animation — bước dựng cảnh không phải chờ.

---

## Khi dựng cảnh

Đọc `images.js` của video (nếu có). Mỗi mục là một chỗ đã được người dựng duyệt:

- `kind: "use"` → cảnh của các câu trong `cues` dùng `PhotoCard` (`components/media/PhotoCard.prompt.md`): ảnh
  là chủ thể của cảnh, `src`, `credit`, `caption`, `width`/`height` chép nguyên từ `images.js`; ý đang đọc đặt
  cạnh ảnh, không đè lên ảnh.
- `kind: "reference"` → Read ảnh ở `vinuni-lesson-video-ds/<src>` rồi **vẽ lại** bằng component của design
  system; ảnh không xuất hiện trong video.
- Câu không có trong `images.js` → dựng bằng animation như bình thường.

Không tự tìm, tự tải hay tự thêm ảnh; không dùng ảnh ở câu khác với câu đã duyệt.

## Tiêu chí QA

- Cảnh có `PhotoCard`: dòng ghi nguồn đọc được, nằm trong vùng nội dung, không bị phụ đề hay component khác che.
- Ảnh không bị kéo méo, không bị xén mất mặt người hay nhãn của hình.
- Không có chữ, mũi tên hay component nào đè lên ảnh.
