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
            'publicKey', 'role', 'route', 'shortName', 'time', 'variant'
        ]);
        clean.data = Object.fromEntries(Object.entries(clean.data).filter(([key]) => safeFields.has(key)));
        if (Array.isArray(clean.data.route))
            clean.data.route = clean.data.route.filter(Number.isInteger).slice(0, 32);
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

bundle = replace_once(
    bundle,
    """        else if (e == 7) {
            connectionStatus.set('connected');
            // setTime()
            // } else if (e == 4) {
            // await disconnect()
        }
        else if (e == 2) {
""",
    """        else if (e == 7) {
            connectionStatus.set('connected');
            radioReconnectStartedAt = 0;
            setAutoTraceStatus({ lastError: '', skippedReason: '' });
        }
        else if (e == 4) {
            if (!radioReconnectStartedAt)
                radioReconnectStartedAt = Date.now();
            connectionStatus.set('reconnecting');
            if (connection instanceof HttpConnection) {
                for (const destination of pendingTraceroutes.value)
                    delete traceRouteLog[destination];
                pendingTraceroutes.set([]);
                queueProcessing = false;
                setAutoTraceStatus({
                    pending: 0,
                    skippedReason: 'disconnected',
                    lastError: 'radio-unreachable'
                });
            }
        }
        else if (e == 5 && connectionStatus.value == 'reconnecting' && connection instanceof HttpConnection) {
            const outageMs = radioReconnectStartedAt ? Date.now() - radioReconnectStartedAt : 0;
            radioReconnectStartedAt = 0;
            if (outageMs < 10000) {
                connectionStatus.set('connected');
                setAutoTraceStatus({ lastError: '', skippedReason: '' });
                return;
            }
            console.log('[meshtastic] HTTP transport restored, refreshing device configuration');
            try {
                await connection.configure();
            }
            catch (error) {
                console.error('[meshtastic] Device configuration refresh failed', String(error));
                setAutoTraceStatus({ lastError: 'reconfigure-failed' });
            }
        }
        else if (e == 2) {
""",
    "recover HTTP configuration after radio return",
)

bundle = replace_once(
    bundle,
    """let traceRouteLog = {};
let globalTracerouteRateLimitSec = 60;
if (tracerouteRateLimit.value < 15)
    tracerouteRateLimit.set(15);
let deviceConfig = {};
""",
    """let traceRouteLog = {};
function autoTraceNumber(name, fallback, minimum, maximum) {
    const value = Number(process.env[name]);
    return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}
const autoTraceConfig = Object.freeze({
    enabled: process.env.MESHSENSE_AUTO_TRACE_ENABLED !== '0',
    intervalSec: autoTraceNumber('MESHSENSE_AUTO_TRACE_INTERVAL_SECONDS', 60, 60, 600),
    nodeMinutes: autoTraceNumber('MESHSENSE_AUTO_TRACE_NODE_MINUTES', 45, 30, 1440),
    maxAgeMinutes: autoTraceNumber('MESHSENSE_AUTO_TRACE_MAX_AGE_MINUTES', 360, 30, 1440),
    radiusKm: autoTraceNumber('MESHSENSE_AUTO_TRACE_RADIUS_KM', 35, 1, 250),
    centerLat: autoTraceNumber('MESHSENSE_AUTO_TRACE_CENTER_LAT', 43.4516, -90, 90),
    centerLon: autoTraceNumber('MESHSENSE_AUTO_TRACE_CENTER_LON', -80.4925, -180, 180),
    maxQueue: autoTraceNumber('MESHSENSE_AUTO_TRACE_MAX_QUEUE', 6, 1, 12),
    maxNodes: autoTraceNumber('MESHSENSE_AUTO_TRACE_MAX_NODES', 48, 1, 100),
    maxChannelUtilization: autoTraceNumber('MESHSENSE_AUTO_TRACE_CHANNEL_UTIL_MAX', 18, 5, 90)
});
let globalTracerouteRateLimitSec = autoTraceConfig.intervalSec;
let radioReconnectStartedAt = 0;
if (tracerouteRateLimit.value !== autoTraceConfig.nodeMinutes)
    tracerouteRateLimit.set(autoTraceConfig.nodeMinutes);
if (automaticTraceroutes.value !== autoTraceConfig.enabled)
    automaticTraceroutes.set(autoTraceConfig.enabled);
let autoTraceStatus = new State('autoTraceStatus', {
    enabled: autoTraceConfig.enabled,
    eligible: 0,
    pending: 0,
    sent: 0,
    responses: 0,
    channelUtilization: 0,
    lastSweepAt: 0,
    lastQueuedAt: 0,
    lastSentAt: 0,
    lastResponseAt: 0,
    lastTarget: 0,
    lastResponseFrom: 0,
    lastError: '',
    skippedReason: 'starting',
    config: autoTraceConfig
}, { hideLog: true });
let deviceConfig = {};
""",
    "configure bounded automatic traceroutes",
)

bundle = replace_once(
    bundle,
    """let queueProcessing = false;
async function processTraceRoutes() {
    queueProcessing = true;
    let destination = pendingTraceroutes.value[0];
    console.log('[meshtastic] Sending Traceroute for', destination);
    packets.push({
        from: myNodeNum.value,
        to: destination,
        rxTime: Date.now() / 1000,
        channel: '',
        data: { $typeName: 'RouteRequest' }
    });
    connection.traceRoute(destination);
    pendingTraceroutes.shift();
    setTimeout(() => {
        pendingTraceroutes.value.length ? processTraceRoutes() : (queueProcessing = false);
    }, globalTracerouteRateLimitSec * 1000);
}
async function requestPosition(destination) {
""",
    """let queueProcessing = false;
function setAutoTraceStatus(changes) {
    autoTraceStatus.set({
        ...autoTraceStatus.value,
        ...changes,
        pending: pendingTraceroutes.value.length
    });
}
async function processTraceRoutes() {
    queueProcessing = true;
    if (connectionStatus.value !== 'connected') {
        for (const queued of pendingTraceroutes.value)
            delete traceRouteLog[queued];
        pendingTraceroutes.set([]);
        queueProcessing = false;
        setAutoTraceStatus({
            pending: 0,
            skippedReason: 'disconnected',
            lastError: 'radio-unreachable'
        });
        return;
    }
    let destination = pendingTraceroutes.value[0];
    if (!destination) {
        queueProcessing = false;
        setAutoTraceStatus({ pending: 0 });
        return;
    }
    console.log('[meshtastic] Sending Traceroute for', destination);
    packets.push({
        from: myNodeNum.value,
        to: destination,
        rxTime: Date.now() / 1000,
        channel: '',
        data: { $typeName: 'RouteRequest' }
    });
    try {
        await connection.traceRoute(destination);
        setAutoTraceStatus({
            sent: autoTraceStatus.value.sent + 1,
            lastSentAt: Date.now(),
            lastTarget: destination,
            lastError: ''
        });
    }
    catch (error) {
        delete traceRouteLog[destination];
        console.error('[meshtastic] Traceroute send failed', destination, String(error));
        setAutoTraceStatus({ lastError: 'send-failed' });
    }
    pendingTraceroutes.shift();
    setAutoTraceStatus({});
    setTimeout(() => {
        pendingTraceroutes.value.length ? processTraceRoutes() : (queueProcessing = false);
    }, globalTracerouteRateLimitSec * 1000);
}
function autoTraceDistanceKm(latitude, longitude) {
    const earthRadiusKm = 6371;
    const toRadians = (degrees) => degrees * Math.PI / 180;
    const latitudeDelta = toRadians(latitude - autoTraceConfig.centerLat);
    const longitudeDelta = toRadians(longitude - autoTraceConfig.centerLon);
    const value = Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos(toRadians(autoTraceConfig.centerLat)) * Math.cos(toRadians(latitude)) *
        Math.sin(longitudeDelta / 2) ** 2;
    return 2 * earthRadiusKm * Math.asin(Math.sqrt(value));
}
function autoTraceChannelUtilization() {
    const node = getMyNode();
    const values = [
        node?.localStats?.channelUtilization,
        node?.deviceMetrics?.channelUtilization
    ].map(Number).filter(Number.isFinite);
    return values.length ? Math.max(...values) : 0;
}
function automaticTraceCandidates(now) {
    const cutoff = now / 1000 - autoTraceConfig.maxAgeMinutes * 60;
    const minimumAge = autoTraceConfig.nodeMinutes * 60000;
    const queued = new Set(pendingTraceroutes.value);
    return nodes.value
        .filter((node) => {
        const latitude = Number(node?.position?.latitudeI) / 10000000;
        const longitude = Number(node?.position?.longitudeI) / 10000000;
        return Number.isInteger(node?.num) &&
            node.num > 0 &&
            node.num !== myNodeNum.value &&
            node.num !== broadcastId &&
            node.viaMqtt !== true &&
            Number(node.lastHeard || 0) >= cutoff &&
            Number.isFinite(latitude) && latitude !== 0 &&
            Number.isFinite(longitude) && longitude !== 0 &&
            autoTraceDistanceKm(latitude, longitude) <= autoTraceConfig.radiusKm &&
            !queued.has(node.num) &&
            (!traceRouteLog[node.num] || now - traceRouteLog[node.num] >= minimumAge);
    })
        .sort((left, right) => {
        const missingTrace = Number(!right.trace) - Number(!left.trace);
        if (missingTrace)
            return missingTrace;
        const oldestTrace = (traceRouteLog[left.num] || 0) - (traceRouteLog[right.num] || 0);
        if (oldestTrace)
            return oldestTrace;
        return Number(right.lastHeard || 0) - Number(left.lastHeard || 0);
    })
        .slice(0, autoTraceConfig.maxNodes);
}
function runAutomaticTraceSweep() {
    const now = Date.now();
    const channelUtilization = autoTraceChannelUtilization();
    const candidates = automaticTraceCandidates(now);
    const baseStatus = {
        enabled: autoTraceConfig.enabled && automaticTraceroutes.value,
        eligible: candidates.length,
        channelUtilization,
        lastSweepAt: now
    };
    if (!baseStatus.enabled) {
        setAutoTraceStatus({ ...baseStatus, skippedReason: 'disabled' });
        return;
    }
    if (connectionStatus.value !== 'connected') {
        setAutoTraceStatus({ ...baseStatus, skippedReason: 'disconnected' });
        return;
    }
    if (channelUtilization >= autoTraceConfig.maxChannelUtilization) {
        setAutoTraceStatus({ ...baseStatus, skippedReason: 'channel-busy' });
        return;
    }
    const capacity = Math.max(0, autoTraceConfig.maxQueue - pendingTraceroutes.value.length);
    const selected = candidates.slice(0, capacity);
    for (const node of selected)
        traceRoute(node.num);
    setAutoTraceStatus({
        ...baseStatus,
        lastQueuedAt: selected.length ? now : autoTraceStatus.value.lastQueuedAt,
        skippedReason: selected.length ? '' : (capacity ? 'no-eligible-nodes' : 'queue-full')
    });
    if (selected.length)
        console.log('[meshtastic] Automatic traceroute sweep queued', selected.length, 'local nodes');
}
const autoTraceSweepTimer = setInterval(runAutomaticTraceSweep, autoTraceConfig.intervalSec * 1000);
autoTraceSweepTimer.unref?.();
const autoTraceStartupTimer = setTimeout(runAutomaticTraceSweep, 30000);
autoTraceStartupTimer.unref?.();
async function requestPosition(destination) {
""",
    "add local automatic traceroute scheduler",
)

bundle = replace_once(
    bundle,
    """        if (e.from && data) {
            let node = nodes.upsert({ num: e.from, trace: data });
""",
    """        if (e.from && data) {
            setAutoTraceStatus({
                responses: autoTraceStatus.value.responses + 1,
                lastResponseAt: Date.now(),
                lastResponseFrom: e.from
            });
            let node = nodes.upsert({ num: e.from, trace: data });
""",
    "record automatic traceroute responses",
)

bundle_path.write_text(bundle, encoding="utf-8")

index = index_path.read_text(encoding="utf-8")
index = replace_once(
    index,
    "<title>MeshSense</title>",
    "<title>Canadaverse Signal Watch · Live Mesh</title>",
    "brand page title",
)
index = replace_once(
    index,
    '<link rel="icon" type="image/x-icon" href="/favicon.ico" />',
    '<link rel="icon" type="image/svg+xml" href="/canadaverse-emblem.svg" />',
    "brand favicon",
)
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
    (
        '[n[36].to,...(r=(s=n[36])==null?void 0:s.data)==null?void 0:r.route,n[36].from]',
        '[n[36].to,...(((r=(s=n[36])==null?void 0:s.data)==null?void 0:r.route)||[]),n[36].from]',
        "guard initial route arrays",
    ),
    (
        '[o[36].to,...(c=(a=o[36])==null?void 0:a.data)==null?void 0:c.route,o[36].from]',
        '[o[36].to,...(((c=(a=o[36])==null?void 0:a.data)==null?void 0:c.route)||[]),o[36].from]',
        "guard updated route arrays",
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
