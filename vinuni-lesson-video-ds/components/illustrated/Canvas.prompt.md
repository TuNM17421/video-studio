# Canvas

**MỘT mặt phẳng cho cả video, và một camera đi trên nó.** Đây là thứ làm style Illustrated khác Lesson —
không phải mấy hình vẽ.

Lesson là chuỗi cảnh: mỗi câu một khung có tiêu đề, cắt cứng sang câu sau. Illustrated **không có cảnh
nào cả**: vật liệu nằm cố định trên một mặt phẳng rộng hơn màn hình, camera lia tới chỗ đang nói và lùi
ra khi cần toàn cảnh. Không có gì bị cắt đi nên người xem không mất dấu.

```jsx
const CAMERA = [
  { at: 0, w: 1920, x: 960, y: 540 },
  { at: say(6, 'một phần của từ'), dur: 40, w: 760, x: 430, y: 470 },  // lia vào hai ô "T" + "ôi"
  { at: say(10, 'kết hợp thông tin'), dur: 50, w: 2100, x: 960, y: 620 }, // lùi ra xem cả hai hàng
];
<SceneFrame frame={frame} header={false} captions={CAPTIONS} overlay={<Eyebrow>{EYEBROW}</Eyebrow>}>
  <Canvas frame={frame} camera={CAMERA}>{/* mọi phần tử, toạ độ mặt phẳng */}</Canvas>
</SceneFrame>
```

- **Không `Series`, không cảnh, không tiêu đề cảnh.** `video.jsx` vẽ một `SceneFrame` `header={false}`,
  eyebrow qua `overlay`, phụ đề `cueCaptions` của cả video. Chữ cần thấy viết thẳng lên mặt phẳng, cạnh
  đúng thứ nó chú thích — một tiêu đề lớn giữa màn hình là tín hiệu "slide" mạnh nhất, đừng dùng.
- **Toạ độ mặt phẳng là cố định.** Một phần tử đặt ở đâu thì nằm đó tới cuối video; muốn nó ra giữa màn
  hình thì **lia camera tới nó**, đừng đổi toạ độ của nó. Đổi toạ độ = teleport = quay lại thành slide.
- Zoom nội suy theo log nên gần ↔ xa mượt cả hai chiều. `w` nhỏ = zoom gần.
- Mỗi lần lia để hở ít nhất ~30 khung cho mắt bắt kịp; đừng lia khi lời đọc đang giữa một ý.
- `toScreen()` để kiểm một phần tử có lọt khung ở khung hình nào đó không.
