#!/usr/bin/env python3
"""Wait for one safe public packet update from a positioned node."""

import asyncio
import json

import websockets


WS_URL = "wss://meshmon.canadaverse.org/ws"
USER_AGENT = "Mozilla/5.0 MeshSensePacketPulseProbe/1.0"


def positioned_nodes(state: dict) -> set[int]:
    result = set()
    for node in state.get("nodes", []):
        position = node.get("position") or node.get("approximatePosition") or {}
        if position.get("latitudeI") or position.get("latitude"):
            result.add(node.get("num"))
    return result


async def verify() -> None:
    async with websockets.connect(
        WS_URL,
        open_timeout=10,
        close_timeout=5,
        user_agent_header=USER_AGENT,
    ) as socket:
        state = None
        while state is None:
            message = json.loads(await asyncio.wait_for(socket.recv(), timeout=10))
            if message.get("event") == "initState":
                state = message.get("data") or {}

        known = positioned_nodes(state)
        unpositioned = 0
        deadline = asyncio.get_running_loop().time() + 120
        while asyncio.get_running_loop().time() < deadline:
            timeout = deadline - asyncio.get_running_loop().time()
            message = json.loads(await asyncio.wait_for(socket.recv(), timeout=timeout))
            data = message.get("data") or {}
            if message.get("event") != "state" or data.get("name") != "packets":
                continue

            packets = (data.get("args") or [[]])[0]
            if not packets:
                continue
            packet = max(packets, key=lambda item: item.get("rxTime") or 0)
            source = packet.get("from")
            if source not in known:
                unpositioned += 1
                continue
            print(json.dumps({
                "packet_event": "live",
                "source_position_known": True,
                "transport": "mqtt" if packet.get("viaMqtt") else "rf",
                "raw_payload_exposed": "payload" in (packet.get("payloadVariant", {}).get("value") or {}),
                "unpositioned_events_skipped": unpositioned,
            }))
            return

    raise SystemExit("no positioned packet event received within 120 seconds")


if __name__ == "__main__":
    asyncio.run(verify())
