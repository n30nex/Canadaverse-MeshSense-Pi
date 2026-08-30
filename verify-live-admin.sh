#!/bin/sh
set -eu

env_file="${MESHSENSE_ENV_FILE:-/opt/canadaverse/meshsense/.env}"
base_url="${1:-https://meshmon.canadaverse.org}"
auth_file="$(mktemp /tmp/meshsense-curl-auth.XXXXXX)"
trap 'rm -f "$auth_file"' EXIT HUP INT TERM
chmod 600 "$auth_file"

set -a
. "$env_file"
set +a
: "${MESHSENSE_ACCESS_KEY:?Missing MESHSENSE_ACCESS_KEY}"
expected_radio="${MESHSENSE_RADIO_ADDRESS:-192.168.0.151}"
printf 'user = "admin:%s"\n' "$MESHSENSE_ACCESS_KEY" >"$auth_file"
unset MESHSENSE_ACCESS_KEY

login_result="$(curl --config "$auth_file" -sS -o /dev/null -w '%{http_code} %{redirect_url}' "$base_url/admin-login")"
test "$login_result" = "302 https://meshmon.canadaverse.org/" || {
  printf 'unexpected authenticated login result: %s\n' "$login_result" >&2
  exit 1
}

curl --config "$auth_file" -fsS "$base_url/state" \
  | jq -e --arg address "$expected_radio" \
      '(.accessKey | length) > 0 and (.address == $address) and (.connectionStatus == "connected")' \
  >/dev/null

set +e
websocket_code="$(curl --config "$auth_file" --http1.1 --max-time 2 -sS -o /dev/null -w '%{http_code}' \
  -H 'Connection: Upgrade' \
  -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  "$base_url/ws" 2>/dev/null)"
websocket_exit="$?"
set -e
test "$websocket_code" = "101"
test "$websocket_exit" -eq 0 || test "$websocket_exit" -eq 28

printf 'authenticated-login-ok\nfull-admin-state-ok\nadmin-websocket-upgrade-ok\n'
