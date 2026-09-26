# Runbook — Video telemetry trên VM

Stack: Postgres + collector + Grafana nằm sau một Caddy riêng (`edge`). Tất cả chạy trong compose project
`video-telemetry`, được dựng theo khuôn của Guidebook-Agent-Deploy: rsync source, không copy `.env`, không
restart stack của người khác, không bao giờ `docker compose down`.

```text
Studio (máy từng người) ──HTTPS :8444──► edge (Caddy, cert Let's Encrypt qua DuckDNS DNS-01)
                                           ├─ /v1/events, /v1/ai-logs, /health → collector → Postgres
                                           └─ mọi đường khác                    → Grafana (bắt đăng nhập)
```

Chỉ `edge` mở cổng. Postgres, collector và Grafana không có cổng nào ra host.

## Trước lần đầu

1. **Domain**: tạo subdomain DuckDNS (ví dụ `video-telemetry.duckdns.org`) trỏ về IP của VM, lấy token.
2. **Cổng**: mở `8444/tcp` ở firewall/security group của VM. Cổng 80/443 thuộc `minute_caddy`, không dùng.
3. **Disk**: script từ chối deploy nếu disk trống dưới `TELEMETRY_MIN_FREE_GB` (mặc định 4 GB). Bản build đầu
   cần khoảng 1 GB image.

## Deploy

```bash
cd baseline-upstream-2026-09-25
export TELEMETRY_VM_HOST=<ip> TELEMETRY_SSH_KEY=<đường dẫn key>   # user mặc định p004deploy, thư mục /home/p004deploy/video-telemetry (`/opt` thuộc root, user deploy không có sudo)
bash telemetry/deploy/deploy_vm.sh --dry-run
bash telemetry/deploy/deploy_vm.sh
```

- Lần chạy đầu tạo `/home/p004deploy/video-telemetry/.env` **ngay trên VM**, với secret sinh bằng `openssl`, rồi dừng lại
  vì còn `REPLACE_ME`. SSH vào VM, điền `TELEMETRY_DOMAIN` và `DUCKDNS_TOKEN`, rồi chạy lại.
- Mỗi lần deploy: build → `up -d` → chờ collector `healthy` → áp lại `postgres/metrics.sql` (chỉ đụng view,
  không đụng dữ liệu) → chạy `smoke.sh` từ ngoài vào. Smoke gồm: health 200, ingest không token → 401,
  Grafana → 302 tới login, API Grafana ẩn danh → 401, và có header HSTS.
- Retention mặc định là event 365 ngày, AI log 30 ngày (`.env`). Đổi retention là quyết định xoá dữ liệu.

## Cấp cho team

Mỗi máy Studio thêm vào `studio/.env` (gitignored):

```bash
STUDIO_TELEMETRY_URL=https://video-telemetry.duckdns.org
STUDIO_TELEMETRY_TOKEN=<COLLECTOR_TOKEN trong .env của VM>   # gửi qua kênh riêng, không dán vào chat nhóm
STUDIO_TELEMETRY_AUTO_SYNC=1
STUDIO_GATEWAY=9router          # tuỳ chọn, xem ../GATEWAY-9ROUTER.md
```

Grafana: đăng nhập bằng `admin` / `GRAFANA_ADMIN_PASSWORD`, rồi tạo tài khoản Viewer cho từng người
(Administration → Users). Không chia sẻ tài khoản admin.

## Vận hành

```bash
ssh <user>@<vm>
cd /home/p004deploy/video-telemetry
C="docker compose -p video-telemetry -f docker-compose.prod.yml"
$C ps
$C logs --tail 200 collector edge
bash deploy/backup.sh      # dump nén vào backups/ và giữ 14 bản gần nhất
# cron gợi ý (crontab -e):  15 2 * * * cd /home/p004deploy/video-telemetry && bash deploy/backup.sh >> backups/cron.log 2>&1
```

**Khôi phục** (đã thử khôi phục vào DB tạm lúc kiểm tra):

```bash
gzip -cd backups/<file>.sql.gz | $C exec -T postgres psql -U telemetry -d telemetry
```

**Rollback collector**: mỗi lần deploy, image cũ được gắn tag `rollback-<thời điểm>` (script in ra tag).

```bash
docker tag <image>:rollback-<thời điểm> <image>:latest && $C up -d collector
```

**Gỡ hẳn**: `$C stop && $C rm`. Volume dữ liệu vẫn giữ lại; chỉ `docker volume rm` khi thật sự muốn xoá.

**Dữ liệu demo**: `node telemetry/demo/seed-demo.mjs` (cần `TELEMETRY_URL` và `TELEMETRY_TOKEN`). Xoá bằng:
`$C exec -T postgres psql -U telemetry -d telemetry -c "DELETE FROM telemetry_events WHERE video_ref LIKE 'demo-%'"`.

## Đã kiểm chứng (26/09/2026)

Đã chạy nguyên stack production ở máy local với `TLS_MODE=internal`:
- `init-env.sh` sinh `.env` với quyền 600.
- Smoke 5/5 PASS.
- Caddy có module `dns.providers.duckdns`.
- Gửi event qua HTTPS: vào DB.
- Backup ra file dump thật; khôi phục vào DB tạm thành công.
- Toàn bộ 22 query của dashboard chạy không lỗi trên dữ liệu demo.

**Production (26/09/2026)**: đã deploy lên `14.225.168.28` với project `video-telemetry` tại
`/home/p004deploy/video-telemetry`.
- Cert Let's Encrypt thật cho `video-telemetry.duckdns.org`, hết hạn 25/12/2026; Caddy tự gia hạn qua DNS-01.
- Smoke 5/5 PASS khi chạy từ VM; 10 view và dashboard đã provision.
- Cả stack dùng khoảng 120 MB RAM; P-004 health vẫn 200.
- **Đường truy cập thật (từ 26/09)**: `https://video-telemetry.duckdns.org` qua `minute_caddy` trên cổng 443.
  Block route nằm cuối `/opt/minute/minute/infra/Caddyfile` (backup `Caddyfile.bak-20260926-111131-vt`), trỏ vào
  `vt-collector:4318` / `vt-grafana:3000` trên network `caddy` (`docker-compose.shared-proxy.yml`).
  Smoke 5/5 PASS từ ngoài vào; 7 domain khác giữ nguyên mã trả về so với trước khi sửa.
- Edge riêng ở cổng `:8444` vẫn chạy (cert riêng qua DNS-01) làm đường dự phòng, nhưng VNPT chưa mở cổng này.
- Lúc setup, 3 secret đầu tiên từng bị in ra log. Chúng đã được sinh lại trước khi có container hay volume nào,
  nên các giá trị cũ không còn tác dụng.
