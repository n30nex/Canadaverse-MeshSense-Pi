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
        background: #040a10 !important;
        color: #edf4ff !important;
        display: flex !important;
        flex-direction: column !important;
        font-family: "Segoe UI Variable Text", "SF Pro Text", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        overflow: hidden !important;
      }
      body.rcr-has-access-bar #app {
        flex: 1 1 auto !important;
        height: auto !important;
        min-height: 0 !important;
      }
      #rcr-access {
        align-items: center;
        background: rgba(8, 16, 25, .96);
        border-bottom: 1px solid rgba(32, 215, 186, .56);
        box-sizing: border-box;
        color: #edf4ff;
        display: flex;
        flex: 0 0 46px;
        font: 600 13px/1.2 system-ui, sans-serif;
        gap: 12px;
        height: 46px;
        justify-content: space-between;
        order: -1;
        padding: 0 12px;
        position: relative;
        width: 100%;
        z-index: 2147483647;
      }
      #rcr-access .rcr-brand {
        align-items: baseline;
        display: flex;
        gap: 8px;
        min-width: 0;
      }
      #rcr-access .rcr-brand span {
        color: #91a9b8;
        font-size: 11px;
        font-weight: 500;
      }
      #rcr-access .rcr-controls {
        align-items: center;
        display: flex;
        gap: 10px;
      }
      #rcr-access .rcr-status {
        align-items: center;
        color: #c4d3df;
        display: flex;
        gap: 6px;
        white-space: nowrap;
      }
      #rcr-access .rcr-dot {
        background: #80ff5b;
        border-radius: 50%;
        box-shadow: 0 0 9px rgba(128, 255, 91, .75);
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
        border: 1px solid rgba(128, 216, 255, .3);
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
        top: 38px;
        width: min(420px, calc(100vw - 24px));
      }
      #rcr-access .rcr-access-card p {
        margin: 0 0 8px;
      }
      #rcr-access .rcr-access-card p:last-child {
        margin-bottom: 0;
      }
      #rcr-access .rcr-login {
        background: #80ff5b;
        border-radius: 7px;
        color: #071018;
        padding: 8px 11px;
        text-decoration: none;
        white-space: nowrap;
      }
      #rcr-access[data-mode="admin"] .rcr-login {
        background: rgba(32, 215, 186, .16);
        color: #66e5cf;
      }
      #rcr-access .rcr-traffic {
        align-items: center;
        background: rgba(128, 216, 255, .06);
        border: 1px solid rgba(128, 216, 255, .22);
        border-radius: 999px;
        color: #c9d8e5;
        display: flex;
        gap: 6px;
        padding: 5px 9px;
        white-space: nowrap;
      }
      #rcr-access .rcr-traffic-dot {
        background: #20d7ba;
        border-radius: 50%;
        height: 6px;
        width: 6px;
      }
      #rcr-access .rcr-traffic.is-live .rcr-traffic-dot {
        animation: rcr-traffic-flash .7s ease-out;
        background: #80ff5b;
        box-shadow: 0 0 10px rgba(128, 255, 91, .9);
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
        border-color: rgba(128, 216, 255, .28) !important;
        color: #edf4ff !important;
      }
      #app .btn {
        border-color: rgba(128, 216, 255, .3) !important;
      }
      #app .btn-active {
        background: #80ff5b !important;
        border-color: #80ff5b !important;
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
        border: 1px solid rgba(128, 216, 255, .22);
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
        background: #80ff5b;
        border-radius: 50%;
        box-shadow: 0 0 7px rgba(128, 255, 91, .7);
        height: 7px;
        width: 7px;
      }
      .rcr-map-swatch.mqtt {
        background: #80d8ff;
        box-shadow: 0 0 7px rgba(128, 216, 255, .7);
      }
      .rcr-map-swatch.link {
        border-radius: 0;
        height: 2px;
        width: 14px;
      }
      .rcr-packet-pulse {
        border: 2px solid #80ff5b;
        border-radius: 50%;
        box-shadow: 0 0 12px rgba(128, 255, 91, .9);
        height: 14px;
        margin: -7px 0 0 -7px;
        position: absolute;
        width: 14px;
      }
      .rcr-packet-pulse::after {
        animation: rcr-packet-wave 1.8s ease-out forwards;
        border: 2px solid rgba(128, 255, 91, .9);
        border-radius: 50%;
        content: "";
        inset: -2px;
        position: absolute;
      }
      .rcr-packet-pulse[data-transport="mqtt"] {
        border-color: #80d8ff;
        box-shadow: 0 0 12px rgba(128, 216, 255, .9);
      }
      .rcr-packet-pulse[data-transport="mqtt"]::after {
        border-color: rgba(128, 216, 255, .9);
      }
      @keyframes rcr-packet-wave {
        0% { opacity: 1; transform: scale(.4); }
        100% { opacity: 0; transform: scale(4.6); }
      }
      @keyframes rcr-traffic-flash {
        0% { transform: scale(.7); }
        45% { transform: scale(1.8); }
        100% { transform: scale(1); }
      }
      @media (max-width: 680px) {
        #rcr-access .rcr-brand span,
        #rcr-access .rcr-traffic,
        #rcr-access summary {
          display: none;
        }
        #rcr-access {
          gap: 6px;
          padding: 0 8px;
        }
        #rcr-access .rcr-controls {
          gap: 7px;
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

  const installLivePacketLayer = (traffic, trafficText, initialState) => {
    const nodes = new Map();
    const activePulses = new Set();
    let map;
    let layer;
    let packetCount = 0;
    let lastPacketKey;

    const rememberNodes = (state) => {
      (state?.nodes || []).forEach((node) => {
        const position = node.position || node.approximatePosition;
        const longitude = position?.longitudeI != null
          ? position.longitudeI / 1e7
          : position?.longitude;
        const latitude = position?.latitudeI != null
          ? position.latitudeI / 1e7
          : position?.latitude;
        if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return;
        if (longitude === 0 && latitude === 0) return;

        nodes.set(String(node.num), {
          coordinate: [longitude, latitude],
          name: node.user?.shortName || node.user?.longName || `!${Number(node.num).toString(16)}`,
        });
      });
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
      key.innerHTML = '<span><i class="rcr-map-swatch link"></i>Known link</span><span><i class="rcr-map-swatch"></i>Live RF</span><span><i class="rcr-map-swatch mqtt"></i>MQTT</span>';
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

      const source = nodes.get(String(packet.from));
      if (!source) return;

      const packetKey = packet.id ?? `${packet.from}-${packet.rxTime ?? packet.time ?? ''}`;
      if (packetKey === lastPacketKey) return;
      lastPacketKey = packetKey;
      packetCount += 1;
      const viaMqtt = Boolean(packet.viaMqtt ?? event.detail?.viaMqtt);

      trafficText.textContent = `${viaMqtt ? 'MQTT' : 'RF'} packets · ${packetCount}`;
      traffic.title = `${source.name} · ${viaMqtt ? 'MQTT' : 'RF'} packet with a known map position`;
      traffic.classList.remove('is-live');
      requestAnimationFrame(() => traffic.classList.add('is-live'));
      setTimeout(() => traffic.classList.remove('is-live'), 750);

      if (!attachMap() || !layer) return;
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

    const panel = document.createElement('header');
    panel.id = 'rcr-access';
    panel.dataset.mode = 'public';
    panel.setAttribute('aria-label', 'Royal City Recon MeshSense access');

    const brand = document.createElement('div');
    brand.className = 'rcr-brand';
    const brandName = document.createElement('strong');
    brandName.textContent = 'Royal City Recon';
    const brandProduct = document.createElement('span');
    brandProduct.textContent = 'MeshSense live network';
    brand.append(brandName, brandProduct);

    const controls = document.createElement('div');
    controls.className = 'rcr-controls';

    const status = document.createElement('span');
    status.className = 'rcr-status';
    const statusDot = document.createElement('span');
    statusDot.className = 'rcr-dot';
    const statusText = document.createElement('span');
    statusText.textContent = 'Public view · Read-only';
    status.append(statusDot, statusText);

    const traffic = document.createElement('span');
    traffic.className = 'rcr-traffic';
    traffic.title = 'Waiting for a packet from a positioned node';
    const trafficDot = document.createElement('span');
    trafficDot.className = 'rcr-traffic-dot';
    const trafficText = document.createElement('span');
    trafficText.textContent = 'Packets · waiting';
    traffic.append(trafficDot, trafficText);

    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Access details';
    const card = document.createElement('div');
    card.className = 'rcr-access-card';
    const viewing = document.createElement('p');
    viewing.textContent = 'Public viewing includes live nodes, map, telemetry, packet metadata, filters, and zoom. Admin-only radio controls are visibly locked.';
    const administration = document.createElement('p');
    administration.textContent = 'Admin unlocks radio-changing actions: messages, trace routes, position requests, connection and device settings, node deletion, and updates.';
    const legend = document.createElement('p');
    legend.textContent = 'Map: lime links are known direct neighbours or completed traceroutes; animated rings are live packets from positioned nodes. Cyan rings arrived through MQTT.';
    card.append(viewing, administration, legend);
    details.append(summary, card);

    const login = document.createElement('a');
    login.className = 'rcr-login';
    login.href = '/admin-login';
    login.textContent = 'Admin controls';

    controls.append(status, traffic, details, login);
    panel.append(brand, controls);
    document.body.append(panel);

    fetch('/state', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() : null)
      .then((state) => {
        installLivePacketLayer(traffic, trafficText, state);
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
        installLivePacketLayer(traffic, trafficText, null);
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
