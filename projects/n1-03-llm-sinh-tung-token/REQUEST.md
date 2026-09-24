# Yêu cầu dựng video n1-03-llm-sinh-tung-token

- Tên video: Mô hình ngôn ngữ tạo văn bản từng mảnh như thế nào?
- Style: Illustrated Style (lab) (`styles/illustrated.json`, hướng dẫn dựng cảnh `styles/illustrated.md`,
  đọc `styles/lesson.md` rồi `styles/lesson-lab.md` trước vì `extends: lesson-lab`)
- Ngày: Day01
- Kịch bản: `projects/n1-03-llm-sinh-tung-token/kich-ban-goc.md`
  (tệp gốc: `ngay-01-video-03-llm-sinh-tung-token.md`, bản rà 07/09/2026)
- Feedback bản cũ: không có
- Video cũ: không có
- Agent: Claude Code
- Phạm vi: **phần 1–3 của kịch bản gốc, câu 01–25** (00:00–03:12). Phần 4–6 (câu 26–42) **không** dựng
  trong video này — phần 5 nói về nguồn tin và quy trình, không có hình dạng dữ liệu để mổ xẻ, nên thuộc
  về một video Lesson Lab khác. Người dùng chốt phạm vi này ngày 24/09/2026.
- Bổ sung: không có (không hội thoại, không linh vật, không quiz)

## Mẫu kịch bản

Kịch bản theo `templates/kich-ban-co-ban.md`. Bản gốc viết theo mẫu cũ (khối `**Lời đọc nguyên văn:**`
kèm timecode) và đã được chuyển sang mẫu hiện tại trong một lần, **lời đọc giữ nguyên từng chữ**.

## Giọng đọc

- ElevenLabs, giọng **Nhật Phong** (`6adFm46eyy74snVn6YrT`, mặc định trong `voices.json`).
- Model **eleven_v3**.
- Người dùng đã cho phép gọi ElevenLabs cho video này (24/09/2026). Vẫn `--dry-run` trước mỗi lần chạy thật.

## Dữ liệu đã chốt — không được bịa thêm

Câu xuyên suốt "Tôi mang ô vì trời…", cắt bằng **bộ tách của GPT-5**:

| Token | Mã |
|---|---|
| `T` | 51 |
| `ôi` | 23865 |
| `␣mang` | 18033 |
| `␣ô` | 27598 |
| `␣vì` | 60010 |
| `␣trời` | 177808 |

Năm tiếng → **sáu** token. Khoảng trắng nằm **trong** token, vẽ bằng `␣`.

Phần nối tiếp: `␣đang` 49804 · `␣m` 284 · `ưa` 43653 — chữ "mưa" tốn **hai** token (dùng cho câu 16).

Bảng khả năng: mưa 60%, nắng 20%, lạnh 10%, khác 10% — số do người viết kịch bản đặt.

Màn hình phải ghi **GPT-5** ở cảnh token (câu 07 nói cách chia là do bộ tách quyết định; không ghi thì
người xem tưởng mô hình nào cũng cắt y hệt).

## Ghi chú

- **Không dùng nhãn MINH HỌA.** Kịch bản gốc yêu cầu gắn nhãn đó ở mọi khung xác suất, nhưng người dùng
  chốt bỏ (24/09/2026). Lời đọc đã tự nói điều đó hai lần thành tiếng (câu 14 và 15), và
  `IllustrativeStamp` cũng đã ngừng vẽ nhãn chứa "MINH HỌA" từ quyết định lab 11/09/2026.
- Video này là **video mẫu đầu tiên** của style Illustrated — `styles/illustrated.json` đang
  `sampleVideo: null`, chưa có video nào để copy cấu trúc. Dựng xong thì trỏ `sampleVideo` vào đây.
- Hình đã dựng thử cho câu 05, 06, 08, 09, 16, 20:
  `vinuni-lesson-video-ds/ui_kits/lesson-video/demos/illustrated-tokens.html?scene=<n>` — dùng lại được.

## Cách làm

Làm theo skill `make-video` (`.claude/skills/make-video/SKILL.md`), thứ tự: cues → giọng → cảnh → render
→ bàn giao.
