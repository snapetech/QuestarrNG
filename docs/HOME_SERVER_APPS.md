# QuestarrNG deployment definitions

QuestarrNG is a maintained fork of [Questarr](https://github.com/Doezer/Questarr)
for SeerrNG game requests, durable acquisition tracking, and delivery of verified
imported files. The fork is maintained at
[snapetech/QuestarrNG](https://github.com/snapetech/QuestarrNG); SeerrNG remains
the user-facing catalog and request application.

Fork-owned deployment definitions are available for CasaOS, Cosmos Cloud,
Kubernetes/Helm, and Unraid. They use `ghcr.io/snapetech/questarrng`. Until the
fork publishes its first image, use the root Compose file, which builds the
checked-out source locally:

```bash
docker compose up --build -d
```

Persist `/app/data` for QuestarrNG's SQLite database. Mount the download or
library directory at `/data` only when it is needed, then configure the matching
entry under **Settings → Path Mappings**. The local path is `/data`; the remote
path must match the path reported by the download client.

| Definition | Platform | Image |
| --- | --- | --- |
| [`casaos/docker-compose.yml`](../casaos/docker-compose.yml) | CasaOS AppFile | `ghcr.io/snapetech/questarrng` |
| [`cosmos/questarr.cosmos-compose.json`](../cosmos/questarr.cosmos-compose.json) | Cosmos Cloud ServApp | `ghcr.io/snapetech/questarrng` |
| [`charts/questarr`](../charts/questarr) | Kubernetes with Helm | `ghcr.io/snapetech/questarrng` |
| [`unraid/questarr.xml`](../unraid/questarr.xml) | Unraid Community Applications template | `ghcr.io/snapetech/questarrng` |

The CasaOS, Cosmos, and Unraid definitions can pull the fork image after it is
published. Until then, build QuestarrNG from this checkout with Compose.

## Packages retained from upstream

The inherited `doezer-questarr/` Umbrel package and `questarr/` Home Assistant
add-on still point to upstream Questarr. They do not include QuestarrNG's
SeerrNG request and asset API and are not deployment options for this fork.
QuestarrNG does not currently publish Umbrel or Home Assistant packages.

The original deployment definitions and project are documented at
[Doezer/Questarr](https://github.com/Doezer/Questarr). Do not use those upstream
packages when SeerrNG request correlation or imported-file delivery is needed.
