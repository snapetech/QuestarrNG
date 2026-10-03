---
category: security
audience: operators
area: containers
action: Prepare the data volume with the configured UID and GID before enabling rootless mode.
breaking: false
---

Compose and Helm deployments can run QuestarrNG as a non-root user with a read-only root filesystem and no Linux capabilities. The image entrypoint preserves `UMASK` and checks the writable data volume without changing ownership; rootless file logs are stored there at `/app/data/server.log`. Published images now include SBOM and provenance attestations.
