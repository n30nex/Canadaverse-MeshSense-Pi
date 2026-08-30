(() => {
  const resetLegacyMapView = () => {
    const migrationKey = 'rcr-meshsense-map-view-v3';
    const defaultCenter = [-80.2482, 43.5448];

    try {
      if (localStorage.getItem(migrationKey) === 'done') return;

      // Seed a valid local view before MeshSense mounts. Older clients could
      // persist latitude/longitude in the opposite order, while a new client
      // can mount before the radio position arrives and start with no center.
      localStorage.setItem('mapCenter', JSON.stringify(defaultCenter));
      localStorage.setItem('mapZoom', '10');
      localStorage.setItem(migrationKey, 'done');
    } catch (error) {
      console.warn('Unable to reset the legacy map view', error);
    }
  };

  const enableCanadaverseTheme = () => {
    const migrationKey = 'rcr-meshsense-dark-theme-v1';

    try {
      if (localStorage.getItem(migrationKey) === 'done') return;
      localStorage.setItem('darkMode', 'true');
      localStorage.setItem(migrationKey, 'done');
    } catch (error) {
      console.warn('Unable to enable the dark map theme', error);
    }
  };

  const removeLegacyServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (!registrations.length) return;

      const controlled = Boolean(navigator.serviceWorker.controller);
      const removed = await Promise.all(registrations.map((registration) => registration.unregister()));
      const reloadKey = 'meshsense-legacy-worker-cleared';
      if (controlled && removed.some(Boolean) && !sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
      }
    } catch (error) {
      console.warn('Unable to remove legacy service worker', error);
    }
  };

  const installStyles = () => {
    if (document.getElementById('rcr-access-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'rcr-access-styles';
    styles.textContent = `
      body.rcr-has-access-bar {
        background: #03080d !important;
        color: #f4f8ff !important;
        display: flex !important;
        flex-direction: column !important;
        font-family: Aptos, "Segoe UI Variable Text", "SF Pro Text", Roboto, Arial, sans-serif !important;
        overflow: hidden !important;
      }
      body.rcr-has-access-bar #app {
        flex: 1 1 auto !important;
        height: auto !important;
        min-height: 0 !important;
      }
      #rcr-access {
        align-items: center;
        background:
          radial-gradient(circle at 22% 0%, rgba(65, 223, 255, .12), transparent 30%),
          linear-gradient(100deg, rgba(5, 11, 18, .99), rgba(7, 21, 32, .98));
        border-bottom: 1px solid rgba(32, 224, 194, .58);
        box-sizing: border-box;
        color: #f4f8ff;
        display: flex;
        flex: 0 0 64px;
        font: 600 13px/1.2 Aptos, "Segoe UI Variable Text", sans-serif;
        gap: 18px;
        height: 64px;
        justify-content: space-between;
        isolation: isolate;
        order: -1;
        padding: 0 16px;
        position: relative;
        width: 100%;
        z-index: 2147483647;
      }
      #rcr-access::before {
        background:
          repeating-linear-gradient(90deg, transparent 0 72px, rgba(65, 223, 255, .035) 73px 74px),
          linear-gradient(90deg, transparent, rgba(156, 255, 56, .055), transparent);
        content: "";
        inset: 0;
        pointer-events: none;
        position: absolute;
        z-index: -1;
      }
      #rcr-access::after {
        animation: rcr-scan 7s linear infinite;
        background: linear-gradient(90deg, transparent, #41dfff, #9cff38, transparent);
        bottom: -1px;
        content: "";
        height: 2px;
        left: -30%;
        opacity: .8;
        position: absolute;
        width: 30%;
      }
      #rcr-access .rcr-brand {
        align-items: center;
        color: #f4f8ff;
        display: flex;
        flex: 0 1 300px;
        gap: 10px;
        min-width: 0;
        text-decoration: none;
      }
      #rcr-access .rcr-emblem {
        filter: drop-shadow(0 0 9px rgba(65, 223, 255, .32));
        flex: 0 0 42px;
        height: 42px;
        width: 42px;
      }
      #rcr-access .rcr-brand-copy {
        display: grid;
        gap: 2px;
        min-width: 0;
      }
      #rcr-access .rcr-brand-copy strong {
        font-family: "Arial Narrow", "Aptos Narrow", "Segoe UI Variable Display", sans-serif;
        font-size: 18px;
        font-stretch: condensed;
        font-weight: 850;
        letter-spacing: -.02em;
        line-height: 1;
      }
      #rcr-access .rcr-brand-copy span {
        color: #8fa8b8;
        font-size: 11px;
        font-weight: 650;
        letter-spacing: .08em;
        overflow: hidden;
        text-overflow: ellipsis;
        text-transform: uppercase;
        white-space: nowrap;
      }
      #rcr-access .rcr-liveboard {
        align-items: center;
        background: rgba(8, 24, 34, .76);
        border: 1px solid rgba(65, 223, 255, .25);
        border-radius: 10px;
        box-shadow: inset 0 0 0 1px rgba(156, 255, 56, .035);
        display: grid;
        flex: 1 1 390px;
        gap: 10px;
        grid-template-columns: auto minmax(110px, 1fr) auto;
        max-width: 520px;
        min-width: 260px;
        padding: 7px 10px;
      }
      #rcr-access .rcr-signal-bars {
        align-items: end;
        display: flex;
        gap: 2px;
        height: 22px;
      }
      #rcr-access .rcr-signal-bars i {
        animation: rcr-signal 1.15s ease-in-out infinite alternate;
        background: #9cff38;
        border-radius: 2px 2px 0 0;
        box-shadow: 0 0 7px rgba(156, 255, 56, .5);
        display: block;
        height: 35%;
        width: 4px;
      }
      #rcr-access .rcr-signal-bars i:nth-child(2) { animation-delay: -.8s; height: 62%; }
      #rcr-access .rcr-signal-bars i:nth-child(3) { animation-delay: -.35s; height: 95%; }
      #rcr-access .rcr-live-copy {
        display: grid;
        gap: 1px;
        min-width: 0;
      }
      #rcr-access .rcr-live-label {
        color: #41dfff;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: .14em;
      }
      #rcr-access .rcr-live-title,
      #rcr-access .rcr-live-meta {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #rcr-access .rcr-live-title {
        color: #f4f8ff;
        font-size: 12px;
      }
      #rcr-access .rcr-live-meta {
        color: #8fa8b8;
        font-size: 10px;
        font-weight: 500;
      }
      #rcr-access .rcr-node-stat {
        border-left: 1px solid rgba(65, 223, 255, .18);
        color: #9cff38;
        font-size: 10px;
        font-weight: 750;
        letter-spacing: .04em;
        padding-left: 10px;
        white-space: nowrap;
      }
      #rcr-access .rcr-liveboard.is-live {
        border-color: rgba(156, 255, 56, .52);
      }
      #rcr-access .rcr-liveboard.is-stale .rcr-signal-bars i {
        animation: none;
        background: #ff5e5b;
        box-shadow: 0 0 7px rgba(255, 94, 91, .35);
      }
      #rcr-access .rcr-controls {
        align-items: center;
        display: flex;
        flex: 0 0 auto;
        gap: 9px;
      }
      #rcr-access .rcr-status {
        align-items: center;
        color: #c4d3df;
        display: flex;
        gap: 6px;
        white-space: nowrap;
      }
      #rcr-access .rcr-dot {
        background: #9cff38;
        border-radius: 50%;
        box-shadow: 0 0 9px rgba(156, 255, 56, .72);
        height: 7px;
        width: 7px;
      }
      #rcr-access details {
        position: relative;
      }
      #rcr-access summary {
        color: #66e5cf;
        cursor: pointer;
        list-style: none;
        padding: 8px 2px;
        white-space: nowrap;
      }
      #rcr-access summary::-webkit-details-marker {
        display: none;
      }
      #rcr-access .rcr-access-card {
        background: rgba(8, 18, 29, .98);
        border: 1px solid rgba(65, 223, 255, .3);
        border-radius: 9px;
        box-shadow: 0 14px 34px rgba(0, 0, 0, .45);
        box-sizing: border-box;
        color: #cfdae5;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.45;
        padding: 12px;
        position: absolute;
        right: 0;
        top: 48px;
        width: min(420px, calc(100vw - 24px));
      }
      #rcr-access .rcr-access-card p {
        margin: 0 0 8px;
      }
      #rcr-access .rcr-access-card p:last-child {
        margin-bottom: 0;
      }
      #rcr-access .rcr-login {
        background: #9cff38;
        border: 1px solid #9cff38;
        border-radius: 9px;
        color: #071018;
        padding: 9px 12px;
        text-decoration: none;
        white-space: nowrap;
      }
      #rcr-access[data-mode="admin"] .rcr-login {
        background: rgba(32, 215, 186, .16);
        color: #66e5cf;
      }
      #app .rcr-admin-only {
        cursor: not-allowed !important;
        filter: grayscale(1) !important;
        opacity: .3 !important;
      }
      #app,
      #app main {
        background: #040a10 !important;
      }
      #app main {
        color: #c4d3df !important;
      }
      #app h2 {
        background: linear-gradient(135deg, #040a10, #081822) !important;
        border-bottom: 1px solid rgba(32, 215, 186, .42) !important;
        color: #edf4ff !important;
      }
      #app [class~="bg-blue-300/10"] {
        background: rgba(8, 24, 34, .82) !important;
        box-shadow: inset 0 0 0 1px rgba(32, 215, 186, .3) !important;
        color: #edf4ff !important;
      }
      #app [class~="bg-black/10"] {
        background: rgba(8, 16, 25, .78) !important;
      }
      #app .input,
      #app select {
        background: #081019 !important;
        border-color: rgba(65, 223, 255, .28) !important;
        color: #edf4ff !important;
      }
      #app .btn {
        border-color: rgba(65, 223, 255, .3) !important;
      }
      #app .btn-active {
        background: #9cff38 !important;
        border-color: #9cff38 !important;
        color: #07100b !important;
      }
      #app .ol-control {
        background: rgba(8, 16, 25, .78) !important;
      }
      #app .ol-control button {
        background: #081822 !important;
        color: #edf4ff !important;
      }
      #app .ol-attribution {
        background: rgba(4, 10, 16, .82) !important;
        color: #91a9b8 !important;
      }
      #app .ol-attribution a {
        color: #66e5cf !important;
      }
      .rcr-packet-layer {
        inset: 0;
        overflow: hidden;
        pointer-events: none;
        position: absolute;
        z-index: 20;
      }
      .rcr-map-key {
        align-items: center;
        background: rgba(4, 10, 16, .86);
        border: 1px solid rgba(65, 223, 255, .22);
        border-radius: 7px;
        bottom: 8px;
        color: #c9d8e5;
        display: flex;
        font-size: 11px;
        gap: 12px;
        left: 8px;
        padding: 6px 8px;
        pointer-events: none;
        position: absolute;
        z-index: 21;
      }
      .rcr-map-key span {
        align-items: center;
        display: flex;
        gap: 5px;
      }
      .rcr-map-swatch {
        background: #9cff38;
        border-radius: 50%;
        box-shadow: 0 0 7px rgba(156, 255, 56, .7);
        height: 7px;
        width: 7px;
      }
      .rcr-map-swatch.mqtt {
        background: #41dfff;
        box-shadow: 0 0 7px rgba(65, 223, 255, .7);
      }
      .rcr-map-swatch.link {
        border-radius: 0;
        height: 2px;
        width: 14px;
      }
      .rcr-packet-pulse {
        border: 2px solid #9cff38;
        border-radius: 50%;
        box-shadow: 0 0 12px rgba(156, 255, 56, .9);
        height: 14px;
        margin: -7px 0 0 -7px;
        position: absolute;
        width: 14px;
      }
      .rcr-packet-pulse::after {
        animation: rcr-packet-wave 1.8s ease-out forwards;
        border: 2px solid rgba(156, 255, 56, .9);
        border-radius: 50%;
        content: "";
        inset: -2px;
        position: absolute;
      }
      .rcr-packet-pulse[data-transport="mqtt"] {
        border-color: #41dfff;
        box-shadow: 0 0 12px rgba(65, 223, 255, .9);
      }
      .rcr-packet-pulse[data-transport="mqtt"]::after {
        border-color: rgba(65, 223, 255, .9);
      }
      @keyframes rcr-packet-wave {
        0% { opacity: 1; transform: scale(.4); }
        100% { opacity: 0; transform: scale(4.6); }
      }
      @keyframes rcr-scan {
        to { transform: translateX(430%); }
      }
      @keyframes rcr-signal {
        0% { opacity: .45; transform: scaleY(.55); }
        100% { opacity: 1; transform: scaleY(1); }
      }
      @media (max-width: 1040px) {
        #rcr-access .rcr-brand-copy span,
        #rcr-access summary {
          display: none;
        }
        #rcr-access .rcr-brand {
          flex-basis: 180px;
        }
        #rcr-access .rcr-liveboard {
          max-width: none;
        }
      }
      @media (max-width: 760px) {
        #rcr-access .rcr-status,
        #rcr-access .rcr-node-stat {
          display: none;
        }
        #rcr-access .rcr-liveboard {
          grid-template-columns: auto minmax(90px, 1fr);
        }
      }
      @media (max-width: 560px) {
        #rcr-access {
          flex-basis: 54px;
          gap: 7px;
          height: 54px;
          padding: 0 7px;
        }
        #rcr-access .rcr-brand {
          flex: 0 0 auto;
          gap: 6px;
        }
        #rcr-access .rcr-emblem {
          flex-basis: 34px;
          height: 34px;
          width: 34px;
        }
        #rcr-access .rcr-brand-copy strong {
          font-size: 14px;
        }
        #rcr-access .rcr-liveboard {
          background: transparent;
          border: 0;
          box-shadow: none;
          flex-basis: 120px;
          min-width: 80px;
          padding: 4px 2px;
        }
        #rcr-access .rcr-live-label,
        #rcr-access .rcr-live-meta {
          display: none;
        }
        #rcr-access .rcr-login {
          border-radius: 7px;
          padding: 7px 8px;
        }
        #rcr-access .rcr-controls {
          gap: 4px;
        }
      }
      @media (max-width: 390px) {
        #rcr-access .rcr-brand-copy {
          display: none;
        }
        #rcr-access .rcr-live-title {
          font-size: 10px;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        #rcr-access::after,
        #rcr-access .rcr-signal-bars i,
        .rcr-packet-pulse::after {
          animation: none !important;
        }
      }
    `;
    document.head.append(styles);
  };

  const lockReadOnlyControls = (panel) => {
    const selector = [
      'button[title^="Traceroute"]',
      'button[title="Request Position"]',
      'button[title="Settings"]',
      'form button',
    ].join(',');

    const lock = () => {
      document.querySelectorAll(selector).forEach((button) => {
        if (button.classList.contains('rcr-admin-only')) return;

        const action = button.title || button.textContent.trim() || 'Action';
        button.classList.add('rcr-admin-only');
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
        button.title = `Admin login required · ${action}`;
      });
    };

    lock();
    const app = document.getElementById('app');
    if (app) {
      new MutationObserver(lock).observe(app, { childList: true, subtree: true });
    }
    panel.dataset.controls = 'locked';
  };

  const installLivePacketLayer = (traffic, trafficText, trafficMeta, nodeStat, initialState) => {
    const nodes = new Map();
    const activePulses = new Set();
    let map;
    let layer;
    let packetCount = 0;
    let lastPacketKey;
    let lastPacketAt = 0;
    let lastPacketName = 'Mesh traffic';
    let lastTransport = 'RF';
    let activeNodeCount = 0;
    let totalNodeCount = 0;

    const packetTime = (packet) => {
      const value = Number(packet?.rxTime ?? packet?.time);
      if (!Number.isFinite(value) || value <= 0) return 0;
      return value > 1e12 ? value : value * 1000;
    };

    const formatAge = (timestamp) => {
      if (!timestamp) return 'waiting';
      const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
      if (seconds < 5) return 'now';
      if (seconds < 60) return `${seconds}s ago`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      return `${Math.floor(seconds / 3600)}h ago`;
    };

    const renderLive = () => {
      if (!lastPacketAt) {
        trafficText.textContent = 'Listening for traffic';
        trafficMeta.textContent = 'Waiting for the next radio packet';
        traffic.classList.remove('is-stale');
        return;
      }

      const age = formatAge(lastPacketAt);
      trafficText.textContent = `${lastTransport} · ${lastPacketName}`;
      trafficMeta.textContent = packetCount
        ? `${packetCount} packet${packetCount === 1 ? '' : 's'} this visit · ${age}`
        : `Last packet ${age}`;
      traffic.title = `${lastTransport} packet from ${lastPacketName} · ${age}`;
      traffic.classList.toggle('is-stale', Date.now() - lastPacketAt > 120_000);
    };

    const rememberNodes = (state) => {
      const stateNodes = state?.nodes || [];
      const activeSince = Date.now() / 1000 - 3600;
      activeNodeCount = stateNodes.filter((node) => Number(node.lastHeard) >= activeSince).length;
      totalNodeCount = stateNodes.length;

      stateNodes.forEach((node) => {
        const position = node.position || node.approximatePosition;
        const longitude = position?.longitudeI != null
          ? position.longitudeI / 1e7
          : position?.longitude;
        const latitude = position?.latitudeI != null
          ? position.latitudeI / 1e7
          : position?.latitude;
        const hasPosition = Number.isFinite(longitude)
          && Number.isFinite(latitude)
          && (longitude !== 0 || latitude !== 0);

        nodes.set(String(node.num), {
          coordinate: hasPosition ? [longitude, latitude] : null,
          name: node.user?.shortName || node.user?.longName || `!${Number(node.num).toString(16)}`,
        });
      });

      nodeStat.textContent = `${activeNodeCount} active · 60 min`;
      nodeStat.title = `${activeNodeCount} nodes heard in the last hour · ${totalNodeCount} known nodes`;

      const latest = (state?.packets || []).reduce((current, packet) => (
        !current || packetTime(packet) > packetTime(current) ? packet : current
      ), null);
      if (latest && packetTime(latest) > lastPacketAt) {
        const source = nodes.get(String(latest.from));
        lastPacketAt = packetTime(latest);
        lastPacketName = source?.name || `!${Number(latest.from).toString(16).padStart(8, '0')}`;
        lastTransport = latest.viaMqtt ? 'MQTT' : 'RF';
      }
      renderLive();
    };

    const positionPulse = (pulse) => {
      if (!map) return;
      const pixel = map.getPixelFromCoordinate(pulse.coordinate);
      const size = map.getSize();
      const visible = Array.isArray(pixel)
        && Array.isArray(size)
        && pixel[0] >= 0
        && pixel[1] >= 0
        && pixel[0] <= size[0]
        && pixel[1] <= size[1];
      pulse.element.hidden = !visible;
      if (!visible) return;
      pulse.element.style.left = `${pixel[0]}px`;
      pulse.element.style.top = `${pixel[1]}px`;
    };

    const positionPulses = () => activePulses.forEach(positionPulse);

    const attachMap = () => {
      const nextMap = window.__rcrMeshMap;
      if (!nextMap || nextMap === map) return Boolean(map);

      map = nextMap;
      const viewport = map.getViewport();
      layer = document.createElement('div');
      layer.className = 'rcr-packet-layer';
      layer.setAttribute('aria-hidden', 'true');
      viewport.append(layer);
      const key = document.createElement('div');
      key.className = 'rcr-map-key';
      key.setAttribute('aria-hidden', 'true');
      key.innerHTML = '<span><i class="rcr-map-swatch link"></i>Known route</span><span><i class="rcr-map-swatch"></i>Live RF</span><span><i class="rcr-map-swatch mqtt"></i>MQTT</span>';
      viewport.append(key);
      map.on('postrender', positionPulses);
      positionPulses();
      return true;
    };

    const packetSource = (detail) => [
      detail,
      detail?.packet,
      detail?.message,
      detail?.message?.packet,
    ].find((candidate) => Number.isFinite(Number(candidate?.from)));

    const showPacket = (event) => {
      const packet = packetSource(event.detail);
      if (!packet) return;

      const packetKey = packet.id ?? `${packet.from}-${packet.rxTime ?? packet.time ?? ''}`;
      if (packetKey === lastPacketKey) return;
      lastPacketKey = packetKey;
      packetCount += 1;
      const source = nodes.get(String(packet.from));
      const viaMqtt = Boolean(packet.viaMqtt ?? event.detail?.viaMqtt);
      lastPacketAt = packetTime(packet) || Date.now();
      lastPacketName = source?.name || `!${Number(packet.from).toString(16).padStart(8, '0')}`;
      lastTransport = viaMqtt ? 'MQTT' : 'RF';
      renderLive();
      traffic.classList.remove('is-live');
      requestAnimationFrame(() => traffic.classList.add('is-live'));
      setTimeout(() => traffic.classList.remove('is-live'), 750);

      if (!source?.coordinate || !attachMap() || !layer) return;
      const element = document.createElement('span');
      element.className = 'rcr-packet-pulse';
      element.dataset.transport = viaMqtt ? 'mqtt' : 'rf';
      layer.append(element);
      const pulse = { coordinate: source.coordinate, element };
      activePulses.add(pulse);
      positionPulse(pulse);
      setTimeout(() => {
        activePulses.delete(pulse);
        element.remove();
      }, 1900);
    };

    rememberNodes(initialState);
    if (!initialState) {
      fetch('/state', { cache: 'no-store', credentials: 'same-origin' })
        .then((response) => response.ok ? response.json() : null)
        .then(rememberNodes)
        .catch(() => {});
    }
    window.addEventListener('meshsense:packet', showPacket);
    setInterval(renderLive, 1000);
    const attachTimer = setInterval(() => {
      if (attachMap()) clearInterval(attachTimer);
    }, 250);
    setInterval(() => {
      fetch('/state', { cache: 'no-store', credentials: 'same-origin' })
        .then((response) => response.ok ? response.json() : null)
        .then(rememberNodes)
        .catch(() => {});
    }, 60_000);
  };

  const mount = () => {
    if (document.getElementById('rcr-access')) return;

    installStyles();
    document.body.classList.add('rcr-has-access-bar');
    document.title = 'Canadaverse Signal Watch · Live Mesh';

    const panel = document.createElement('header');
    panel.id = 'rcr-access';
    panel.dataset.mode = 'public';
    panel.setAttribute('aria-label', 'Canadaverse Signal Watch');

    const brand = document.createElement('a');
    brand.className = 'rcr-brand';
    brand.href = 'https://canadaverse.org/';
    brand.target = '_blank';
    brand.rel = 'noopener';
    brand.setAttribute('aria-label', 'Visit Canadaverse');
    const emblem = document.createElement('img');
    emblem.className = 'rcr-emblem';
    emblem.src = '/canadaverse-emblem.svg';
    emblem.alt = '';
    const brandCopy = document.createElement('span');
    brandCopy.className = 'rcr-brand-copy';
    const brandName = document.createElement('strong');
    brandName.textContent = 'Canadaverse';
    const brandProduct = document.createElement('span');
    brandProduct.textContent = 'Signal Watch · Royal City mesh';
    brandCopy.append(brandName, brandProduct);
    brand.append(emblem, brandCopy);

    const traffic = document.createElement('div');
    traffic.className = 'rcr-liveboard rcr-traffic';
    traffic.setAttribute('aria-label', 'Live mesh activity');
    const signalBars = document.createElement('span');
    signalBars.className = 'rcr-signal-bars';
    signalBars.setAttribute('aria-hidden', 'true');
    signalBars.append(document.createElement('i'), document.createElement('i'), document.createElement('i'));
    const liveCopy = document.createElement('span');
    liveCopy.className = 'rcr-live-copy';
    const liveLabel = document.createElement('span');
    liveLabel.className = 'rcr-live-label';
    liveLabel.textContent = 'LIVE MESH';
    const trafficText = document.createElement('strong');
    trafficText.className = 'rcr-live-title';
    trafficText.textContent = 'Connecting to the mesh';
    const trafficMeta = document.createElement('span');
    trafficMeta.className = 'rcr-live-meta';
    trafficMeta.textContent = 'Loading radio activity';
    liveCopy.append(liveLabel, trafficText, trafficMeta);
    const nodeStat = document.createElement('span');
    nodeStat.className = 'rcr-node-stat';
    nodeStat.textContent = 'Syncing nodes';
    traffic.append(signalBars, liveCopy, nodeStat);

    const controls = document.createElement('div');
    controls.className = 'rcr-controls';

    const status = document.createElement('span');
    status.className = 'rcr-status';
    const statusDot = document.createElement('span');
    statusDot.className = 'rcr-dot';
    const statusText = document.createElement('span');
    statusText.textContent = 'Public · Read-only';
    status.append(statusDot, statusText);

    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Access details';
    const card = document.createElement('div');
    card.className = 'rcr-access-card';
    const viewing = document.createElement('p');
    viewing.textContent = 'Build the mesh. See the signal. Public viewing includes live nodes, map, telemetry, packet metadata, filters, and zoom.';
    const administration = document.createElement('p');
    administration.textContent = 'Admin unlocks radio-changing actions: messages, trace routes, position requests, connection and device settings, node deletion, and updates.';
    const legend = document.createElement('p');
    legend.textContent = 'Map: lime lines are known routes, lime rings are live RF, and cyan rings arrived through MQTT. Admin-only radio controls remain locked.';
    card.append(viewing, administration, legend);
    details.append(summary, card);

    const login = document.createElement('a');
    login.className = 'rcr-login';
    login.href = '/admin-login';
    login.textContent = 'Admin controls';

    controls.append(status, details, login);
    panel.append(brand, traffic, controls);
    document.body.append(panel);

    fetch('/state', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() : null)
      .then((state) => {
        installLivePacketLayer(traffic, trafficText, trafficMeta, nodeStat, state);
        if (!state?.accessKey) {
          lockReadOnlyControls(panel);
          return;
        }
        panel.dataset.mode = 'admin';
        statusText.textContent = 'Admin mode · Controls enabled';
        login.href = '/';
        login.textContent = 'Admin active';
        viewing.textContent = 'The live map, nodes, telemetry, packet metadata, filters, and zoom remain available.';
        administration.textContent = 'Radio-changing actions are enabled for this authenticated browser session.';
      })
      .catch(() => {
        installLivePacketLayer(traffic, trafficText, trafficMeta, nodeStat, null);
        lockReadOnlyControls(panel);
      });
  };

  resetLegacyMapView();
  enableCanadaverseTheme();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }

  void removeLegacyServiceWorker();
})();
