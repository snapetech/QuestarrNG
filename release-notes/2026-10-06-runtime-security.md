---
category: security
audience: operators
area: deployment
action: For direct Docker installs or custom PUID/PGID values, match the runtime user to the mounted data owner before upgrading.
breaking: true
---

Production and Home Assistant images now run the app as the unprivileged questarr user; Compose definitions map it to PUID/PGID, and the Home Assistant startup helper can change ownership only within its persistent /data volume. The scanner toolchain and HTTP cache parser also received fixes for the open PyJWT and ReDoS alerts.
