#!/usr/bin/env bash
# Kiểm từ ngoài vào, KHÔNG ghi dữ liệu: health, từ chối request không token, Grafana đòi đăng nhập.
# Dùng: TELEMETRY_URL=https://x.duckdns.org:8444 bash telemetry/deploy/smoke.sh   (thêm CURL_INSECURE=1 khi TLS internal)
set -uo pipefail
URL="${TELEMETRY_URL:?đặt TELEMETRY_URL}"
K=(); [ "${CURL_INSECURE:-0}" = 1 ] && K=(-k)
fail=0
check() { if [ "$2" = "$3" ]; then echo "PASS $1 ($3)"; else echo "FAIL $1: muốn $2, nhận $3"; fail=1; fi; }
check "collector health" 200 "$(curl -s ${K[@]+"${K[@]}"} -o /dev/null -w '%{http_code}' "$URL/health")"
check "ingest không token bị từ chối" 401 "$(curl -s ${K[@]+"${K[@]}"} -o /dev/null -w '%{http_code}' -X POST "$URL/v1/events" -H 'content-type: application/json' -d '{"events":[]}')"
check "Grafana chuyển tới login" 302 "$(curl -s ${K[@]+"${K[@]}"} -o /dev/null -w '%{http_code}' "$URL/")"
check "Grafana không cho xem ẩn danh" 401 "$(curl -s ${K[@]+"${K[@]}"} -o /dev/null -w '%{http_code}' "$URL/api/search")"
hsts="$(curl -s ${K[@]+"${K[@]}"} -D - -o /dev/null "$URL/health" | grep -ci '^strict-transport-security')"
check "HSTS header" 1 "$hsts"
exit $fail
