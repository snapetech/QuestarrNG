---
category: added
audience: operators
area: indexers
action: Open Settings > Indexers > Prowlarr and select Test indexers to locate a feed failure.
breaking: false
---

Questarr now checks the Prowlarr management API separately from each enabled torrent or usenet feed. Operators can identify an individual feed failure such as HTTP 401 even when Prowlarr itself responds successfully; diagnostics do not include API keys or feed URLs.
