# MeshSense Docker on Raspberry Pi 5

This wrapper runs Affirmatech MeshSense's official ARM64 AppImage in supported
headless mode. The downloaded artifact is pinned by SHA-256, the LAN UI is on
port 8080, and application state persists in a named Docker volume.

```sh
cp .env.example .env
# Replace the placeholder in .env with a long random value.
docker compose up -d --build
docker compose ps
```

Open `http://PI_ADDRESS:8080/` for Canadaverse Signal Watch: the real MeshSense
interface with a branded, live packet and node-status layer in enforced
read-only public mode. The configured Meshtastic Wi-Fi radio address is
`192.168.0.151`. The Canadaverse dark map shows lime links only for known
direct neighbours or completed traceroutes. Live packets from positioned nodes
pulse lime for RF and cyan for MQTT; hop-count-only packets do not invent relay
paths. Select **Admin controls** for full controls; the username is
`admin` and the password is the `MESHSENSE_ACCESS_KEY` value from the root-only
`.env` file. The public state feed redacts the access key, channel PSKs, local
radio address, Bluetooth scan results, and raw packet payloads.

The Canadaverse build also sweeps recently heard, positioned RF nodes within
35 km of Kitchener. It queues at most six traceroutes, sends one per minute,
revisits a node after 45 minutes, and pauses above 18% channel utilization.
`autoTraceStatus` in `/state` reports the live queue, sends, responses, and
pause reason. MQTT-only and stale nodes are never targeted. If the Wi-Fi radio
drops off the network, MeshSense pauses and clears unsent traceroutes instead
of displaying them as traffic. When the same radio returns, MeshSense refreshes
its device configuration and resumes without rebooting the radio or container.

To stop the service without deleting its data:

```sh
docker compose down
```
