---
style: morph
---

# Morph Style (lab) — dựng cảnh

**Đây là một lab thử nghiệm.** Chưa có video mẫu: bản dựng đầu tiên bằng style này chính là lượt thử, và
chỉ sau khi xem lại nó mới quyết định có dùng cho bài thật hay không. Đừng coi những gì viết dưới đây là
đường đã thông — coi nó là giả thuyết kèm cách kiểm.

Phần lõi của skill `make-video` (thời lượng theo giọng, beat theo `spokenAt`, phụ đề, không bịa số,
build/verify/QA) vẫn áp dụng. Style này **không** dùng hướng dẫn dựng cảnh của Lesson: không `sNN.jsx`,
không `Series`, không tiêu đề cảnh.

Component: `components/morph/` — đọc `MorphSequence.prompt.md` trước, rồi `shapes.prompt.md`,
`Morph.prompt.md`, `Layer.prompt.md`, `Axes.prompt.md`. Clip thử hiện có:
`vinuni-lesson-video-ds/ui_kits/lesson-video/videos/thu-morph/` (hai mươi giây, không lời đọc) — đọc
`morph.jsx` để thấy cách khai một vật.

## Cơ chế: một vật, nhiều trạng thái

`video.jsx` vẽ **một** `SceneFrame` `header={false}`, eyebrow qua `overlay`, phụ đề `cueCaptions` của cả
video. Bên trong là các vật, mỗi vật **một** `MorphSequence`:

```jsx
<MorphSequence frame={frame} states={[
  { at: 0, shape: shapes.strip({ x, y, n: 8 }), fill: C.accent, fillOpacity: 0.1, stroke: C.accentStrong, strokeWidth: 3 },
  { at: spokenAt(4, 'một mũi tên'), dur: 110, shape: shapes.arrow({ from: O, to: TIP }), fillOpacity: 0.92, strokeWidth: 0 },
  { at: spokenAt(7, 'gần nghĩa'), dur: 90, shape: shapes.arrow({ from: O, to: TIP2 }) },
]} />
```

- Trạng thái sau **thừa kế** thuộc tính không khai — chỉ ghi cái đang đổi.
- `at` lấy bằng `spokenAt(n, 'cụm từ')` để phép biến hình xảy ra đúng lúc lời đọc nói tới nó.
- **Một vật = một `MorphSequence`.** Đừng cho vật biến mất rồi dựng lại bằng component khác: người xem
  mất dấu, và style mất lý do tồn tại.

## Kỷ luật: mọi hình là path khép kín

Lấy từ `shapes.js` (`rect · circle · arrow · triangle · wedge · polygon · cell · strip`). Vẽ bằng
`<rect>` / `<circle>` trông y hệt nhưng **không biến hình được** — flubber cần hai path cùng loại, cùng
chiều. Cần hình chưa có thì thêm hàm vào `shapes.js`, đừng viết `d` tay trong file video.

Đây là chi phí thật của style này. Không phải morph khó — `morphPath` đã có sẵn trong `lib/paths.js` từ
trước — mà là phải bỏ thói quen vẽ bằng thẻ hình học.

## Ba mức đậm nhạt, không hơn

`Layer`: `main` 100 % · `context` 40 % · `frame` 15 %. Mắt chỉ phân biệt được vài mức; dùng đúng ba mức
này thì người xem học được quy ước sau vài giây. `fade` để vào/ra mềm, **không** để tạo mức thứ tư.

## Nhịp — và vì sao nó nằm ở kịch bản

Mỗi phép biến hình ít nhất khoảng hai giây, rồi **đứng yên** cho người xem ngấm. Nghĩa là kịch bản cho
năm phút ở style này có chừng **mười lăm câu**, không phải bốn mươi — câu dài hơn, khoảng lặng nhiều hơn.
Không viết như thế từ đầu thì dựng xong sẽ thấy hình chạy hụt hơi, và lúc ấy sửa là phải thu lại giọng.

Nói với người viết kịch bản **trước** khi viết, đừng chữa ở bước dựng cảnh.

## Câu chưa chốt: nền tối

3Blue1Brown dùng nền tối, và phần lớn cảm giác "Manim" đến từ đó. Style này **vẫn ở nền trắng** và bảng 9
màu, có chủ ý: để tách biến số cần duyệt (nền tối) khỏi biến số kỹ thuật (biến hình, thang đậm nhạt, nhịp).

Nền tối không phải "thêm một màu": `C.bg` trắng là token nền duy nhất, thanh phụ đề navy sẽ biến mất trên
nền tối, eyebrow đỏ sẽ đục. Nó là **một bộ chrome thứ hai + một bảng màu đối ứng**, phải được duyệt riêng.
Đừng tự thêm trong lúc dựng một video.

## Tiêu chí QA

- Không ảnh nào có tiêu đề cảnh ở giữa màn hình; chữ nằm cạnh hình nó chú thích.
- Vật chính nhận ra được qua các ảnh: cùng màu, cùng vị trí gốc, chỉ đổi hình. Không có chỗ nào nó biến
  mất rồi hiện lại.
- Chụp cả **khung giữa** của mỗi phép biến hình, không chỉ đầu và cuối: hình ở giữa phải ra một hình trung
  gian hợp lý, không xoắn và không nhảy. Đây là lỗi ảnh đầu/cuối không bao giờ lộ.
- Độ đặc chỉ rơi vào ba mức 100 / 40 / 15.
- Trục toạ độ (nếu có) ở mức khung, không tranh chú ý với vật.
- Con số trên màn hình khớp đúng với con số trong `kich-ban-goc.md`.
- Mỗi phép biến hình kéo dài ít nhất khoảng hai giây và có khoảng đứng yên sau đó.
