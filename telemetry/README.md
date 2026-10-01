# Telemetry local stack

Chỉ phục vụ test local. Collector và Grafana bind vào `127.0.0.1`; không có service nào được public ra mạng.

## Chạy

```bash
cd telemetry
cp .env.example .env
# Thay cả ba giá trị bằng secret local trước khi chạy.
docker compose up --build -d
```

- Collector health: `http://127.0.0.1:4318/health`
- Grafana: `http://127.0.0.1:3001` (user `admin`, password là `GRAFANA_ADMIN_PASSWORD`)

Collector nhận `POST /v1/events` với `Authorization: Bearer $COLLECTOR_TOKEN` và body
`{"events":[...]}`. Nó nhận tối đa 500 event/1 MiB, deduplicate bằng `event_id`, chỉ chấp nhận
`privacy.payload_class = metadata_only`, và từ chối field chứa prompt, message/content hoặc credential.

`postgres/init.sql` tạo bảng event; `postgres/metrics.sql` tạo lớp metrics mà dashboard đọc. Volume cũ (tạo
trước khi có `metrics.sql`) phải áp một lần — lệnh chỉ `CREATE OR REPLACE` view/function, chạy lại vô hại:

```bash
docker compose exec -T postgres psql -U telemetry -d telemetry < postgres/metrics.sql
```

## Metrics trên dashboard

| View | Một dòng là | Dùng cho |
|---|---|---|
| `telemetry_runs` | một run | phase, lượt (`attempt`), phiên bản, lý do chạy, token, chi phí + trạng thái đo, session/prompt |
| `telemetry_video_metrics` | một video | chi phí, token, thời gian, đo đủ hay thiếu, phiên bản, chi phí làm lại, ký tự/credit/GPU giọng nói |
| `telemetry_video_phase_metrics` | một (video, phase) | trung bình theo phase |
| `telemetry_version_metrics` | một (video, phiên bản) | gen lại nhiều lần: lượt làm lại, vòng feedback, chi phí mỗi phiên bản |
| `telemetry_feedback_trace` | một feedback | truy vết: lượt agent tạo ra lỗi → các lượt đã sửa |

- **Không đo ≠ 0.** Không đo được, hoặc miễn phí (Kaggle, model local, audio có sẵn: nguồn `no_charge`), là
  trống/NULL. Trung bình chỉ tính trên giá trị đo được; KPI chi phí TB chỉ tính **video đo đủ** (hiện "n / N").
- **Phase**: `script · cues · voice · scenes · render · deliver` (`scenes.qa` → `scenes`, `dry-run` → `cues`…);
  job cài đặt (`*-setup`) không tính vào video.
- **Gen lại**: `attempt` = lượt thứ mấy của stage; `version` = v1 tới lần render thành công đầu, rồi v2…;
  `trigger` = `initial · feedback · qa_fix · retry`.
- **Giọng nói**: ElevenLabs tính tiền tự động từ ký tự gửi đi × giá công khai của đúng model đang dùng
  (`studio/src/lib/server/pricing-catalog.ts`), không phải một số cố định cho mọi model; credit tài khoản
  (bộ đếm trước/sau) vẫn ghi lại để đối chiếu, không dùng để tính giá. Model chưa có trong bảng → để trống,
  không đoán. Kaggle ghi thời gian GPU. Local/nhập audio: miễn phí.
- **Truy vết QA**: feedback gửi lên chỉ là metadata (mã, cảnh, mã lỗi, mức, trạng thái, run liên quan); nội dung góp
  ý ở ledger local của Studio. Session + hash prompt của lượt gây lỗi giúp mở lại đúng phiên agent.
- Dashboard sinh từ `grafana/gen-dashboard.py`: sửa script rồi chạy
  `python3 grafana/gen-dashboard.py grafana/provisioning/dashboards/json/video-telemetry.json`.

Đồng bộ thủ công từ root repository (idempotent, gửi lại không double-count):

```bash
STUDIO_TELEMETRY_URL=http://127.0.0.1:4318 \
STUDIO_TELEMETRY_TOKEN='...' \
npm run telemetry:sync
```

Lệnh chỉ gửi metadata outbox. Thêm `STUDIO_TELEMETRY_AI_LOGS=1` và local encryption key mới cho phép
nó giải mã rồi gửi AI log opt-in; không có hai biến này, raw AI log không rời clone.

Để Studio tự sync sau mỗi job hoàn tất, bật `STUDIO_TELEMETRY_AUTO_SYNC=1` cùng
`STUDIO_TELEMETRY_URL` và `STUDIO_TELEMETRY_TOKEN`. Không có đủ ba biến này, Studio không mở network.

Biên nhận nằm ở `.studio/telemetry/sync-state.json` (`sentEventIds` cho event, `sentLogIds` cho AI log): đã
gửi rồi thì lần sau không gửi lại. Thứ máy chủ trả 4xx — dữ liệu sai, thử lại cũng vô ích — bị chuyển sang
`outbox.rejected.jsonl` / `ai-logs.rejected.jsonl` kèm lý do (AI log chỉ lưu `log_id`, không lưu nội dung) và
không bao giờ gửi lại; tab **Số liệu** gọi chúng là "Máy chủ từ chối", tách khỏi hàng "Chờ gửi". 401/403/429,
5xx hay mất mạng thì giữ nguyên để lần sau thử lại.

Retention chạy mỗi 6 giờ và mặc định **tắt** (`EVENT_RETENTION_DAYS=0`, `AI_LOG_RETENTION_DAYS=0`).
Trên VM phải đặt số ngày cụ thể, đặc biệt cho AI log; thay đổi policy là thao tác xóa dữ liệu có chủ đích.

## AI log tuỳ chọn

Mặc định `AI_LOGS_ENABLED=false`: collector từ chối `POST /v1/ai-logs`, và tooling không ghi transcript.
Khi người làm chủ động bật `STUDIO_TELEMETRY_AI_LOGS=1` cùng `STUDIO_TELEMETRY_AI_LOG_KEY` (base64, 32 bytes),
chỉ **Studio server** mới capture stream của agent stage và AI visual QA. CLI/outside Studio không có command ghi
AI log. Local outbox chỉ giữ AES-256-GCM ciphertext. Connector gửi plaintext qua HTTPS tới `/v1/ai-logs`; collector
chỉ nhận khi cả server đã bật AI log và request có explicit consent, rồi mã hóa AES-256-GCM trước khi lưu Postgres.
Grafana chỉ hiển thị số lượng log, không hiển thị nội dung.

Đổi `STUDIO_TELEMETRY_AI_LOG_KEY` thì các log mã hoá bằng key cũ không giải mã lại được: chúng bị chuyển sang
`ai-logs.rejected.jsonl` (chỉ `log_id` + lý do) và các log mới vẫn gửi bình thường. Còn key **sai độ dài** là
lỗi cấu hình của máy, không phải của log nào: cả chặng AI log dừng lại, không log nào bị loại, sửa biến rồi
sync lại là đi tiếp.

AI log có thể chứa nội dung nhạy cảm dù đã redaction một số token phổ biến. Chỉ opt-in khi người làm có quyền
chia sẻ nội dung đó; VM bắt buộc chạy HTTPS, giữ encryption key trong secret manager và đặt retention/RBAC trước
khi bật cho team.

## Dừng và dọn test local

```bash
docker compose down
```

Lệnh trên giữ volume để mở lại vẫn còn data. Chỉ dùng `docker compose down -v` khi muốn xoá toàn bộ
telemetry test local.
