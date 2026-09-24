# Yêu cầu dựng video n1-05-co-che-chu-y

- Tên video: Cơ chế chú ý — một từ cần cả câu xung quanh
- Style: Illustrated Style (lab) (`styles/illustrated.json`, hướng dẫn dựng cảnh `styles/illustrated.md`;
  đọc `styles/lesson.md` rồi `styles/lesson-lab.md` trước vì `extends: lesson-lab`)
- Ngày: Day01
- Kịch bản: `projects/n1-05-co-che-chu-y/kich-ban-goc.md`
  (tệp gốc: `ngay-01-video-05-attention-va-ngu-canh.md`, bản rà 07/09/2026, 46 câu)
- Feedback bản cũ: không có
- Video cũ: không có
- Agent: Claude Code
- Phạm vi: **video mẫu của style** — phần 1–3 của kịch bản gốc (câu 01–25), **rút gọn còn 15 câu**.
  Người dùng cho phép rút ngày 24/09/2026 với yêu cầu "chỉ cần giữ lại ý chính". Câu bị bỏ và lý do
  ghi thành bảng ở đầu `kich-ban-goc.md`. Phần 4–6 của bản gốc để cho một video khác.
- Bổ sung: không có (không hội thoại, không linh vật, không quiz, không ảnh tư liệu)

## Vì sao rút

Style Illustrated đòi **nhịp chậm**: mỗi phép biến hình ít nhất khoảng hai giây rồi đứng yên cho người
xem ngấm, tức khoảng mười lăm đến hai mươi câu cho năm phút. Bản gốc có 25 câu trong 3 phút 14 — dày
gấp đôi mức ấy, mỗi phép biến hình chỉ còn khoảng bốn giây. Rút xuống 15 câu là để nhịp khớp với style
thay vì ép style chạy theo kịch bản.

Câu chữ **giữ nguyên từ bản gốc** ở mọi chỗ giữ được; chỗ gộp hai câu thì nối bằng liên từ, không thêm
ý mới. Không con số nào được thêm vào.

## Vì sao chọn bài này làm mẫu

Nguyên tắc "một vật liệu sống suốt cả video" đã nằm sẵn trong kịch bản chứ không phải do người dựng áp
đặt: câu *"Lan không nhét vừa cuốn sách vào túi vì nó quá dày"* xuất hiện ở câu 1 và còn tới câu cuối.
Ba chỗ biến hình có ý nghĩa, không phải hiệu ứng:

| Câu | Biến hình |
|---|---|
| 3 | ô "dày" **biến tại chỗ** thành ô "nhỏ" — và nghĩa của từ "nó" lật hẳn |
| 13 | ba tấm thẻ cùng lật, để lộ mặt sau là ba dải số |
| 15 | các thẻ nội dung co giãn theo trọng số rồi **nhập lại** thành một dải số duy nhất |

Câu 8 của bản rút gọn (câu 13 bản gốc) tự nói các nét đậm nhạt là minh hoạ, nên không phải bịa trọng số
nào — chỉ cần giữ đúng lời ấy trên màn hình.

## Giọng đọc

- ElevenLabs, giọng **Nhật Phong** (`6adFm46eyy74snVn6YrT`, mặc định trong `voices.json`), model **eleven_v3**.
- **Nhịp chậm**: chạy TTS với `--pause` lớn hơn mặc định (thử 2.6) để khoảng lặng giữa các câu đủ cho
  phép biến hình đứng yên. Vẫn `--dry-run` trước.
- Key ElevenLabs của máy này **đã hết quota** ở lần chạy N1-03 (còn 37 credit). Phải nạp thêm hoặc đổi
  key trước khi gọi thật.

## Ghi chú

- Không dùng nhãn MINH HỌA (`IllustrativeStamp` đã ngừng vẽ nhãn đó từ quyết định lab 11/09/2026).
  Lời đọc câu 8 đã tự nói điều đó thành tiếng.
- `GridTransform` **không dùng** trong video này: không câu nào nói về ma trận như một phép biến đổi
  không gian. Đừng thêm vào cho đủ bộ.
- Dựng xong thì trỏ `sampleVideo` của `styles/illustrated.json` vào đây.

## Cách làm

Làm theo skill `make-video` (`.claude/skills/make-video/SKILL.md`), thứ tự: cues → giọng → cảnh → render
→ bàn giao.
