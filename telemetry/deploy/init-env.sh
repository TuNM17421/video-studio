#!/usr/bin/env bash
# Runs ON the VM. Creates .env once, with secrets generated here — they never leave the VM.
# Values that only a person can supply (domain, DuckDNS token) are written as REPLACE_ME and block the deploy.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then echo ".env đã có — giữ nguyên."; exit 0; fi
umask 077
rand() { openssl rand -base64 "$1" | tr -d '\n/+=' | cut -c1-"$2"; }
cat > .env <<ENV
# Tạo bởi deploy/init-env.sh lúc $(date -u +%FT%TZ). File này là nguồn cấu hình duy nhất; không copy ra ngoài VM.
TELEMETRY_DOMAIN=REPLACE_ME.duckdns.org
EDGE_PORT=8444
TLS_MODE=duckdns
DUCKDNS_TOKEN=REPLACE_ME
POSTGRES_PASSWORD=$(rand 48 32)
COLLECTOR_TOKEN=$(rand 48 40)
GRAFANA_ADMIN_PASSWORD=$(rand 48 24)
# Retention là quyết định xoá dữ liệu có chủ đích — đổi số ngày ở đây rồi deploy lại.
EVENT_RETENTION_DAYS=365
AI_LOG_RETENTION_DAYS=30
AI_LOGS_ENABLED=false
AI_LOG_ENCRYPTION_KEY=
ENV
echo "Đã tạo .env (quyền 600). Điền TELEMETRY_DOMAIN và DUCKDNS_TOKEN rồi deploy lại."
