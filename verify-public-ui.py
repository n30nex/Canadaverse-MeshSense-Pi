#!/usr/bin/env python3
"""Small live check for the public MeshSense UI wrapper."""

import json
import re
from urllib.parse import urljoin
from urllib.request import Request, urlopen


BASE_URL = "https://meshmon.canadaverse.org/"
USER_AGENT = "Mozilla/5.0 MeshSenseUIProbe/1.0"


def fetch(path: str) -> str:
    request = Request(urljoin(BASE_URL, path), headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=10) as response:
        assert response.status == 200
        return response.read().decode("utf-8")


root = fetch("/")
assert "<title>MeshSense</title>" in root
assert 'src="/admin-login.js"' in root

wrapper = fetch("/admin-login.js")
assert "rcr-has-access-bar" in wrapper
assert "Admin controls" in wrapper
assert "serviceWorker.getRegistrations" in wrapper
assert "rcr-meshsense-map-view-v3" in wrapper
assert "rcr-meshsense-dark-theme-v1" in wrapper
assert "rcr-admin-only" in wrapper
assert "rcr-packet-pulse" in wrapper
assert "rcr-map-key" in wrapper
assert "meshsense:packet" in wrapper

asset_match = re.search(r'src="(/assets/[^"]+\.js)"', root)
assert asset_match
application = fetch(asset_match.group(1))
assert "tile.openstreetmap.org/{z}/{x}/{y}.png?meshsense=20260815-1" in application
assert "window.__rcrMeshMap" in application
assert '"stroke-color":"rgba(128,255,91,0.78)"' in application
assert "||[]),n[36].from]" in application
assert "||[]),o[36].from]" in application

cleanup_worker = fetch("/sw.js")
assert "registration.unregister" in cleanup_worker

print(json.dumps({
    "ui": "MeshSense",
    "access_bar": "ok",
    "map_default": "ok",
    "dark_theme": "ok",
    "read_only_ui": "ok",
    "packet_pulses": "ok",
    "known_links": "ok",
    "missing_route_guard": "ok",
    "tile_cache_bust": "ok",
    "worker_cleanup": "ok",
}))
