---
name: voice-align-check
description: Đánh giá chất lượng mốc từng từ của giọng nhập (audio tự thu hoặc model local) và nói rõ đã đến lúc chuyển sang Whisper + CTC align hay chưa. Dùng khi thấy beat trong cảnh hay lệch lời, khi phải sửa nhịp nhiều lần, hoặc khi hỏi "giọng nhập có đủ chính xác không".
---

# voice-align-check — giọng nhập đã đủ chính xác chưa?

Trả lời một câu hỏi: cách lấy mốc từng từ hiện tại (faster-whisper `word_timestamps`) còn đủ dùng không,
hay đã đến lúc trả giá cho forced alignment. Bối cảnh và các ngưỡng nằm ở `docs/decisions/voice-align.md`
— đọc file đó trước, vì nó là nguồn sự thật, còn skill này chỉ chạy phép đo và diễn giải.

## Cách làm

1. `node tools/align-health.mjs` (thêm `--json` nếu cần số liệu thô). Nó đọc mọi
   `voice/out/*/align-report.json` và `projects/*/.studio/log.jsonl`.
2. Đọc `docs/decisions/voice-align.md`, mục "Khi nào thì đổi".
3. Báo cáo bằng tiếng Việt, gồm:
   - kết luận của công cụ (`ok` / `insufficient-data` / `migrate`) và **vì sao**, dẫn ra con số cụ thể;
   - video nào yếu nhất và câu nào khớp thấp — đó là chỗ nên nghe lại trước khi đổ lỗi cho thuật toán;
   - nếu là `migrate`: nói rõ việc phải làm (thêm bước CTC align vào `tools/voice-align/`, giữ nguyên
     định dạng `words` nên `lib/speech.js` và scenes không phải sửa), và hỏi người dùng có làm không.

## Đọc kết quả cho đúng

- **Câu khớp yếu không phải lúc nào cũng là lỗi của aligner.** Whisper nghe kém khi câu dày thuật ngữ
  tiếng Anh, khi bản thu ồn, hoặc khi người đọc đọc sai lời. Trước khi kết luận, kiểm tra `heardText`
  trong `align-report.json`: nếu bản nghe được khác hẳn lời thì vấn đề nằm ở bản thu, không phải ở cách
  lấy mốc.
- **Góp ý về nhịp có thể đến từ chỗ khác.** Beat lệch cũng có thể do cảnh đặt sai `spokenAt`, hoặc do
  câu được viết lại sau khi thu. Đọc vài dòng góp ý thật trong nhật ký chứ đừng chỉ đếm.
- **`--force` làm hỏng số liệu.** Video nhập ép có câu sai được cố tình cho qua; công cụ có đánh dấu
  `nhập ép`, hãy tách chúng ra khi nhận xét.
- Chưa đủ 3 video thì kết luận là "chưa đủ dữ liệu", không phải "ổn rồi". Nói đúng như vậy.

Không tự ý đổi ngưỡng, không tự ý migrate. Đây là quyết định của người dùng.
