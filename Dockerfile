# syntax=docker/dockerfile:1

FROM debian:bookworm-slim AS appimage

ARG MESHSENSE_URL="https://affirmatech.com/download/meshsense/meshsense-beta-arm64.AppImage"
ARG MESHSENSE_SHA256="04764cf33481ada042784b2c7b0b5a98e78cd0bb6b903487c1f66a41d105553f"

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl libfuse2 python3-minimal zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /tmp/meshsense
RUN curl --fail --location --retry 3 --output meshsense.AppImage "$MESHSENSE_URL" \
    && echo "$MESHSENSE_SHA256  meshsense.AppImage" | sha256sum --check --strict \
    && chmod +x meshsense.AppImage \
    && ./meshsense.AppImage --appimage-extract >/dev/null \
    && test -x squashfs-root/AppRun

COPY patch-meshsense.py admin-login.js cleanup-sw.js /tmp/meshsense-patch/
RUN python3 /tmp/meshsense-patch/patch-meshsense.py \
        squashfs-root/resources/app.asar.unpacked/resources/api/index.cjs \
        squashfs-root/resources/app.asar.unpacked/resources/api/static/index.html \
    && install -m 0644 /tmp/meshsense-patch/admin-login.js \
        squashfs-root/resources/app.asar.unpacked/resources/api/static/admin-login.js \
    && install -m 0644 /tmp/meshsense-patch/cleanup-sw.js \
        squashfs-root/resources/app.asar.unpacked/resources/api/static/sw.js

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        dbus-x11 \
        libasound2 \
        libatk-bridge2.0-0 \
        libcups2 \
        libgbm1 \
        libgdk-pixbuf-2.0-0 \
        libgtk-3-0 \
        libnss3 \
        xauth \
        xvfb \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 --shell /usr/sbin/nologin meshsense

COPY --from=appimage /tmp/meshsense/squashfs-root /opt/meshsense
COPY --chmod=0755 entrypoint.sh /usr/local/bin/meshsense-start

# The official AppImage ships its resources directory as mode 0700. Make the
# extracted application readable by the dedicated runtime user.
RUN chmod -R a+rX /opt/meshsense

ENV APPDIR=/opt/meshsense \
    HOME=/home/meshsense \
    HEADLESS=1 \
    PORT=5920

USER meshsense
WORKDIR /home/meshsense

EXPOSE 5920

HEALTHCHECK --interval=20s --timeout=5s --start-period=45s --retries=3 \
    CMD curl --fail --silent --show-error http://127.0.0.1:5920/state >/dev/null || exit 1

CMD ["dbus-run-session", "--", "/usr/local/bin/meshsense-start"]
