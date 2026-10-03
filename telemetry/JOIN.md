# Đẩy dữ liệu của bạn lên dashboard chung

Dashboard: **https://video-telemetry.duckdns.org**. Xin tài khoản Viewer từ Thái.

Mỗi lần một job của Studio chạy xong, Studio tự gửi **metadata** (token, chi phí, thời gian, feedback) lên collector.
Việc gửi không bao giờ làm chậm hay làm hỏng job: collector tắt thì dữ liệu nằm chờ trong outbox và được gửi lại lần sau.

## Cài đặt (5 phút, một lần cho mỗi máy)

1. **Cập nhật code** Studio lên bản có telemetry, rồi `npm install` nếu có thay đổi dependency.
2. **Khai báo trong `studio/.env`**. File này đã được gitignore; tạo mới nếu chưa có:

   ```bash
   STUDIO_TELEMETRY_URL=https://video-telemetry.duckdns.org
   STUDIO_TELEMETRY_TOKEN=<token nhận riêng từ Thái — không dán vào chat nhóm, không commit>
   STUDIO_TELEMETRY_AUTO_SYNC=1
   STUDIO_MACHINE_LABEL=<tên-bạn>          # để so sánh giữa các máy, ví dụ "an-macbook"
   ```

   Tuỳ chọn, để có thêm chi phí Codex:
   - `STUDIO_GATEWAY=9router`: Codex đi qua 9router để có chi phí. Cách setup ở `GATEWAY-9ROUTER.md`. Không bật thì
     chi phí Codex hiện "không đo".

   Chi phí ElevenLabs tự tính theo giá công khai của đúng model đang dùng — không cần cấu hình gì thêm.
3. **Khởi động lại Studio**: `npm run studio`.


## Gửi dữ liệu cũ (tuỳ chọn)

Các video đã làm trước khi cài vẫn nằm trong outbox local. Gửi một lần từ thư mục gốc repo. Lệnh idempotent: gửi lại
nhiều lần cũng không bị đếm trùng.

```bash
STUDIO_TELEMETRY_URL=https://video-telemetry.duckdns.org STUDIO_TELEMETRY_TOKEN='<token>' npm run telemetry:sync
```

Kết quả dạng `{"events":N,"inserted":…,"duplicate":…}` là đã gửi thành công.

## Kiểm tra

- Chạy xong một bước bất kỳ, sau vài giây, mã video của bạn xuất hiện trong ô chọn **Video** trên dashboard.
  Chọn phạm vi **Tất cả video** để thấy cả video chưa render xong.
- Không thấy video: xem log job trong Studio có dòng `Telemetry sync thất bại` không.
  - `401`: token sai.
  - Không kết nối được: kiểm URL hoặc mạng.
  - Dữ liệu vẫn nằm trong `.studio/telemetry/outbox.jsonl`, lần sync sau sẽ tự gửi.

## Gửi những gì, không gửi những gì

- **Gửi:** mã video, phase, provider/model, token, chi phí kèm nguồn, thời gian, lượt/phiên bản, và metadata feedback
  (mã lỗi, cảnh, mức độ, trạng thái).
- **Không gửi:** prompt, kịch bản, nội dung góp ý, API key. Collector từ chối mọi field `prompt`, `content` hay `messages`.
- Log AI thô (transcript) là tuỳ chọn riêng và hiện đang **tắt** trên server.
