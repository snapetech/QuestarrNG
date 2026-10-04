---
category: security
audience: operators
area: imports
action: none
breaking: false
---

Optional VirusTotal hash lookups and local ClamAV scans run before downloads are unpacked or moved into the library. Flagged files are quarantined and create a Security Alert instead of being imported.
