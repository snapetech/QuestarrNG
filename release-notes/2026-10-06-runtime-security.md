---
category: security
audience: operators
area: deployment
action: For direct Docker installs or custom PUID/PGID values, match the runtime user to the mounted data owner before upgrading.
breaking: true
---

The production image now starts as the unprivileged questarr user, and Compose definitions map it to PUID/PGID; the scanner toolchain and HTTP cache parser also received fixes for the open PyJWT and ReDoS alerts.
