# QuestarrNG

**QuestarrNG is the game-acquisition service maintained for
[SeerrNG](https://github.com/snapetech/seerrng).** It is a separate
[GPL-3.0-only fork of Questarr](https://github.com/Doezer/Questarr), with a
versioned machine API for idempotent external requests, durable job status,
platform-variant metadata, and authenticated delivery of imported files.
SeerrNG remains the user-facing catalog, approval, and request experience.

The fork is maintained at [snapetech/QuestarrNG](https://github.com/snapetech/QuestarrNG).
Fork-specific API details are in
[docs/SEERRNG-INTEGRATION.md](docs/SEERRNG-INTEGRATION.md). Upstream Questarr
remains the source for inherited features and license attribution.

![QuestarrNG Logo](images/Questarr_Logo-nobg.png)

A video game management application inspired by the -Arr apps (Sonarr, Radarr, Prowlarr...) and GamezServer. Track and organize your video game collection with automated discovery and download management.

[![Library screenshot](images/Screenshots/library.png)](images/Screenshots/library.png)

The badges below report the upstream Questarr project's release, package, and CI status. QuestarrNG's code and fork-specific request API are maintained in this repository.

[![Docker Pulls](https://img.shields.io/docker/pulls/doezer/questarr?logo=docker&logoColor=white)](https://hub.docker.com/r/doezer/questarr)
[![GHCR](https://img.shields.io/badge/ghcr.io-questarr-blue?logo=github&logoColor=white)](https://github.com/Doezer/Questarr/pkgs/container/questarr)
[![License](https://img.shields.io/github/license/Doezer/Questarr)](https://github.com/Doezer/Questarr/blob/main/COPYING)
[![GitHub release](https://img.shields.io/github/v/release/Doezer/Questarr)](https://github.com/Doezer/Questarr/releases)
[![GitHub release date](https://img.shields.io/github/release-date/Doezer/Questarr)](https://github.com/Doezer/Questarr/releases)
[![GitHub last commit](https://img.shields.io/github/last-commit/Doezer/Questarr)](https://github.com/Doezer/Questarr/commits/main)

[![security rating](https://sonarcloud.io/api/project_badges/measure?project=Doezer_Questarr&metric=security_rating)](https://sonarcloud.io/summary/overall?id=Doezer_Questarr)
[![reliability rating](https://sonarcloud.io/api/project_badges/measure?project=Doezer_Questarr&metric=reliability_rating)](https://sonarcloud.io/summary/overall?id=Doezer_Questarr)
[![maintainability rating](https://sonarcloud.io/api/project_badges/measure?project=Doezer_Questarr&metric=sqale_rating)](https://sonarcloud.io/summary/overall?id=Doezer_Questarr)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/13450/baseline)](https://www.bestpractices.dev/projects/13450)
[![OpenSSF Best Practices Badge](https://www.bestpractices.dev/projects/13450/badge)](https://www.bestpractices.dev/projects/13450)

[![CI](https://github.com/Doezer/Questarr/actions/workflows/ci.yml/badge.svg)](https://github.com/Doezer/Questarr/actions/workflows/ci.yml)
[![Codecov](https://codecov.io/gh/Doezer/Questarr/branch/main/graph/badge.svg)](https://codecov.io/gh/Doezer/Questarr)
[![Code Scanning](https://github.com/Doezer/Questarr/actions/workflows/sast.yml/badge.svg)](https://github.com/Doezer/Questarr/security/code-scanning)
[![tests](https://img.shields.io/badge/tests-1800%2B%20passing-brightgreen)](https://github.com/Doezer/Questarr/actions/workflows/ci.yml)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/Doezer/Questarr/graphs/commit-activity)

⭐ Star us on GitHub — your support motivates us a lot! 🙏😊

[![Discord](https://img.shields.io/badge/Discord-Join%20Us-7289da?logo=discord&logoColor=white)](https://discord.gg/STkp86wP9F)
[![Share](https://img.shields.io/badge/share-000000?logo=x&logoColor=white)](https://x.com/intent/tweet?text=Check%20out%20QuestarrNG%20for%20SeerrNG:%20https://github.com/snapetech/QuestarrNG%20%23gaming%20%23selfhosted)
[![Share](https://img.shields.io/badge/share-1877F2?logo=facebook&logoColor=white)](https://www.facebook.com/sharer/sharer.php?u=https://github.com/snapetech/QuestarrNG)
[![Share](https://img.shields.io/badge/share-0A66C2?logo=linkedin&logoColor=white)](https://www.linkedin.com/sharing/share-offsite/?url=https://github.com/snapetech/QuestarrNG)
[![Share](https://img.shields.io/badge/share-FF4500?logo=reddit&logoColor=white)](https://www.reddit.com/submit?title=Check%20out%20QuestarrNG%20for%20SeerrNG:%20https://github.com/snapetech/QuestarrNG)
[![Share](https://img.shields.io/badge/share-0088CC?logo=telegram&logoColor=white)](https://t.me/share/url?url=https://github.com/snapetech/QuestarrNG&text=QuestarrNG%20for%20SeerrNG)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/doezer)

## Table of Contents

- [QuestarrNG](#questarrng)
  - [Table of Contents](#table-of-contents)
  - [List of features](#list-of-features)
  - [Installation](#installation)
  - [Screenshots](#screenshots)
  - [Tech Stack](#tech-stack)
  - [Configuration](#configuration)
  - [Roadmap](#roadmap)
  - [Troubleshooting](#troubleshooting)
  - [Project Security \& Documentation](#project-security--documentation)
  - [Contributing](#contributing)
  - [License](#license)
  - [Acknowledgments](#acknowledgments)

## List of features

| Feature                     | Description                                                                                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backlog management**      | Track your collection with status indicators (Wanted, Owned, Playing, Completed, Shelved), ratings, and notes.                                                                |
| **Game Discovery**          | Browse popular, new, and upcoming titles via IGDB, RSS feeds, and xREL.to, or sync your Steam wishlist directly into the app.                                                 |
| **Search & Filter**         | Find games by genre, platform, and keyword, with automatic search until a release is found, plus release blacklisting and preferred release groups/platforms.                 |
| **Download Management**     | Integrates with indexers and downloaders with optional auto-download and automatic post-processing import.                                                                    |
| **Real-time Notifications** | In-app alerts for releases and downloads, plus external notifications to 100+ providers via [Apprise](https://github.com/caronc/apprise).                                     |
| **Rich Game Metadata**      | Details enriched with IGDB, Steam, PCGamingWiki, and NexusMods, including trending mods where available.                                                                      |
| **Statistics**              | Visualize collection statistics with Discord sharing support. 🚧                                                                                                              |
| **Security Focused**        | General security hardening, SSL support, and [OpenSSF certified](https://www.bestpractices.dev/projects/13450) — see [SECURITY.md](.github/SECURITY.md) for the full process. |
| **Deployment**              | Docker and Compose are the supported paths for QuestarrNG. Some upstream packages do not include this fork's SeerrNG integration.                                             |
| **SeerrNG requests**        | Versioned request, status, variant, and imported-file delivery API for SeerrNG; documented in [the integration guide](docs/SEERRNG-INTEGRATION.md).                            |
| **Design**                  | Clean, minimalist, dark-first UI built with mobile usage in mind.                                                                                                             |

### Supported Indexers/Downloaders

- Prowlarr synchronization is supported to add all your indexers at once.
- G4u.to: the site offers an API to VIP members, which can be used in QuestarrNG.

| Indexers                   | Downloaders                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------- |
| Torznab protocol (Torrent) | - qBittorent<br>- Transmission<br>- rTorrent<br>- Deluge<br>- Synology Download Station |
| Newznab protocol (Usenet)  | - Sabnzbd<br>- Nzbget                                                                   |
| G4U.to                     | Same as Newznab                                                                         |

## Installation

Docker is the easiest way to deploy QuestarrNG with all dependencies included. QuestarrNG uses a SQLite database which is self-contained in the application container. The fork's GHCR package is configured by the deployment workflow; until a fork image is published, build the checked-out source with Compose.

**Supported architectures:** QuestarrNG's container workflow is configured for `linux/amd64` and `linux/arm64`. Docker selects the matching image when a published tag is available. (32-bit ARM, e.g. `armv7`/a 32-bit OS on Raspberry Pi 3 and earlier, is not supported.)

### Option 1: One-liner (Simplest but minimal)

```bash
docker build -t questarrng .
docker run -d -p 5000:5000 -v ./data:/app/data --name questarrng questarrng
```

### Option 2: Docker Compose (more detailed)

1. **Use the [`docker-compose.yml`](https://github.com/snapetech/QuestarrNG/blob/main/docker-compose.yml) file from this fork or create a minimal one:**

   ```yaml
   services:
     app:
       image: ghcr.io/snapetech/questarrng:latest
       build: .
       ports:
         - "5000:5000"
       volumes:
         - ./data:/app/data
       environment:
         - SQLITE_DB_PATH=/app/data/sqlite.db
       restart: unless-stopped
   ```

2. **Start the application:**

   ```bash
   docker compose up --build -d
   ```

3. **Access the application:**
   Open your browser to `http://localhost:5000`

### Proxmox VE (LXC)

<details>
<summary><b>Deploy as a Proxmox LXC container — no Docker</b></summary>

Run this **on your Proxmox VE host**, as `root`, to create an LXC container with QuestarrNG installed
and running as a `systemd` service:

```bash
bash -c "$(curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' https://raw.githubusercontent.com/snapetech/QuestarrNG/main/scripts/proxmox/questarr-lxc.sh)"
```

The script picks the next free container ID, downloads a Debian template if needed, creates an
unprivileged container, builds QuestarrNG from this fork, and prints the URL to open. Every prompt has a
default, so you can accept them all and be done in a few minutes.

Update later with `pct exec <ctid> -- update`.

See [docs/PROXMOX.md](docs/PROXMOX.md) for non-interactive installs, sizing guidance, configuration,
and troubleshooting.

</details>

### UNRAID

<details>
<summary><b>Run with Docker</b></summary>

The upstream Questarr template in Community Applications installs upstream Questarr, not this fork's SeerrNG request API. After QuestarrNG publishes its first image, install `ghcr.io/snapetech/questarrng:latest` with Docker on Unraid and configure the app data and library mounts described in the fork's Compose file. Until then, build from this checkout with Docker Compose.

1. Open the **Docker** tab and add a container using `ghcr.io/snapetech/questarrng:latest`.
2. Set your **Data Path** (for example `/mnt/user/appdata/questarrng`), **PUID**/**PGID**, and ports (default `5000`
   HTTP, `9898` HTTPS if using it).
3. Optionally mount **Library Path** to the same root your download client(s) write into (e.g.
   `/mnt/user/data`) if you want QuestarrNG to move completed downloads into your game library. This host path
   is mounted at `/data` inside the container, so add a mapping under **Settings → Path Mappings** with
   **Local Path** set to `/data` and **Remote Path** set to the exact path your download client reports for
   that root. Leave Library Path blank if you manage imports manually.
4. Apply, then open `http://<unraid-host>:5000` to access the UI.

</details>

### CasaOS

<details>
<summary><b>Install via Custom Install (AppFile)</b></summary>

1. After QuestarrNG publishes its first image, open the **App Store** and click **Custom Install**.
2. Click the **import** icon (top right) and paste this URL:
   `https://raw.githubusercontent.com/snapetech/QuestarrNG/main/casaos/docker-compose.yml`
3. Review the mounts — by default `/DATA/AppData/questarrng` holds QuestarrNG's data and
   `/DATA/Downloads` is mounted at `/data` so QuestarrNG can import finished downloads. If you keep
   that second mount, add a matching entry under **Settings → Path Mappings**.
4. Click **Install**, then open QuestarrNG from the CasaOS dashboard (port `5000`).

</details>

### Umbrel

<details>
<summary><b>Deployment status</b></summary>

The upstream Doezer community store installs upstream Questarr, not QuestarrNG. The NG fork is not currently packaged for Umbrel; use its Docker Compose deployment on the Umbrel host.

</details>

### Cosmos Cloud

<details>
<summary><b>Install as a ServApp</b></summary>

1. Once the fork image is published, open **Market Place → Custom Install** (or **Servapps → Add**).
2. Paste this URL:
   `https://raw.githubusercontent.com/snapetech/QuestarrNG/main/cosmos/questarr.cosmos-compose.json`
3. Fill in the install form: **Data folder**, optional **Library folder** (the root your download
   client writes into, mounted at `/data`), and `PUID`/`PGID`.
4. Install. Cosmos creates the route `questarr.<your-server-hostname>` and handles HTTPS for you.

</details>

### Kubernetes (Helm)

<details>
<summary><b>Install with the bundled Helm chart</b></summary>

A Helm chart lives in [`charts/questarr`](charts/questarr). It is not published to a Helm
repository yet, so install it from a clone:

```bash
git clone https://github.com/snapetech/QuestarrNG.git
cd QuestarrNG
helm install questarr charts/questarr --namespace questarr --create-namespace
```

Then port-forward (or enable the Ingress) and open the UI:

```bash
kubectl port-forward -n questarr svc/questarr 5000:5000
```

QuestarrNG keeps its state in a single SQLite database on a ReadWriteOnce volume, so the
chart never runs more than one replica. See [`charts/questarr/README.md`](charts/questarr/README.md)
for the full option reference — persistence, media mounts, secrets, Ingress and
subdirectory deployments.

</details>

### Home Assistant Add-on

<details>
<summary><b>Install as a Home Assistant add-on</b></summary>

The upstream Questarr add-on from Doezer's repository does not include the NG request API. A QuestarrNG add-on has not yet been packaged; use the Docker or Compose install above to run QuestarrNG alongside Home Assistant.

</details>

Fork-owned platform definitions are listed in
[docs/HOME_SERVER_APPS.md](docs/HOME_SERVER_APPS.md). The inherited Umbrel and Home Assistant
definitions still install upstream Questarr and do not include QuestarrNG's SeerrNG API.

## Screenshots

<details closed>
<summary><b>👀 See the app in action</b></summary>

### Library

Your central hub for recent activity, collection overview and downloading available games. Manage your owned and wanted games.

<a href="images/Screenshots/library.png"><img src="images/Screenshots/library.png" /></a>

<p float="left">
  <a href="images/Screenshots/game_details.png"><img src="images/Screenshots/game_details.png" width="49%" /></a>
  <a href="images/Screenshots/download_modal.png"><img src="images/Screenshots/download_modal.png" width="49%" /></a>
</p>

### Wishlist & Release calendar

Manage your wanted games and when they release.

<p float="left">
  <a href="images/Screenshots/wishlist.png"><img src="images/Screenshots/wishlist.png" width="49%" /></a>
  <a href="images/Screenshots/calendar.png"><img src="images/Screenshots/calendar.png" width="49%" /></a>
</p>

### Discover Games

Browse and find new games to add to your collection.

<a href="images/Screenshots/discover.png"><img src="images/Screenshots/discover.png" /></a>

#### RSS & xRel.to feeds

Custom RSS feeds and xRel.to flux matched to IGDB games directly into the app. Default RSS is set to fitgirl site.

<p float="left">
  <a href="images/Screenshots/rss.png"><img src="images/Screenshots/rss.png" width="49%" /></a>
  <a href="images/Screenshots/xrelto.png"><img src="images/Screenshots/xrelto.png" width="49%" /></a>
</p>

### Downloads Queue

Monitor your downloaders' active downloads and history.

<a href="images/Screenshots/downloads.png"><img src="images/Screenshots/downloads.png" /></a>

### Statistics

Check out your library statistics.

<a href="images/Screenshots/stats.png"><img src="images/Screenshots/stats.png" /></a>

### Settings

Configure indexers, downloaders, and application preferences.

<p float="left">
  <a href="images/Screenshots/indexers.png"><img src="images/Screenshots/indexers.png" width="49%" /></a>
  <a href="images/Screenshots/downloaders.png"><img src="images/Screenshots/downloaders.png" width="49%" /></a>
</p>

<a href="images/Screenshots/settings.png"><img src="images/Screenshots/settings.png" /></a>

</details>

## Tech Stack

![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=flat&logo=sqlite&logoColor=white)
[![Node.js](https://img.shields.io/badge/Node.js-22.19%2B-339933?logo=node.js&logoColor=white)](package.json)
[![language](https://img.shields.io/badge/language-TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![OS](https://img.shields.io/badge/OS-linux%2C%20windows%2C%20macOS-0078D4)](#installation)
[![CPU](https://img.shields.io/badge/CPU-amd64%2C%20arm64-FF8C00)](#installation)

- **APIs**: IGDB (game metadata), Torznab/Newznab (indexer search), PCGamingWiki, NexusMods, xREL.to
- **AIs usage**:
  - Claude and Github Copilot are used for AI-Assisted coding, internal code reviews, PR cleanup. Eventually automated coding and troubleshooting for small tasks and bug reports.
  - Gemini & Codex are used for automated code reviews, and brainstorming from time to time (as well as Perplexity for this usage).
  - Google Jules is used for light periodical refactoring.

## Configuration

1. **First-time setup:**

- Create your admin account
- Configure the IGDB credentials

Once logged-in:

- Configure indexers
- Add downloaders
- Add games!

See the [upstream Questarr configuration Wiki](https://github.com/Doezer/Questarr/wiki/Configuring-the-application#configure-app-behavior-in-settings--general) for inherited behavior. Fork-specific request API details are in [docs/SEERRNG-INTEGRATION.md](docs/SEERRNG-INTEGRATION.md).

<details>
<summary><b>Getting IGDB API Credentials</b></summary>

IGDB provides game metadata (covers, descriptions, ratings, release dates, etc.).

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Log in with your Twitch account (create one if needed)
3. Click "Register Your Application"
4. Fill in:
   - **Name**: QuestarrNG (or any name)
   - **OAuth Redirect URLs**: `http://localhost` (not used, but required)
   - **Category**: Application Integration
5. Click "Create"
6. Copy your **Client ID** and **Client Secret**
7. Add them to your `.env` file

</details>

<details>
<summary><b>Upgrading from v1.0 (PostgreSQL)</b></summary>

If you are upgrading from an older version that used PostgreSQL, you need to migrate your data.

The migration tooling was removed in v1.5.0 and is now run from the archived
**v1.4.2** release. Follow [docs/MIGRATION.md](docs/MIGRATION.md), which inlines
the pinned compose file and links the sources by tag permalink.

> This is only for **pre-v1.1 PostgreSQL** installations. Running Questarr _on_
> PostgreSQL as an opt-in backend is a separate feature — see
> `docs/DATABASE.md`.

See [docs/MIGRATION.md](docs/MIGRATION.md) for more details.

</details>

<details>
<summary><b>Advanced usage</b></summary>

### Docker compose

This is mainly for users who want the latest commit (e.g when trying out fixes for an issue) or contributing users.

1. **Clone the repository:**

```bash
git clone https://github.com/snapetech/QuestarrNG.git
cd QuestarrNG
```

1. **Configure the application:**
   Edit `docker-compose.yml` directly if you need to setup a specific environment.

1. **Build and start the containers:**

```bash
docker-compose up -d
```

1. **Access the application:**
   Open your browser to `http://localhost:5000`

### Update to latest version for Docker

Your database content will be kept.

```bash
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Reverse proxy / subdirectory deployment

Want to serve Questarr from a path like `https://xxx.domain.com/Questarr`
instead of its own subdomain? Set `QUESTARR_BASE_PATH=/Questarr` on the
container (or in `.env` for npm installs) and point your reverse proxy at it
— no rebuild required. See [docs/REVERSE_PROXY.md](docs/REVERSE_PROXY.md) for
full setup instructions (nginx, Traefik, Caddy).

</details>

## Roadmap

Based on the [Product Requirements Document](docs/PRD.md), here's what's planned over the next 6 months, in priority order:

- ✅ **P0 — Post-Processing Pipeline** : Move/copy completed downloads to a destination path, extract archives — closing the "set it and forget it" loop.
- **P1 — Smart Game Backlog**: Track the version of each downloaded game and notify (or auto-download) when a newer release shows up on indexers.
- **P2 — Direct Download Support**: Add debrid services (Real-Debrid and similar) as a downloader option, no seeding required.
- **P3 — External Library Sync**: Import owned games from Steam/GOG libraries and local filesystem scans, not just wishlists.
- **P4 — Integrations with External Tools**: ✅ Playnite extension shipped (library sync, request-to-download); RomM, Gameyfin, and a generic webhook for anything not explicitly supported are still planned.
- **P5 — Indexer Page Links**: A "View on indexer" link on search results and downloads.
- **P6 — PostgreSQL Support**: Re-introduce PostgreSQL as an optional backend, with SQLite remaining the zero-config default.

**Ongoing:** mobile responsiveness, search UX, performance, and security improvements.

See the full [PRD](docs/PRD.md) for problem statements, detailed scope, and non-goals.

## Troubleshooting

See [upstream troubleshooting on the Wiki](https://github.com/Doezer/Questarr/wiki/Troubleshooting)

If you run into an issue, go to the **Logs** page and click **Send Logs** before reporting it — it makes diagnosing the problem much easier.

### Getting Help

- **QuestarrNG issues**: [GitHub Issues](https://github.com/snapetech/QuestarrNG/issues)
- **Discord**: [Join our Server](https://discord.gg/STkp86wP9F)

## Project Security & Documentation

- Start with [docs/GITHUB_DOCUMENTATION.md](docs/GITHUB_DOCUMENTATION.md) for the canonical documentation map.

## Contributing

- See [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) for guidelines on how to contribute to this project.
- See [MAINTAINERS.md](/.github/MAINTAINERS.md) for the current list of project members with access to sensitive resources.

### Contributors

<a href="https://github.com/Doezer/Questarr/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Doezer/Questarr" />
</a>

Made with [contrib.rocks](https://contrib.rocks).

## Legal Disclaimer

QuestarrNG is a self-hosted game manager designed for organizing, tracking, and automating game libraries using user-provided data and metadata APIs such as IGDB. QuestarrNG does not host or distribute game content. Indexers, download clients, and sources are configured and operated by the administrator.

## License

GPL3 License - see [COPYING](COPYING) file for details.

## Acknowledgments

- Inspired by [Sonarr](https://sonarr.tv/) and [GamezServer](https://github.com/05sonicblue/GamezServer)
- Game metadata powered by [IGDB API](https://www.igdb.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
