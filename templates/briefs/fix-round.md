# Brief — vòng sửa sau nghiệm thu (dán nguyên, điền `<…>`)

Một vòng sửa = một danh sách đóng. **Không mở rộng phạm vi**: thấy lỗi ngoài danh sách thì ghi lại
ở cuối báo cáo, không tự sửa.

## Video
`<id>` · file cần sửa: `<danh sách đường dẫn>` · **không đụng file nào khác**.

## Danh sách lỗi phải sửa

| # | Lỗi (quan sát được) | Ở đâu | Bằng chứng | Sửa xong thì thấy gì |
|---|---|---|---|---|
| 1 | `<ví dụ: câu trích đè chú thích>` | `<cảnh/frame>` · `<file:dòng>` | `<output tool hoặc ảnh>` | `<qa-layout ra 0 lỗi ở frame đó>` |
| 2 | `<…>` | `<…>` | `<…>` | `<…>` |

Dòng nào không có cột "Bằng chứng" thì ghi `GIẢ THUYẾT` — lane được quyền bác và báo lại.

## Cấm
- **Không đổi wording** đã khoá (`projects/<id>/loi-dan-lock.md`). Cần đổi thì báo, đừng sửa.
- Không đổi hành vi của video khác. Check mới (nếu có) chỉ CHẶN video `<id>`, CẢNH BÁO phần còn lại.
- Không sinh lại giọng quá **2 lượt** cho một câu; lượt thứ ba thì đổi cách viết câu rồi đẩy lên
  owner. Mọi câu hỏng đi chung MỘT lượt Kaggle (một vòng tốn cố định 3,5–6 phút).
- Không commit, không push, không đổi branch.

## Nghiệm thu
- Với mỗi dòng trong bảng: dán cặp **trước → sau** quan sát được (output tool, hoặc frame full-res
  1920×1080 trích từ MP4). Exit code xanh không phải bằng chứng thị giác.
- Refactor "không đổi hành vi": lưu output trước/sau, `diff` phải rỗng (trừ số ms).
- Chạy lại toàn bộ gate của video, dán output thật.
- **Kết thúc bằng `ls -la` + `wc -l`** các file đã sửa.
- Mục "ngoài phạm vi, chỉ ghi lại" ở cuối — đừng trộn vào phần đã sửa.
- **Kết thúc việc = `node tools/trace-report.mjs --video <id> --stamp "<LANE-NN> · <stage> · <vai>"`**
  rồi điền thân mục (≤15 dòng, chín trường, có dòng `token:`). ĐỪNG gõ tiêu đề/giờ bằng tay. Nếu bạn tự viết một stage (`cues`/`scenes`/`deliver`)
  thì đóng ledger bằng `node tools/video-workflow.mjs run finish --video <id> --run-id <ID>
  --status done --input-tokens N --output-tokens N --model <tên>`. Không ghi = lần dựng sau
  không trace lại được (`node tools/trace-report.mjs --video <id>`).
- **Chờ lane khác = `node tools/handoff.mjs wait --video <id> <khoá> [--equals <v>]`**, KHÔNG chờ
  một mục TRACE xuất hiện. Xong phần của mình thì `handoff set` (vd `voice.state --value staged`).
  Cần server tĩnh: `npm run stage:serve -- --status` TRƯỚC khi mở cái thứ hai; tắt bằng `--stop`.
