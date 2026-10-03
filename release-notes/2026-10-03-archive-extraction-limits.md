---
category: security
audience: operators
area: imports
action: Set ARCHIVE_MAX_EXPANDED_BYTES or ARCHIVE_MAX_ENTRIES if your archives need different limits.
breaking: false
---

Archive imports now reject traversal paths and links, and enforce configurable total-entry and declared-expansion limits before archive data is decompressed or written into a game library.
