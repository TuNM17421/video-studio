# Brief — lane `audit` (read-only, dán nguyên, điền `<…>`)

Bạn **chỉ đọc và đo**. Không sửa một file nào trong repo; mọi thứ bạn viết ra nằm trong scratchpad
của phiên. Báo cáo của bạn là **đề xuất**, không phải lệnh — orchestrator sẽ quyết.

## Phạm vi
`<lĩnh vực: quy trình | giọng | QA | kịch bản | animation>` trong `<BASE>`.
Câu hỏi cần trả lời: `<1–3 câu hỏi cụ thể>`.

## Luật đo
- **Mỗi phát hiện phải có `file:dòng`** hoặc output lệnh thật. Không "chắc là do…".
- **Đo đúng đơn vị và so tập, không chỉ so số đếm.** Số lấy từ index/tóm tắt không thay source.
- Chưa probe được thì ghi `GIẢ THUYẾT` ngay ở đầu phát hiện đó.
- Chạy được tool nào thì chạy (`node tools/component-usage.mjs`, `voice-pace.mjs`, `cues-json.mjs`…)
  — nhưng **không** lệnh nào ghi vào repo, không `render`, không gọi Kaggle/ElevenLabs, không đọc
  `.env`, không cài dependency.

## Mỗi phát hiện viết theo đúng 5 dòng này
```
### F<n> · [S|M|L] <một câu nói rõ vấn đề>
**Bằng chứng.** <file:dòng · số đo · output>
**Giá hiện tại.** <mất gì: token, phút, một vòng render lại, một lỗi đã phát hành>
**Sửa.** <đề xuất cụ thể; nêu luật nào bị gộp/bỏ nếu có>
**Cỡ · File đụng · Cách chứng minh đã sửa.** <phá cái gì để thấy nó đỏ>
```

## Bắt buộc có trong báo cáo
- Một mục **"Cái tôi KHÔNG kiểm được"** — thẳng thắn, không lấp liếm.
- Một mục **"Đừng làm"** nếu đo ra được: việc nào nghe hợp lý nhưng số liệu nói là công đổ đi.
- Với mỗi đề xuất thêm check: nói rõ check đó **biết fail như thế nào**.

## Nghiệm thu
- **Kết thúc báo cáo bằng `ls -la` + `wc -l`** của chính file báo cáo.
- Không đề xuất nào dựa trên file bạn chưa mở. Đề xuất nào bạn thấy trong brief này là sai thì bác
  và ghi lý do một dòng.
- **Kết thúc việc = `node tools/trace-report.mjs --video <id> --stamp "<LANE-NN> · <stage> · <vai>"`**
  rồi điền thân mục (≤15 dòng, chín trường, có dòng `token:`). ĐỪNG gõ tiêu đề/giờ bằng tay. Nếu bạn tự viết một stage (`cues`/`scenes`/`deliver`)
  thì đóng ledger bằng `node tools/video-workflow.mjs run finish --video <id> --run-id <ID>
  --status done --input-tokens N --output-tokens N --model <tên>`. Không ghi = lần dựng sau
  không trace lại được (`node tools/trace-report.mjs --video <id>`).
- **Chờ lane khác = `node tools/handoff.mjs wait --video <id> <khoá> [--equals <v>]`**, KHÔNG chờ
  một mục TRACE xuất hiện. Xong phần của mình thì `handoff set` (vd `voice.state --value staged`).
  Cần server tĩnh: `npm run stage:serve -- --status` TRƯỚC khi mở cái thứ hai; tắt bằng `--stop`.
