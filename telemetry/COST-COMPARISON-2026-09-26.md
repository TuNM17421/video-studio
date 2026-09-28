# So sánh: `do-chi-phi-video.xlsx` (đo tay) vs telemetry dashboard

Nguồn: `~/Downloads/do-chi-phi-video.xlsx` (2 video thật `test-chi-phi-1/2`, đo qua `npm run cost`/`.studio/cost.json`
— công cụ này không có trong 3 checkout mình đang giữ, nên không tái hiện được từ log thô; so sánh dưới đây dựa
trên đọc kỹ công thức + ghi chú trong file, rồi đối chiếu với chính source code Studio).

**Không so được số cuối cùng trực tiếp**: hai bảng đo hai video khác nhau (`test-chi-phi-*` chưa từng chạy qua
hệ thống telemetry của mình). So sánh dưới đây là **so phương pháp**, không phải so kết quả.

## 1. Đã sửa — thời gian máy chạy bị đếm trùng (lỗi thật, đã xác minh bằng code)

Ghi chú của bảng: *"ĐỪNG cộng cột Thời gian: các lượt lồng nhau — job scenes bọc cả scenes.gate và scenes.qa."*
Đọc lại `studio/src/lib/server/agent.ts`/`qa.ts` xác nhận đúng: `runAgent` mở run `scenes`, rồi **trong khi run đó
còn đang mở**, gọi `runSceneQa` → mở/đóng run `scenes.gate` rồi `scenes.qa`, sau đó mới đóng run `scenes`. Ba run
này lồng vào nhau theo thời gian thực.

`telemetry_video_metrics.active_s` (bản trước) tính bằng `sum(duration_ms)` — cộng thẳng cả ba dòng, nên đếm
đúng đoạn lồng nhau đó 2–3 lần. Bảng excel tránh được vì đo tay bằng hợp khoảng thời gian.

**Đã sửa** (`postgres/metrics.sql`, view `telemetry_active_islands`): hợp các khoảng `[started_at, finished_at]`
chồng/lồng nhau thành khoảng rời nhau trước khi cộng, dùng chung cho `active_s` (video + theo phase) và `agent_s`.
**Kiểm bằng dữ liệu giả lập đúng hệt kiểu lồng thật** (scenes 0–100s bọc gate 40–50s và qa 60–90s):

| | Trước (cộng thẳng) | Sau (hợp khoảng) |
|---|---|---|
| active_s | 140 | **100** ✓ |
| agent_s | 130 | **100** ✓ |

Đã áp lên cả Postgres local và production, restart Grafana để nạp dashboard mới.

## 2. Đã thêm — USD/phút (yêu cầu của bạn)

Bảng excel có cột "USD / phút" tính từ "Thời lượng (giây)" điền tay. Dashboard trước chỉ có "chi phí / video" —
không so được video dài ngắn khác nhau công bằng.

**Đã thêm**: `render.ts` đọc `duration_sec` từ `manifest.json` (ffprobe đo MP4 thật, đối chiếu với giọng đọc lúc
render — **đo, không ước tính**) → ghi vào telemetry của run `render` → view `telemetry_video_metrics.usd_per_minute`
= chi phí / (độ dài / 60), chỉ tính khi **cả chi phí lẫn độ dài đều đã biết** (không đo thì để trống, không suy ra 0).
Dashboard: KPI mới **"Chi phí / phút TB"** đặt lên đầu hàng, cột **"USD/phút"** + **"Độ dài (giây)"** trong bảng theo
mã video.

## 3. Giá ElevenLabs — ĐÃ SỬA (26/09, cùng đợt)

Bảng excel giá **theo đúng model** đã dùng mỗi lượt: `eleven_v3` = $0,10/1.000 ký tự, `eleven_turbo_v2_5`/Flash =
$0,05/1.000 ký tự (tra giá công bố ngày 26/09). Hệ thống trước đó dùng **một số duy nhất**
(`STUDIO_ELEVENLABS_USD_PER_1K_CREDITS`) cho mọi model — sai theo hướng nào đó tuỳ model đang dùng lệch bao xa.

**Đã đổi** sang đúng cách bảng excel làm: `studio/src/lib/server/pricing-catalog.ts` — bảng giá theo model
(nguồn: elevenlabs.io/pricing/api, tra 26/09/2026), nhân với ký tự gửi đi. Model chưa có trong bảng → chi phí để
trống, không đoán theo giá model khác. Credit tài khoản vẫn ghi lại (để đối chiếu), không còn dùng để tính giá —
tránh đúng lỗi cũ: giá ElevenLabs quy đổi từ credit sang $ vốn không công khai và có thể khác nhau giữa các model.
Dashboard có thêm bảng "Model theo nhà cung cấp" để thấy model nào đang dùng, giá bao nhiêu, và model nào CLI/bảng
giá chưa đo được ("Run chưa đo giá" > 0).

## 4. Đã đối chiếu và KHỚP — không cần sửa

- **Chi phí Claude**: cả hai bên đều dùng **`total_cost_usd` Claude Code tự báo** (không tự tính lại từ token).
  Bảng excel tự đối chứng lại bằng công thức tay (token × giá Opus 5 công bố: $5 input / $25 output / $0,5 cache
  đọc / $10 cache ghi TTL-1h mỗi 1M token) và **khớp tới 4 chữ số** — kiểm lại phép tính này bằng chính số trong
  bảng (lượt `cues` video 1: 44×5 + 2.180.522×0,5 + 133.380×10 + 46.851×25 = 3.595.556 → $3,595556, đúng bằng ô
  Chi phí). Đây là bằng chứng độc lập cho thấy phương pháp "tin số CLI tự báo" của mình đáng tin.
- **Nền vs vòng sửa QA**: bảng excel tách "lượt đầu mỗi chặng" (nền) khỏi "lượt #2 trở đi" (vòng sửa). Hệ thống
  của mình đã có sẵn khái niệm tương đương và chi tiết hơn: `attempt` (lượt thứ mấy) + `trigger`
  (`initial`/`feedback`/`qa_fix`/`retry`) trên từng run, cộng `rework_cost_usd` sẵn trên dashboard.

## 5. Vì sao bảng excel ra $11,98/phút mà demo trên dashboard chỉ ~$0,35/phút

Đây là **hai bộ dữ liệu khác nhau**, không phải hai cách đo cho cùng một video:

- Bảng excel là 2 video **thật**, dùng **Claude Opus 5 `[1m]`** ghim sẵn (`studio/.env`) cho cả dựng cảnh lẫn QA.
  Riêng phase `scenes` của video 1 tốn **$85,25 / $95,34 tổng (89%)** — một lượt dựng cảnh đọc lại tới **83 triệu
  token cache** (cửa sổ ngữ cảnh 1 triệu token, đọc lại nhiều lần qua các lượt).
- Dashboard demo dùng **dữ liệu giả lập** (dựng riêng để tập trình bày), số token nhỏ hơn nhiều bậc và giá Codex
  tự đặt cho demo — **chưa từng chạy `test-chi-phi-1/2` qua hệ thống của mình**.

Kết luận: chưa có bằng chứng hệ thống của mình đo rẻ hơn thực tế. Muốn so trực tiếp, cần chạy chính hai video đó
(hoặc video tương đương) qua Studio với `STUDIO_GATEWAY`/telemetry đang bật.

## Việc cần bạn quyết

1. Có muốn đổi giá ElevenLabs sang bảng theo model (mục 3) không?
2. Có muốn chạy một video thật bằng Claude Opus `[1m]` qua telemetry để có số đối chứng trực tiếp với bảng excel không?
