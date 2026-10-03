#!/usr/bin/env bash
set -euo pipefail

# Deploy stack telemetry lên VM dùng chung, theo khuôn Guidebook-Agent-Deploy (deploy_vm_local.sh):
# rsync source, KHÔNG copy .env, build + up đúng compose project `video-telemetry`, không restart stack khác,
# không bao giờ `docker compose down`. Chạy thử: --dry-run.

TELEMETRY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VM_HOST="${TELEMETRY_VM_HOST:?đặt TELEMETRY_VM_HOST (không có mặc định để tránh deploy nhầm máy)}"
VM_USER="${TELEMETRY_VM_USER:-p004deploy}"
VM_PORT="${TELEMETRY_VM_PORT:-22}"
VM_DIR="${TELEMETRY_VM_DIR:-/home/p004deploy/video-telemetry}"  # /opt thuộc root; user deploy không có sudo
SSH_KEY="${TELEMETRY_SSH_KEY:?đặt TELEMETRY_SSH_KEY (đường dẫn private key)}"
MIN_FREE_GB="${TELEMETRY_MIN_FREE_GB:-4}"
PROJECT="video-telemetry"
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help) sed -n 3,6p "$0"; exit 0 ;;
    *) echo "Tham số lạ: $arg" >&2; exit 2 ;;
  esac
done

SSH=(ssh -i "$SSH_KEY" -p "$VM_PORT" -o BatchMode=yes -o ConnectTimeout=15 "$VM_USER@$VM_HOST")
say() { printf '==> %s\n' "$*"; }
run() { printf '+ %s\n' "$*"; [ "$DRY_RUN" -eq 1 ] || "$@"; }

command -v rsync >/dev/null || { echo "Thiếu rsync" >&2; exit 1; }

say "Preflight trên $VM_USER@$VM_HOST (chỉ đọc)"
"${SSH[@]}" bash -s -- "$MIN_FREE_GB" <<'REMOTE'
set -euo pipefail
free_gb=$(df -BG --output=avail / | tail -1 | tr -dc 0-9)
echo "disk trống: ${free_gb}G · RAM khả dụng: $(free -h | awk '/Mem:/{print $7}')"
docker compose version >/dev/null
if [ "$free_gb" -lt "$1" ]; then
  echo "TỪ CHỐI: disk trống ${free_gb}G < $1G. Dọn disk trước (VM dùng chung, không tự xoá image của người khác)." >&2
  exit 1
fi
REMOTE

say "Đồng bộ source → $VM_DIR (loại .env, backups, dữ liệu local)"
run "${SSH[@]}" "mkdir -p '$VM_DIR' && chmod 750 '$VM_DIR'"
run rsync -az --delete \
  --exclude='.env' --exclude='.env.*' --exclude='backups/' --exclude='node_modules/' \
  -e "ssh -i '$SSH_KEY' -p $VM_PORT -o BatchMode=yes" \
  "$TELEMETRY_DIR/" "$VM_USER@$VM_HOST:$VM_DIR/"

if [ "$DRY_RUN" -eq 1 ]; then
  say "Dry-run: bỏ qua build/up. Các bước thật: init-env → kiểm .env → build → up -d → áp metrics.sql → smoke."
  exit 0
fi

say "Build + rollout project $PROJECT (không đụng container khác)"
"${SSH[@]}" bash -s -- "$VM_DIR" "$PROJECT" <<'REMOTE'
set -euo pipefail
cd "$1"; P="$2"; C=(docker compose -p "$P" -f docker-compose.prod.yml)
# Có reverse proxy dùng chung (network `caddy`) → nối collector/Grafana vào để đi qua :443.
if docker network inspect "${SHARED_PROXY_NETWORK:-caddy}" >/dev/null 2>&1; then C+=(-f docker-compose.shared-proxy.yml); echo "shared proxy network: bật"; fi
bash deploy/init-env.sh
if grep -q 'REPLACE_ME' .env; then
  echo "TỪ CHỐI: .env còn REPLACE_ME (TELEMETRY_DOMAIN/DUCKDNS_TOKEN). Sửa $1/.env trên VM rồi chạy lại." >&2
  exit 1
fi
"${C[@]}" config -q
# Giữ image collector đang chạy để rollback: <image>:rollback-<thời điểm>.
cur="$("${C[@]}" ps -q vt-collector 2>/dev/null || true)"
if [ -n "$cur" ]; then
  img="$(docker inspect -f '{{.Config.Image}}' "$cur")"
  tag="${img%:*}:rollback-$(date -u +%Y%m%dT%H%M%SZ)"
  docker tag "$(docker inspect -f '{{.Image}}' "$cur")" "$tag" && echo "rollback tag: $tag"
fi
"${C[@]}" build vt-collector edge
# --remove-orphans chỉ trong project này (container cũ tên collector/grafana trước khi đổi tên).
"${C[@]}" up -d --remove-orphans
for i in $(seq 1 40); do
  s="$(docker inspect -f '{{.State.Health.Status}}' "$("${C[@]}" ps -q vt-collector)" 2>/dev/null || true)"
  [ "$s" = healthy ] && break
  sleep 3
done
[ "$s" = healthy ] || { "${C[@]}" ps; "${C[@]}" logs --tail 100 vt-collector; exit 1; }
# init.sql/metrics.sql chỉ tự chạy khi volume mới; view phải áp lại mỗi lần đổi (idempotent, không đụng dữ liệu).
"${C[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -q -U telemetry -d telemetry < postgres/metrics.sql
"${C[@]}" ps
REMOTE

DOMAIN_PORT="$("${SSH[@]}" "cd '$VM_DIR' && grep -E '^(TELEMETRY_DOMAIN|EDGE_PORT)=' .env | cut -d= -f2 | paste -sd:")"
say "Smoke test https://$DOMAIN_PORT"
TELEMETRY_URL="https://$DOMAIN_PORT" bash "$TELEMETRY_DIR/deploy/smoke.sh"
say "Xong. Grafana: https://$DOMAIN_PORT (admin; mật khẩu nằm trong $VM_DIR/.env trên VM)."
