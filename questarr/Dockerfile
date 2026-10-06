# Home Assistant Supervisor mounts /data as root-owned; the init script fixes that
# ownership, then the base entrypoint drops to questarr before Node starts.
FROM ghcr.io/snapetech/questarrng:1.9.0@sha256:f862662e6f3239d0afa60a42ad3771159b361c6a6108dc5b804a1e55ebee458d
ARG BUILD_ARCH=amd64
ARG QUESTARR_VERSION=1.9.0

LABEL \
    io.hass.name="Questarr" \
    io.hass.description="Arr-inspired game management with discovery, tracking, and automated downloads." \
    io.hass.arch="${BUILD_ARCH}" \
    io.hass.type="addon" \
    io.hass.version="${QUESTARR_VERSION}"

RUN mkdir -p /data

# If the base image has seeded /app/data content, migrate it once to persistent storage.
RUN if [ -d /app/data ] && [ ! -L /app/data ]; then cp -a /app/data/. /data/ && rm -rf /app/data; fi

RUN ln -sfn /data /app/data

COPY ha-entrypoint.sh /ha-entrypoint.sh
RUN chmod +x /ha-entrypoint.sh

USER root
ENTRYPOINT ["/ha-entrypoint.sh"]
CMD ["node", "dist/server/index.js"]
