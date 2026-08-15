#!/bin/sh
set -eu

: "${MESHSENSE_ADMIN_PASSWORD:?Missing MeshSense admin password}"
MESHSENSE_ADMIN_HASH="$(caddy hash-password --plaintext "$MESHSENSE_ADMIN_PASSWORD")"
export MESHSENSE_ADMIN_HASH
unset MESHSENSE_ADMIN_PASSWORD

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
