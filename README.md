# MeshSense Docker on Raspberry Pi 5

This wrapper runs [Affirmatech MeshSense](https://github.com/Affirmatech/MeshSense)'s
official ARM64 AppImage in supported headless mode. The downloaded artifact is
pinned by SHA-256, the LAN UI is on port 8080, and application state persists
in a named Docker volume.

```sh
cp .env.example .env
# Replace the placeholder in .env with a long random value.
docker compose up -d --build
docker compose ps
```

The two containers are intentionally small in scope: MeshSense talks to the
radio, while Caddy enforces public read-only access and protects admin routes
with HTTP Basic authentication. Container logs rotate automatically.

Open `http://PI_ADDRESS:8080/` for the real MeshSense interface in enforced
read-only public mode. The configured Meshtastic Wi-Fi radio address is
`192.168.0.150`. The Canadaverse dark map shows lime links only for known
direct neighbours or completed traceroutes. Live packets from positioned nodes
pulse lime for RF and cyan for MQTT; hop-count-only packets do not invent relay
paths. Select **Admin controls** for full controls; the username is
`admin` and the password is the `MESHSENSE_ACCESS_KEY` value from the root-only
`.env` file. The public state feed redacts the access key, channel PSKs, local
radio address, Bluetooth scan results, and raw packet payloads.

Useful checks:

```sh
python3 verify-public-ui.py
docker compose ps
docker compose logs --tail=50
```

To stop the service without deleting its data:

```sh
docker compose down
```
