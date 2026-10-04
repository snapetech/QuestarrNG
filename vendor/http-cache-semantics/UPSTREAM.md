# Upstream source

`index.js` is the upstream `http-cache-semantics` source at proposed commit
[`11fb104275349bbd84bf21eafd40b18220c29c46`](https://github.com/Sergey360/http-cache-semantics/commit/11fb104275349bbd84bf21eafd40b18220c29c46),
the head of [upstream PR #60](https://github.com/kornelski/http-cache-semantics/pull/60).
The PR remains unmerged and no fixed npm release is available for
[CVE-2026-93748](https://github.com/advisories/GHSA-ch52-4w7c-c8xp).

The source preserves the upstream BSD-2-Clause license and attribution in
[`LICENSE`](./LICENSE). Its custom version, `4.2.1-questarr.0`, identifies this
local fork and avoids presenting the patch as an upstream npm release. The
copy is a development dependency used by Questarr's cache-policy regression
tests.

The PR attributes earlier work to Max Nguyen and Alexis Ferreira; the
additional cumulative fixes and tests were contributed by Sergey360. See the
PR's attribution section for the individual commit history.
