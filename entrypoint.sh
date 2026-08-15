#!/bin/sh
set -eu

# node-ble asks for a system bus even when MeshSense uses a Wi-Fi radio. Point
# that request at this container's isolated D-Bus session instead of exposing
# the Pi host's system bus.
export DBUS_SYSTEM_BUS_ADDRESS="${DBUS_SYSTEM_BUS_ADDRESS:-$DBUS_SESSION_BUS_ADDRESS}"

exec xvfb-run -a /opt/meshsense/AppRun \
  --headless \
  --no-sandbox \
  --disable-gpu \
  --in-process-gpu \
  --disable-software-rasterizer
