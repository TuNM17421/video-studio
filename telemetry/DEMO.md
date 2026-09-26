# Demo: đo chi phí và truy vết mỗi video (khoảng 12 phút)

**Thông điệp chính**: mỗi video giờ có "hoá đơn" riêng: tốn bao nhiêu tiền, bao nhiêu token, bao lâu, chia theo
phase và theo nhà cung cấp. Khi QA chê một chỗ, ta truy được chỗ đó do lượt AI nào tạo ra và tốn bao nhiêu để sửa.
Số nào không đo được thì để trống, không ghi 0.

## Chuẩn bị (trước giờ trình bày 30 phút)

- [ ] Stack chạy: production ở https://video-telemetry.duckdns.org (tài khoản Viewer), hoặc bản local `http://127.0.0.1:3001`.
- [ ] Dữ liệu demo có sẵn: 4 video `demo-d06-*`. Nếu thiếu thì chạy:
      `TELEMETRY_URL=http://127.0.0.1:4318 TELEMETRY_TOKEN=<COLLECTOR_TOKEN> node telemetry/demo/seed-demo.mjs`
- [ ] Mở Grafana, dashboard **Video Telemetry**, đặt thời gian **Last 30 days**, phạm vi **Video hoàn tất**.
- [ ] (Tuỳ chọn, phần live) Studio chạy từ `baseline-upstream-2026-09-25` với `STUDIO_GATEWAY=9router`, 9router bật.
- [ ] Nói trước với khán giả: dữ liệu là **demo**, và giá ElevenLabs trong demo là **giả định** $0.30 / 1.000 credit.

## Kịch bản

| Phút | Màn hình | Nói gì |
|---|---|---|
| 0–1 | (không cần) | Vấn đề: làm video bằng AI tốn tiền ở nhiều chỗ (Claude, Codex, ElevenLabs, GPU), nhưng trước giờ không ai biết một video tốn bao nhiêu, và khi QA chê thì không biết lỗi do lượt AI nào. |
| 1–2 | Sơ đồ luồng bên dưới | Studio ghi event metadata vào outbox → collector → Postgres → Grafana. Codex đi qua 9router để có chi phí thật; Claude tự báo; ElevenLabs đọc bộ đếm credit. **Không gửi prompt hay nội dung.** |
| 2–4 | Hàng KPI | "**2 / 3** video đo đủ chi phí; chi phí TB **$2.00/video**." Nhấn mạnh: `demo-d06-v03` có một lượt không đo nên **bị loại khỏi trung bình**, không bị tính là $0. "khoảng **19%** chi phí là do làm lại": đây là tiền trả cho vòng sửa. |
| 4–6 | Chi phí / token / thời gian theo phase | Scenes đắt nhất (cả tiền lẫn token). Token chủ yếu là **cached input** (thanh xám), nên đây là chỗ tối ưu prompt/cache có lời nhất. Voice $0.78 chỉ tính video dùng ElevenLabs; Kaggle/local miễn phí nên để trống. |
| 6–7 | Chi phí theo nhà cung cấp + ô giọng nói | ElevenLabs, Codex, Claude trên cùng một thước đo. Credit ElevenLabs là số bị trừ **thật** trên tài khoản; GPU Kaggle tính bằng giây quota. |
| 7–8 | Từng video · theo phase + bảng theo mã video | Mỗi thanh một mã video. Cột "Đo chi phí" ghi `đủ`, hoặc `thiếu 1 run` cho `v03`. Chữ "không đo" khác với 0. |
| 8–10 | **Phiên bản & làm lại** | `demo-d06-v02-rag-basics`: v1 qua 2 vòng QA, render; hôm sau team QA góp ý nên có **v2**. Mỗi phiên bản có chi phí riêng, nên thấy ngay vòng feedback nào đắt. |
| 10–11 | **Truy vết feedback / QA → lượt AI** | Chọn dòng `user` của `v02`: lỗi nằm ở bản đã giao `scenes #3 · v1`. Có agent/model, session để resume đúng phiên, hash prompt; lượt sửa là `scenes #4`, kèm chi phí sửa. Nội dung góp ý xem trong Studio theo mã feedback. |
| 11–12 | (Tuỳ chọn) Studio live | Chạy một stage bằng Codex, chỉ vào dòng log `9router: N request · $x (quy đổi)`. Vài giây sau, video đó hiện lên dashboard. |

```text
Studio ─ ledger (runs/feedback) ─ outbox ─► collector ─► Postgres (views) ─► Grafana
  │ Codex ─► 9router (cost/request) ─┘ đối chiếu token, gán chi phí vào đúng lượt chạy
  │ Claude: total_cost_usd · ElevenLabs: bộ đếm credit trước/sau · Kaggle: thời gian GPU
```

## Câu hỏi hay gặp

- **Có gửi prompt hay nội dung không?** Không. Collector từ chối mọi field `prompt`, `content` hay `messages`. Log
  AI thô chỉ gửi khi người dùng tự bật, được mã hoá AES-256-GCM, và Grafana chỉ đếm số lượng log.
- **Chi phí Codex có phải tiền thật không?** Codex qua gói ChatGPT không tính tiền theo token. Số hiển thị là giá
  **quy đổi** theo bảng giá API do 9router tính. Nó dùng để so sánh và tối ưu, không phải hoá đơn.
- **Sao không ghi 0 cho phần miễn phí?** Vì trung bình sẽ bị kéo xuống. Phần miễn phí vẫn được ghi rõ ở bảng
  "Chi phí theo nguồn" với trạng thái `free`.
- **Token có bị đếm trùng khi gen lại không?** Từng bị: Codex `resume` báo token cộng dồn cả phiên. Lỗi này đã
  được sửa và đối chiếu khớp với 9router.
- **Muốn tham gia thì làm gì?** Thêm 3 biến vào `studio/.env` (xem `deploy/RUNBOOK.md` → "Cấp cho team"). 9router
  là tuỳ chọn: không bật thì Codex chạy thẳng, và chi phí Codex sẽ hiện "không đo".

## Nếu có sự cố khi trình bày

- Grafana trống: kiểm biến *Phạm vi* (chọn **Tất cả video**) và khoảng thời gian (**Last 30 days**).
- Phần live chậm: bỏ qua, và dùng dòng `user` của `demo-d06-v02` trong bảng truy vết để kể lại.
- Sau demo, xoá dữ liệu demo bằng lệnh ở `deploy/RUNBOOK.md` → "Dữ liệu demo".
