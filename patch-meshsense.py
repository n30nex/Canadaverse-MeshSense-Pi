#!/usr/bin/env python3
"""Apply narrow, fail-closed public-read-only patches to MeshSense beta."""

from pathlib import Path
import sys


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one source match, found {count}")
    return text.replace(old, new, 1)


if len(sys.argv) != 3:
    raise SystemExit("usage: patch-meshsense.py API_BUNDLE STATIC_INDEX")

bundle_path = Path(sys.argv[1])
index_path = Path(sys.argv[2])
bundle = bundle_path.read_text(encoding="utf-8")

bundle = replace_once(
    bundle,
    """            socket['remoteAddress'] = remoteAddress;
            socket.on('message', (message) => {
""",
    """            socket['remoteAddress'] = remoteAddress;
            socket['isAdmin'] = request.headers['x-meshsense-admin'] === '1';
            socket.on('message', (message) => {
""",
    "mark WebSocket privilege",
)

bundle = replace_once(
    bundle,
    """                this.clients.forEach(function each(client) {
                    if (client != options.skip && client.readyState === WebSocket.OPEN)
                        client.send(message);
                });
""",
    """                this.clients.forEach(function each(client) {
                    if (options.adminOnly && !client['isAdmin'])
                        return;
                    if (options.publicOnly && client['isAdmin'])
                        return;
                    if (client != options.skip && client.readyState === WebSocket.OPEN)
                        client.send(message);
                });
""",
    "filter WebSocket broadcasts",
)

bundle = replace_once(
    bundle,
    """let server$1;
let wss;
async function initSever() {
""",
    """let server$1;
let wss;
const publicHiddenStates = new Set([
    'accessKey',
    'address',
    'apiHostname',
    'apiPort',
    'bluetoothDeviceList',
    'lastFromRadio'
]);
function cloneStateValue(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}
function sanitizePublicPacket(packet) {
    let clean = cloneStateValue(packet);
    if (!clean || typeof clean !== 'object')
        return clean;
    if (clean.payloadVariant?.value && typeof clean.payloadVariant.value === 'object')
        delete clean.payloadVariant.value.payload;
    if (clean.data && typeof clean.data === 'object') {
        const safeFields = new Set([
            '$typeName', 'hwModel', 'id', 'isLicensed', 'longName', 'macaddr',
            'publicKey', 'role', 'shortName', 'time', 'variant'
        ]);
        clean.data = Object.fromEntries(Object.entries(clean.data).filter(([key]) => safeFields.has(key)));
    }
    return clean;
}
function publicStateValue(name, value) {
    if (name === 'accessKey' || name === 'address' || name === 'apiHostname')
        return '';
    if (name === 'apiPort')
        return 0;
    if (name === 'bluetoothDeviceList')
        return [];
    if (name === 'lastFromRadio')
        return null;
    let clean = cloneStateValue(value);
    if (name === 'channels' && Array.isArray(clean)) {
        clean.forEach((channel) => {
            if (channel?.settings)
                channel.settings.psk = {};
        });
    }
    if (name === 'packets' && Array.isArray(clean))
        clean = clean.map(sanitizePublicPacket);
    return clean;
}
function getPublicStateData() {
    return Object.values(State.states).reduce((obj, current) => {
        obj[current.name] = publicStateValue(current.name, current.value);
        return obj;
    }, {});
}
function isAdminRequest(req) {
    return req.headers['x-meshsense-admin'] === '1';
}
async function initSever() {
""",
    "add public state sanitizer",
)

bundle = replace_once(
    bundle,
    """    State.subscribe(({ state, action, args }) => {
        wss.send('state', { name: state.name, action, args }, { skip: state.flags.socket });
    });
""",
    """    State.subscribe(({ state, action, args }) => {
        wss.send('state', { name: state.name, action, args }, {
            skip: state.flags.socket,
            adminOnly: true
        });
        if (publicHiddenStates.has(state.name))
            return;
        const replaceWholeValue = state.name === 'channels' || state.name === 'packets';
        wss.send('state', {
            name: state.name,
            action: replaceWholeValue ? 'set' : action,
            args: replaceWholeValue ? [publicStateValue(state.name, state.value)] : args
        }, { publicOnly: true });
    });
""",
    "split public and admin state updates",
)

bundle = replace_once(
    bundle,
    """    wss.msg.on('state', ({ name, action, args }, socket) => {
        State.states[name].flags.socket = socket;
""",
    """    wss.msg.on('state', ({ name, action, args }, socket) => {
        if (!socket['isAdmin'] || !State.states[name])
            return;
        State.states[name].flags.socket = socket;
""",
    "block anonymous WebSocket state changes",
)

bundle = replace_once(
    bundle,
    """    wss.on('connection', (socket) => {
        wss.send('initState', State.getStateData(), { to: socket });
    });
""",
    """    wss.on('connection', (socket) => {
        const state = socket['isAdmin'] ? State.getStateData() : getPublicStateData();
        wss.send('initState', state, { to: socket });
    });
""",
    "sanitize anonymous WebSocket initialization",
)

bundle = replace_once(
    bundle,
    """    app.get('/state', (_, res) => res.json(State.getStateData()));
""",
    """    app.get('/state', (req, res) => res.json(isAdminRequest(req) ? State.getStateData() : getPublicStateData()));
""",
    "sanitize anonymous HTTP state",
)

bundle = replace_once(
    bundle,
    """    app.get('/installUpdate', (req, res) => {
        parentPort?.postMessage({ event: 'installUpdate' });
""",
    """    app.get('/installUpdate', (req, res) => {
        if (!isAuthorized(req))
            return res.sendStatus(403);
        parentPort?.postMessage({ event: 'installUpdate' });
""",
    "protect install update",
)

bundle = replace_once(
    bundle,
    """    app.get('/checkUpdate', (req, res) => {
        parentPort?.postMessage({ event: 'checkUpdate' });
""",
    """    app.get('/checkUpdate', (req, res) => {
        if (!isAuthorized(req))
            return res.sendStatus(403);
        parentPort?.postMessage({ event: 'checkUpdate' });
""",
    "protect check update",
)

bundle = replace_once(
    bundle,
    """function isAuthorized(req) {
    let token = req.headers['authorization']?.split(' ')[1];
    console.log('Remote Address', req.socket.remoteAddress);
    return (req.socket.remoteAddress.includes('127.0.0.1') ||
        req.socket.remoteAddress.includes('ffff') ||
        req.socket.remoteAddress.includes('localhost') ||
        req.socket.remoteAddress.includes('::1') ||
        (accessKey.value != '' && accessKey.value == token));
}
""",
    """function isAuthorized(req) {
    let token = req.headers['authorization']?.split(' ')[1];
    let remoteAddress = req.socket.remoteAddress;
    console.log('Remote Address', remoteAddress);
    return (isAdminRequest(req) ||
        ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remoteAddress) ||
        (accessKey.value != '' && accessKey.value == token));
}
""",
    "remove broad IPv4-mapped authorization",
)

bundle = replace_once(
    bundle,
    """    app.post('/send', (req, res) => {
        if (!allowRemoteMessaging.value && !isAuthorized(req))
            return res.sendStatus(403);
""",
    """    app.post('/send', (req, res) => {
        if (!isAuthorized(req))
            return res.sendStatus(403);
""",
    "require admin for send",
)

for route, label in (
    ("traceRoute", "protect traceroute"),
    ("requestPosition", "protect position request"),
):
    bundle = replace_once(
        bundle,
        f"""    app.post('/{route}', async (req, res) => {{
        let destination = req.body.destination;
""",
        f"""    app.post('/{route}', async (req, res) => {{
        if (!isAuthorized(req))
            return res.sendStatus(403);
        let destination = req.body.destination;
""",
        label,
    )

for route, value in (("consoleLog", "consoleLog"), ("deviceConfig", "deviceConfig")):
    bundle = replace_once(
        bundle,
        f"""    app.get('/{route}', async (req, res) => {{
        if (req.query.accessKey != accessKey.value && req.hostname.toLowerCase() != 'localhost')
            return res.sendStatus(403);
        return res.json({value});
""",
        f"""    app.get('/{route}', async (req, res) => {{
        if (!isAuthorized(req))
            return res.sendStatus(403);
        return res.json({value});
""",
        f"protect {route}",
    )

bundle_path.write_text(bundle, encoding="utf-8")

index = index_path.read_text(encoding="utf-8")
index = replace_once(
    index,
    """  </body>
""",
    """    <script src="/admin-login.js"></script>
  </body>
""",
    "inject admin login control",
)
index_path.write_text(index, encoding="utf-8")

tile_url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
versioned_tile_url = f"{tile_url}?meshsense=20260815-1"
asset_patches = (
    (
        tile_url,
        versioned_tile_url,
        "version OpenStreetMap tiles",
    ),
    (
        '"stroke-width":4,"stroke-color":"rgba(50,50,150, 0.6)"',
        '"stroke-width":3,"stroke-color":"rgba(128,255,91,0.78)"',
        "brighten known RF route lines",
    ),
    (
        's=new ab({controls:Ad().extend([new E]),target:i}),s.setView',
        's=new ab({controls:Ad().extend([new E]),target:i}),window.__rcrMeshMap=s,s.setView',
        "expose the live OpenLayers map",
    ),
    (
        'ia.on("upsert",n=>{var e;Yh(zs)&&((e=n[0].message)!=null&&e.show)&&Ip.play()});',
        'ia.on("upsert",n=>{var e;window.dispatchEvent(new CustomEvent("meshsense:packet",{detail:n[0]})),Yh(zs)&&((e=n[0].message)!=null&&e.show)&&Ip.play()});ia.on("set",n=>{let e=Array.isArray(n[0])?n[0].reduce((t,i)=>(i.rxTime??0)>(t?.rxTime??0)?i:t,void 0):void 0,t=e&&(e.id??`${e.from}-${e.rxTime}`);e&&t!==window.__rcrLastPacketId&&(window.__rcrLastPacketId=t,window.dispatchEvent(new CustomEvent("meshsense:packet",{detail:e}))) });',
        "publish sanitized live packet events",
    ),
)
patch_counts = {label: 0 for _, _, label in asset_patches}
for asset_path in sorted((index_path.parent / "assets").glob("*.js")):
    asset = asset_path.read_text(encoding="utf-8")
    changed = False
    for old, new, label in asset_patches:
        count = asset.count(old)
        if not count:
            continue
        asset = asset.replace(old, new)
        patch_counts[label] += count
        changed = True
    if changed:
        asset_path.write_text(asset, encoding="utf-8")

for label, count in patch_counts.items():
    if count == 0:
        raise SystemExit(f"{label}: expected at least one source match")
