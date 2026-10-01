# NOSONAR - ha-entrypoint.sh must run as root to chown /data before su-exec drops to questarr
FROM ghcr.io/snapetech/questarrng:sha-253b95dfc7019cba4e2cc4e6eaf1748456e3aef4@sha256:85b79ec93dd7ba1da96cd4d48d5581b22f46ebf2423437ee501f79477e4e5382
ARG BUILD_ARCH=amd64
ARG QUESTARR_VERSION=1.7.2

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

# nosemgrep: dockerfile.security.missing-user-entrypoint.missing-user-entrypoint
ENTRYPOINT ["/ha-entrypoint.sh"]
# nosemgrep: dockerfile.security.missing-user.missing-user
CMD ["node", "dist/server/index.js"]
