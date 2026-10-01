#!/usr/bin/env bash
# Runs ON the VM (cron gợi ý: 15 2 * * *). Dump nén hằng ngày, giữ KEEP bản gần nhất.
set -euo pipefail
cd "$(dirname "$0")/.."
KEEP="${KEEP:-14}"
mkdir -p backups && chmod 700 backups
out="backups/telemetry-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
# Ghi ra file tạm rồi mới đổi tên: dump hỏng không bao giờ để lại một "bản backup" rỗng.
docker compose -p "${TELEMETRY_PROJECT:-video-telemetry}" -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U telemetry -d telemetry | gzip > "$out.part"
gzip -t "$out.part" && [ "$(gzip -cd "$out.part" | head -c 100 | wc -c)" -gt 0 ] || { rm -f "$out.part"; echo "backup HỎNG" >&2; exit 1; }
mv "$out.part" "$out" && chmod 600 "$out"
ls -1t backups/telemetry-*.sql.gz | tail -n +$((KEEP + 1)) | xargs -r rm -f
echo "backup: $out ($(du -h "$out" | cut -f1))"
