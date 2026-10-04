---
category: security
audience: users, operators
area: dependencies
action: none
breaking: false
---

All application dependencies now pass the full npm security audit, including development tooling. The cache-policy fix from upstream PR #60 is covered locally while it awaits maintainer review, and license checks no longer pull in a separate npm resolver stack.
