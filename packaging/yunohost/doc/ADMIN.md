# Administration

## Service and paths

- The systemd and YunoHost service name is `questarrng`.
- The release, compiled client, and production Node.js modules are in `__INSTALL_DIR__`.
- The SQLite database, `config.yaml`, and Apprise virtual environment are in `__DATA_DIR__`.
- Logs are written to `__DATA_DIR__/logs/questarrng.log` and rotated by logrotate.
- The web process runs as the dedicated `questarrng` system user and listens only on the local YunoHost-managed port.

The package backs up the application, database, and configuration. Logs and the generated Apprise Python environment are recreated after restore.

## Application setup

QuestarrNG uses its own local account setup and authentication. It does not authenticate through YunoHost SSO. The initial YunoHost permission is restricted to administrators to protect the first-run account setup.

An IGDB client ID and secret are required for game discovery and metadata. Add them in QuestarrNG's Services settings. Other integrations, including Steam, NexusMods, download clients, and notifications, are optional.

For a downloader or import folder located on the YunoHost host, grant the `questarrng` system user read/write access as required. QuestarrNG cannot access folders that the service user cannot access.

## Archives

The package installs Debian's 7-Zip command for supported archive formats. RAR extraction needs the `unrar` executable; it is not installed by default because Debian distributes it from its non-free component. If you enable that component and install `unrar`, QuestarrNG detects `/usr/bin/unrar` automatically. Archive extraction reports an error when the required executable is unavailable.

## Updating and backup

YunoHost upgrades build the pinned QuestarrNG release locally, then restart the service. Use YunoHost's standard app backup and restore commands to preserve the database and configuration.
