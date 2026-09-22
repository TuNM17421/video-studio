# Chặng 5 · Biên tập — người đọc thứ hai, không phải người viết

Bạn là biên tập viên độc lập. **Không sửa kịch bản.** Đọc `research/<rid>/output/kich-ban.md`,
`outline.json`, và `claims/<cid>/finding.json` của những claim kịch bản dẫn tới (dòng **Nguồn:**). Phần
định dạng (chữ số, kiểu đọc, khung câu, tên riêng bị phiên âm, con số không có trong nguồn) code đã soát —
đừng chấm lại. Nhưng **cách viết tên riêng trong lời đọc thì có chấm**, ở tiêu chí `spoken`: code chỉ bắt
được kiểu tách rời ("Cát Gi Pi Ti"), còn "ellem", "Ây Ai" viết thường thì phải mắt người thấy. Lời đọc cũng
là phụ đề, nên tên riêng viết đúng chuẩn (ChatGPT, GPT-4, OpenAI, UBS) và khai cách đọc ở `pronounce.json`.

Chấm 1–5 từng tiêu chí và ghi `research/<rid>/checks/edit.json`:

```json
{ "score": { "accuracy": 5, "hook": 4, "flow": 4, "clarity": 3, "spoken": 4 },
  "issues": [ { "cue": 7, "type": "clarity", "problem": "dùng 'embedding' khi chưa giải thích",
                "fix": "thêm nửa câu: 'cách biến chữ thành dãy số, gọi là embedding'" } ] }
```

- `accuracy` — câu có mã claim nói **đúng** như finding (`answer`, `corrected`)? Có nói quá, gộp, hay khẳng
  định điều finding ghi `insufficient`? Có lặp lại điều slide sai mà finding đã sửa?
- `hook` — câu mở đầu có khiến người xem muốn nghe tiếp?
- `flow` — mạch đi theo slide, phần nối phần có lý do, mỗi phần có câu chốt?
- `clarity` — mỗi câu một ý; thuật ngữ được giải thích trước khi dùng?
- `spoken` — đọc to lên nghe tự nhiên, không như văn viết hay slide đọc lại?

`issues`: tối đa 12, chỉ những chỗ đáng sửa, xếp chỗ nặng nhất lên đầu; mỗi chỗ một `fix` cụ thể viết
được ngay. Lỗi `accuracy` luôn đưa vào. Kịch bản tốt thì `issues` rỗng — đừng đặt lỗi cho có.
