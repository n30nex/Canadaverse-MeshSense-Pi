#!/usr/bin/env python3
"""Verify the public automatic-traceroute status without transmitting."""

import json
import sys
import urllib.request


url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8080/state"
with urllib.request.urlopen(url, timeout=10) as response:
    state = json.load(response)

status = state.get("autoTraceStatus") or {}
config = status.get("config") or {}
assert state.get("connectionStatus") == "connected"
assert state.get("automaticTraceroutes") is True
assert state.get("tracerouteRateLimit") == 45
assert status.get("enabled") is True
assert status.get("lastSweepAt", 0) > 0
assert 0 <= status.get("pending", -1) <= config.get("maxQueue", -1) == 6
assert config.get("intervalSec") == 60
assert config.get("radiusKm") == 35
assert config.get("maxAgeMinutes") == 360

print(
    json.dumps(
        {
            "connection": state["connectionStatus"],
            "eligible": status.get("eligible"),
            "pending": status.get("pending"),
            "sent": status.get("sent"),
            "responses": status.get("responses"),
            "channelUtilization": status.get("channelUtilization"),
            "skippedReason": status.get("skippedReason"),
        },
        sort_keys=True,
    )
)
