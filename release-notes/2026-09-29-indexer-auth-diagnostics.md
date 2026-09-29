---
category: fixed
audience: operators
area: indexers
action: For HTTP Prowlarr feeds, enable “Send the API key to Prowlarr indexers over HTTP” during sync or allow HTTP per indexer; the downloader option is separate.
breaking: false
---

Questarr now identifies HTTP 401 errors caused by withholding an indexer key and removes keys from feed logs. Its downloader test also reports when the HTTP opt-in did not reach the test request, separating that setting from indexer authentication.
