---
category: security
audience: operators
area: proxy
action: none
breaking: false
---

YunoHost proxy requests now use a fixed upstream host and forward WebSocket upgrades only, blocking attacker-controlled host and h2c upgrade headers.
