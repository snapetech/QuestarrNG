# Questarr Home Assistant Add-on

This add-on wraps the official Questarr container and persists application data in Home Assistant's `/data` volume.

## Notes

- Web UI: `http://<home-assistant-host>:5000`
- Database path: persisted in `/data/sqlite.db` (`/app/data` is symlinked to `/data`)
- Runtime behavior: the application runs as the unprivileged `questarr` user. A narrowly scoped helper changes ownership only within `/data` before startup.
- Current add-on architecture support: `amd64` only
