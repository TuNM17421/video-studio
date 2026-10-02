# Thu chi phí agent qua 9router — thiết kế

Trạng thái (26/09/2026): **đã code trong Studio, tuỳ chọn theo máy (mặc định TẮT)**; kiểm chứng với 9router + Codex thật.

## Vì sao cần

Claude CLI tự báo `total_cost_usd`; Codex và Antigravity không báo. Dashboard vì vậy chỉ có cận dưới
(độ phủ chi phí < 100%). 9router là gateway local: mọi request đi qua nó được ghi token + cost vào
`~/.9router/db/data.sqlite`, bảng `usageHistory`.

## Luồng

```text
Studio job (run_id, startedAt..finishedAt)
  └─ codex exec --profile 9router ──► 9router :20128 ──► provider (Codex OAuth / Claude Code …)
                                          └─ usageHistory(timestamp, apiKey, model, tokens, cost)
finishRun ──► đọc usageHistory của đúng apiKey trong cửa sổ run ──► addRunMetrics(costSource: gateway_reported)
          ──► outbox ──► collector ──► dashboard (không đổi gì)
```

## Đã kiểm chứng trên máy Thái

- `codex exec --profile 9router` chạy OK (codex-cli 0.157.1, model `cx/gpt-5.6-luna`).
- Một lượt Codex = 2 request trong 9router; **tổng khớp đúng** số `turn.completed` của CLI:
  input 43 316, cached 18 432, output 159. Cost 9router: $0.0280.
- 9router **không lưu header tuỳ biến** (`x-run-id` → `meta = {}`), nhưng **lưu API key** của từng request.
- API `/api/usage/*` cần đăng nhập dashboard (không nhận API key) → Studio đọc SQLite **read-only**.
- Key riêng `video-studio` (26/09): lọc `usageHistory` theo key + cửa sổ thời gian của lượt chạy ra đúng 4 request,
  khớp tuyệt đối `turn.completed` (input 88 182 · cached 62 464 · output 414), cost $0.0351; không lẫn với `Default Key`.
- **Claude Code không kết nối được vào 9router** (Thái thử 26/09). Claude giữ nguồn `provider_reported` từ
  `total_cost_usd` của CLI; 9router chỉ phủ Codex (và provider khác nếu kết nối được).

## Setup cho mỗi người (mỗi máy)

1. Cài 9router, mở dashboard `http://127.0.0.1:20128`, kết nối provider mình dùng (Codex OAuth; tuỳ chọn Claude Code).
2. Tạo **một API key riêng tên `video-studio`** trong 9router. Key riêng là điều kiện để gắn đúng chi phí:
   Codex dùng tay hay việc khác của người đó đi bằng key khác nên không lẫn vào video.
3. Tạo `~/.codex/9router.config.toml` (Codex ≥ 0.157 bắt buộc profile ở file riêng, không để trong `config.toml`):

   ```toml
   model_provider = "ninerouter"
   model = "cx/gpt-5.6-luna"

   [model_providers.ninerouter]
   name = "9router"
   base_url = "http://127.0.0.1:20128/v1"
   env_key = "NINEROUTER_API_KEY"
   wire_api = "responses"
   ```
4. Bật trong `studio/.env` (đã gitignore, không chứa secret): `STUDIO_GATEWAY=9router`.
   Tuỳ chọn: `STUDIO_GATEWAY_KEY_NAME` (mặc định `video-studio`), `STUDIO_CODEX_PROFILE` (mặc định `9router`).
5. Chạy một bước Studio bằng Codex; log job phải có dòng `9router: N request · $x (quy đổi)`. Đó là phép kiểm setup.

**Không muốn đi qua 9router** → để trống `STUDIO_GATEWAY`: Codex chạy thẳng như trước, chi phí Codex là `unavailable`.

## Phạm vi và cách gắn chi phí (đã code: `studio/src/lib/server/gateway.ts`)

- Chỉ các lượt Studio UI chạy để làm video: stage agent (`runAgent`) và visual QA bằng Codex. Research, images,
  CLI tools, Codex dùng tay: luôn đi thẳng.
- Studio tra key theo **tên** trong DB 9router (read-only) và chỉ đưa key vào env của tiến trình Codex con.
- Model cấu hình không có prefix được thêm `cx/` (`STUDIO_GATEWAY_MODEL_PREFIX` đổi được).
- 9router bật nhưng không phản hồi (probe `/v1/models`, 1,5 s) → chạy thẳng, log nói rõ, job không hỏng.
- Hết lượt: chờ 3 s cho 9router ghi xong, cộng `usageHistory` của key trong cửa sổ run → `gateway_reported`.
  Trạng thái ghi vào `runs.jsonl` (`gatewayStatus`): `ok` · `mismatch` (token lệch CLI, vẫn giữ cost) ·
  `overlap` (run khác chồng cửa sổ cùng key → không gán cost, không đoán) · `no_requests` · `error`
  (schema lạ/không đọc được, không bao giờ làm hỏng job).

## Lưu ý khi đọc số

- Codex qua **ChatGPT subscription** không tính tiền theo token: cost 9router là **giá quy đổi theo bảng giá
  API**, không phải hoá đơn. Dashboard nên gọi là "chi phí quy đổi".
- Mỗi người có 9router riêng → chi phí thu ở từng máy rồi đi chung đường telemetry outbox/collector hiện có;
  không ai cần mở 9router ra mạng.
