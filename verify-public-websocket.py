#!/usr/bin/env python3
"""Verify that the public MeshSense socket is live, redacted, and read-only."""

import asyncio
import json
from urllib.request import Request, urlopen

import websockets


HTTP_STATE = "https://meshmon.canadaverse.org/state"
WS_STATE = "wss://meshmon.canadaverse.org/ws"
WRITE_MARKER = "PUBLIC-WRITE-MUST-BE-IGNORED"
USER_AGENT = "Mozilla/5.0 MeshSenseReadOnlyProbe/1.0"


def fetch_state() -> dict:
    request = Request(HTTP_STATE, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=10) as response:
        return json.load(response)


def assert_redacted(state: dict) -> None:
    assert state.get("accessKey") == ""
    assert state.get("address") == ""
    assert state.get("apiHostname") == ""
    assert state.get("apiPort") == 0
    assert state.get("bluetoothDeviceList") == []
    assert state.get("lastFromRadio") is None
    assert all(not channel.get("settings", {}).get("psk") for channel in state.get("channels", []))
    assert all(
        "payload" not in packet.get("payloadVariant", {}).get("value", {})
        for packet in state.get("packets", [])
        if isinstance(packet.get("payloadVariant", {}).get("value"), dict)
    )
    safe_data_fields = {
        "$typeName", "hwModel", "id", "isLicensed", "longName", "macaddr",
        "publicKey", "role", "route", "shortName", "time", "variant",
    }
    for packet in state.get("packets", []):
        data = packet.get("data")
        if not isinstance(data, dict):
            continue
        assert set(data) <= safe_data_fields
        route = data.get("route")
        if route is not None:
            assert isinstance(route, list)
            assert len(route) <= 32
            assert all(isinstance(node_id, int) and not isinstance(node_id, bool) for node_id in route)


async def verify() -> None:
    before = fetch_state()
    assert_redacted(before)

    async with websockets.connect(
        WS_STATE,
        open_timeout=10,
        close_timeout=5,
        user_agent_header=USER_AGENT,
    ) as socket:
        init_state = None
        for _ in range(5):
            message = json.loads(await asyncio.wait_for(socket.recv(), timeout=10))
            if message.get("event") == "initState":
                init_state = message["data"]
                break
        assert init_state is not None
        assert_redacted(init_state)

        await socket.send(json.dumps({
            "event": "state",
            "data": {
                "name": "version",
                "action": "set",
                "args": [WRITE_MARKER],
            },
        }))
        await asyncio.sleep(1)

    after = fetch_state()
    assert after.get("version") == before.get("version")
    assert after.get("version") != WRITE_MARKER
    print(json.dumps({
        "websocket": "live",
        "redaction": "passed",
        "anonymous_mutation": "blocked",
        "nodes": len(after.get("nodes", [])),
        "connection": after.get("connectionStatus"),
    }))


if __name__ == "__main__":
    asyncio.run(verify())
