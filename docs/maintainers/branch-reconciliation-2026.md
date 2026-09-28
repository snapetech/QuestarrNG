# Maintained branch reconciliation (2026-09-28)

All active QuestarrNG work is kept on `main`. Remote branch tips listed below were audited before their refs were removed; published version tags were retained.

## Integrated branch tips

These remote tips are ancestors of `main` and their changes are already present:

- `bolt-calendar-date-optimization-5372933706553318125`
- `claude/db-abstraction-cost-95hyar`
- `claude/jev-auto-download-gate`
- `claude/pensive-euler-j3k3lq`
- `claude/project-thread-zsm490`
- `copilot/fix-insecure-fetch-ssl-errors`
- `feature/seerrng-request-assets`
- `release/1.4.0`
- `release/1.4.1`

The final `romm-integration-clean` branch added real RomM import work. Its older importer and broad filesystem browser were not carried over. RomM routing, per-platform slugs, per-user configuration, manual review selection, and archive handling now use the maintained import pipeline; the browser is confined to configured library roots and rejects symlink escapes.

## Superseded proposals and experiments

| Branch                                         | Outcome                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `copilot/add-background-toasts-notifications`  | The tip contains only an empty “Initial plan” commit. The current notification and toast paths remain the supported implementation.                                                                                                                                                                       |
| `copilot/add-download-button-igdb-torznab`     | The tip contains only an empty “Initial plan” commit. Download actions are already part of the current game and release workflows.                                                                                                                                                                        |
| `copilot/chore-run-release-1-3-0`              | The only branch-specific commit is an empty “Initial plan”; the 1.3 release is already historical, and current tag preparation uses the maintained release workflow.                                                                                                                                      |
| `copilot/implement-minimal-qbittorrent-client` | The tip contains only an empty “Initial plan” commit. Questarr already has its supported qBittorrent downloader implementation.                                                                                                                                                                           |
| `copilot/summarize-app-functionalities`        | The tip contains only an empty “Initial plan” commit. The maintained README remains the current feature overview.                                                                                                                                                                                         |
| `copilot/update-tsconfig-strictness-flags`     | Experiment outcome: TypeScript 7 plus additional strict flags failed CI on existing errors. The branch reverted to TypeScript 6.0.3, kept `noFallthroughCasesInSwitch`, then removed it because `strict` already covers that check. No TypeScript 7 upgrade was adopted.                                  |
| `hotfix/v1.4.1` and `hotfix/v1.4.2`            | Their release tags remain intact. The mainline lockfile already carries newer fixes for the branch's `body-parser`, `brace-expansion`, `fast-xml-parser`, `js-yaml`, `minimatch`, and `socket.io-parser` versions. The remaining `ip-address` advisory is fixed on main with the current 10.7.x override. |

## Mainline integrity fixes found in the audit

The audit found truncated importer code on the local mainline: directory archive resolution, categorized file transfer, and the final path-security function brace had been dropped. Those paths have been restored before release preparation. The obsolete single-note endpoint was removed after personal notes moved to the per-user game journal; clients use the journal routes now.
