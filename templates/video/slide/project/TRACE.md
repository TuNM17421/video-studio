# TRACE — nhật ký dựng video

File này để **trace lại và cải thiện workflow**, không phải để khoe kết quả. Ledger
(`.studio/runs.jsonl`) đã đo được *bao lâu · mấy lượt · đỏ mấy lần*; nó KHÔNG đo được **vì sao**.
Phần "vì sao" nằm ở đây, và chỉ người vừa làm mới biết.

## Luật

- **ĐỪNG GÕ TIÊU ĐỀ MỤC BẰNG TAY.** Chạy:
  ```console
  node tools/trace-report.mjs --video <id> --stamp "<LANE-NN> · <stage> · <vai>"
  ```
  Máy đóng dấu **giờ thật** (`date`, giờ địa phương) + khuôn chín trường rỗng; lane chỉ điền thân
  mục. Lượt dựng 21–22/09/2026 gõ tay và **mọi mốc giờ đều là bịa** — có mục ghi giờ ở TƯƠNG LAI,
  nên bảng "phút mỗi stage" vô nghĩa đúng ở chỗ nó sinh ra để đo.
- **Mục `ORCH-*` là ghi chép ĐIỀU PHỐI**, không phải một stage dựng phim — `trace-report` tách
  chúng khỏi bảng stage nhưng vẫn tính vào bảng chi phí theo lane.
- **Mỗi lane APPEND đúng một mục khi kết thúc việc.** Không sửa mục của lane khác, không viết lại
  mục cũ cho đẹp — một mục sai vẫn có giá trị hơn một mục đã gọt.
- **Tối đa 15 dòng mỗi mục.** Dài hơn thì thứ thừa ra thuộc về báo cáo của lane, không thuộc về đây.
- **Giữ nguyên tên trường.** `tools/trace-report.mjs` đọc theo đúng các nhãn dưới đây; đổi chữ là
  mục đó rơi khỏi bảng tổng hợp.
- Không có gì để ghi ở một trường thì viết `không`. Bỏ trống = trace-report coi như chưa ai trả lời.
- Ghi số đo thật. "Chờ Kaggle lâu" không dùng được; "chờ Kaggle 6 phút × 3 lượt" thì dùng được.

## Khuôn một mục — chép nguyên khối này rồi điền

```markdown
## <stage> · <vai>
- thời gian: 2026-09-21 14:05 → 15:20
- lệnh đã chạy: 12
- gate đỏ: storyboard-gate G2 ×2 — mốc nhấn cue 7 chưa có từ để neo
- làm lại: 2 lượt — lần 1 khai sai tên cue nên voice-export sinh thừa 9 câu
- tài liệu: video-anatomy.md §3 ghi "QA 6 bước" trong khi qa.mjs in 9 — phải đọc source mới biết
- tool: voice-import --gaps không báo gì khi cues.js thiếu pauseAfter, im lặng bỏ qua
- chờ: Kaggle 6 phút × 3 lượt = 18 phút
- token: 277000
- đề xuất: storyboard-gate nên in luôn cue nào thiếu từ neo, thay vì chỉ đếm
```

Chín trường sau tiêu đề là bắt buộc. Ý nghĩa:

| Trường | Ghi gì | Vào báo cáo ở đâu |
|---|---|---|
| `thời gian` | `bắt đầu → kết thúc`, đồng hồ thật | cột phút (đối chứng với ledger) |
| `lệnh đã chạy` | ĐẾM, kể cả lệnh chạy hỏng | cột lượt |
| `gate đỏ` | gate nào, mấy lần, **nguyên nhân thật** | friction loại `gate` |
| `làm lại` | mấy lượt, vì sao | cột lượt |
| `tài liệu` | chỗ tài liệu SAI/THIẾU khiến phải đoán | friction loại `tài liệu` |
| `tool` | chỗ tool vấp, báo giả, im lặng nuốt lỗi | friction loại `tool` |
| `chờ` | Kaggle/render/shoot — thời gian NGỒI KHÔNG | friction loại `chờ` |
| `token` | **một số**, lấy từ thông báo hoàn tất của lane | bảng chi phí theo lane |
| `đề xuất` | một câu, sửa được ở đâu | danh sách đề xuất |

Gate đỏ **đúng** (tool bắt được lỗi thật của lane) vẫn ghi — nó đo được gate nào đang làm việc.
Gate đỏ **sai** (tool báo trong khi không có lỗi) thì thêm chữ `báo giả` vào dòng đó; trace-report
tách riêng hai loại.

---

<!-- APPEND TỪ ĐÂY. Đừng xoá dòng này. -->
