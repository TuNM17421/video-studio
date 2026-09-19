# Yêu cầu dựng video mau-huong-dan

- Tên video: Mẫu · Griffin kể năm bước làm video
- Style: Lesson Lab Style (`styles/lesson-lab.json`)
- Ngày: Day01
- Kịch bản: `projects/mau-huong-dan/kich-ban-goc.md` (tệp gốc: kich-ban-goc.md)
- Feedback bản cũ: không có
- Video cũ: không có
- Agent: Claude Code (dựng tay qua CLI, không qua Studio)
- Phạm vi: dựng cảnh + QA, giọng đọc, render MP4, transcript, file chương
- Bổ sung: Video có linh vật Griffin

## Mẫu kịch bản

Kịch bản theo `templates/kich-ban-co-ban.md`.
Có **Video có linh vật Griffin**: đọc thêm `templates/modules/mascot.md` — file đó chỉ ghi phần thêm so với mẫu cơ bản.

## Ghi chú

Video mẫu của **chế độ tập** trong tour hướng dẫn của Studio: một video đã đi đủ năm bước, để người mới xem
từng bước trông thế nào khi đã xong. Người dẫn là linh vật Griffin (giọng Nhật Phong, nhân vật `Griffin` trong
`voices.json`). Phần chữ nằm trong git; bản thu `.wav`, MP4 và ảnh QA nằm trên kho media R2
(`samples/mau-huong-dan/…`, tải về bằng `npm run sample`).

## Cách làm

Làm theo skill `make-video` (`.claude/skills/make-video/SKILL.md`), thứ tự: cues → giọng → cảnh → render → bàn giao.
