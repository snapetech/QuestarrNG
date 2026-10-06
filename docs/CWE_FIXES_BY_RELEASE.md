# QuestarrNG — CWEs addressed per released tag (v1.2.0 → v1.9.1)

Method: same as [`docs/CVE_FIXES_BY_RELEASE.md`](CVE_FIXES_BY_RELEASE.md) — diffed `package-lock.json` at each
tag boundary and cross-checked every bumped package through OSV.dev. Each advisory is then mapped to its CWE
IDs sourced from the `database_specific.cwe_ids` field in the OSV.dev response.
Data refreshed 2026-10-04. For example, OSV records may list `["CWE-400", "CWE-770"]`;
older records used `database_specific.cwes`). The script that automates this
process is `scripts/cwe-report.mjs`.

This document gives a **weakness-category view** of what was addressed across releases — useful for tracking
which classes of bugs (injection, DoS, memory safety, SSRF, …) were systematically reduced over time. The
companion CVE doc lists the same findings by severity and package. The two documents are complementary;
neither replaces the other.

Scope note: same as the CVE doc — this covers dependency-bump _fixes_, not a full current-exposure audit.
First-party code weaknesses are tracked separately in [`docs/SECURITY_ASSESSMENT.md`](SECURITY_ASSESSMENT.md)
and [`docs/THREAT_MODEL.md`](THREAT_MODEL.md).

QuestarrNG's v1.5.0 release was not published. Its completed work was included
in v1.6.0, the first published fork release.

---

## v1.2.0 (from v1.1.0)

### CWE-400: Uncontrolled Resource Consumption

- **fast-xml-parser** 5.3.3 → 5.3.4 — CVE-2026-25128 — numeric entity parsing caused a RangeError DoS;
  no upper bound on expansion count.

---

## v1.2.1 (from v1.2.0)

### CWE-1333: Inefficient Regular Expression Complexity

- **fast-xml-parser** 5.3.4 → 5.3.5 — CVE-2026-25896 — regex injection in DOCTYPE entity names allowed an
  attacker to craft a payload triggering catastrophic backtracking; classified as injection-via-regex (ReDoS).

---

## v1.2.2 (from v1.2.1)

### CWE-400: Uncontrolled Resource Consumption

- **fast-xml-parser** 5.3.5 → 5.3.7 — CVE-2026-26278 — entity expansion in DOCTYPE had no recursion depth
  limit, enabling unbounded memory growth via a small document.

---

## v1.3.0 (from v1.2.2) — largest security-relevant release

### CWE-89: Improper Neutralization of Special Elements used in an SQL Command

- **drizzle-orm** 0.45.1 → 0.45.2 — CVE-2026-39356 — SQL identifiers were not properly escaped, allowing
  injection via user-controlled column/table names passed to query builders.

### CWE-91: XML Injection

- **fast-xml-parser** 5.3.7 → 5.7.1 — CVE-2026-41650 — XML comment and CDATA delimiters were not escaped in
  XMLBuilder output, allowing injected markup when user data flowed through the serialiser.

### CWE-290: Authentication Bypass by Spoofing

- **express-rate-limit** 8.2.1 → 8.3.2 — CVE-2026-30827 — IPv4-mapped IPv6 addresses (e.g. `::ffff:1.2.3.4`)
  were not normalised to their IPv4 form, giving dual-stack clients two independent rate-limit buckets and
  allowing effective bypass of per-client limits.

### CWE-295: Improper Certificate Validation

- **node-forge** 1.3.3 → 1.4.0 — CVE-2026-33896 — `basicConstraints` and RFC 5280 path-length constraints
  were not validated during certificate-chain building, enabling a crafted intermediate to forge a trusted leaf
  certificate.

### CWE-347: Improper Verification of Cryptographic Signature

- **node-forge** 1.3.3 → 1.4.0 — CVE-2026-33894 — RSA-PKCS1 v1.5 signature verification was susceptible to a
  Bleichenbacher-style chosen-ciphertext attack, allowing signature forgery without the private key.
- **node-forge** 1.3.3 → 1.4.0 — CVE-2026-33895 — Ed25519 signature verification did not check for canonical
  scalar encoding, allowing signature malleability (different byte sequences passing for the same signature).

### CWE-400: Uncontrolled Resource Consumption

- **fast-xml-parser** 5.3.7 → 5.7.1 — CVE-2026-33036 — incomplete fix for CVE-2026-26278; a numeric entity
  bypass re-enabled unbounded expansion even when a limit was configured.
- **fast-xml-parser** 5.3.7 → 5.7.1 — CVE-2026-33349 — entity expansion limit treated as JS falsy when set
  to `0`, silently disabling all protection.
- **multer** 2.0.2 → 2.1.1 — CVE-2026-2359 — resource exhaustion via concurrent upload requests with
  pathological field layouts.
- **multer** 2.0.2 → 2.1.1 — CVE-2026-3304 — incomplete cleanup of aborted uploads consumed disk space until
  the process ran out of writable storage.
- **socket.io-parser** 4.2.5 → 4.2.6 — CVE-2026-33151 — unbounded binary attachments in Socket.IO messages
  were buffered in memory without any size limit, enabling memory exhaustion DoS.

### CWE-459: Incomplete Cleanup

- **multer** 2.0.2 → 2.1.1 — CVE-2026-3304 — see CWE-400 entry above; incomplete cleanup of aborted uploads
  is classified under both resource consumption and incomplete cleanup.

### CWE-674: Uncontrolled Recursion

- **fast-xml-parser** 5.3.7 → 5.7.1 — CVE-2026-27942 — `XMLBuilder` with `preserveOrder: true` recursed into
  nested structures without a depth guard, causing a stack overflow on deeply nested input.
- **multer** 2.0.2 → 2.1.1 — CVE-2026-3520 — uncontrolled recursion when parsing multipart payloads with
  deeply nested boundary markers; exploitable with a crafted ~4 KB request body.

### CWE-835: Loop with Unreachable Exit Condition (Infinite Loop)

- **node-forge** 1.3.3 → 1.4.0 — CVE-2026-33891 — `BigInteger.modInverse(0)` entered an infinite loop with no
  exit path; reachable via crafted RSA public keys or DH parameters.

---

## v1.3.1 (from v1.3.0)

No dependency bump in this release crosses a `fixed` OSV boundary — no CWE fixes to attribute.

---

## v1.4.0 (from v1.3.1)

### CWE-20: Improper Input Validation

- **qs** 6.14.2 → 6.15.2 — CVE-2026-8723 — `qs.stringify` threw an uncaught `TypeError` when it encountered
  `null`/`undefined` array entries with `encodeValuesOnly` set; missing input guard turned invalid data into a
  remotely-triggerable DoS.

### CWE-22: Improper Limitation of a Pathname to a Restricted Directory (Path Traversal) _(devDep)_

- **vite** 8.0.12 → 8.1.4 — CVE-2026-53571 — `server.fs.deny` allow-list bypass; crafted paths using URL
  encoding evaded the restriction and allowed arbitrary file reads from the dev server's host filesystem.

### CWE-93: Improper Neutralization of CRLF Sequences

- **form-data** 4.0.5 → 4.0.6 — CVE-2026-12143 — multipart field names and filenames were passed through to
  MIME headers without stripping `\r\n` sequences, allowing header injection in any HTTP client that consumed
  the generated body (e.g. proxied upload forwarding).

### CWE-200: Exposure of Sensitive Information to an Unauthorised Actor _(devDep)_

- **vite** 8.0.12 → 8.1.4 — CVE-2026-53632 — the `launch-editor` integration passed user-supplied paths
  through to an OS shell command on Windows; a UNC path could be crafted to trigger an outbound SMB connection
  and capture an NTLMv2 authentication hash from the developer's machine.

### CWE-400: Uncontrolled Resource Consumption

- **multer** 2.1.1 → 2.2.0 — CVE-2026-5079 — deeply nested field name arrays (e.g. `a[b][c][…]` repeated
  thousands of times) caused O(n²) processing and memory growth, eventually OOM-killing the process.
- **ws** 8.18.3 → 8.21.0 — CVE-2026-48779 — the receiver reassembled fragmented frames and tiny data chunks
  without a per-message size cap, allowing memory exhaustion from a stream of small messages.

### CWE-457: Use of Uninitialized Variable

- **ws** 8.18.3 → 8.21.0 — CVE-2026-45736 — a buffer slice was returned to callers before being zeroed,
  leaking up to 124 bytes of adjacent heap content from a prior message in the same allocation region.

### CWE-459: Incomplete Cleanup

- **multer** 2.1.1 → 2.2.0 — CVE-2026-5038 — aborted uploads left temporary files on disk; the cleanup path
  was skipped when the request was destroyed before the `finish` event fired.

### CWE-770: Allocation of Resources Without Limits or Throttling

- **brace-expansion** 5.0.6 → 5.0.7 — CVE-2026-45149 — a crafted large numeric range (e.g. `{1..999999999}`)
  bypassed the documented DoS protection; the guard checked only the final count, not intermediate string
  lengths, so the per-item buffer could exhaust memory before the limit was tested.

### CWE-1333: Inefficient Regular Expression Complexity

- **js-yaml** 4.1.1 → 5.2.1 — CVE-2026-53550 — YAML merge keys (`<<`) with repeated alias references caused
  O(n²) work during parsing; a payload under 10 KB could delay processing by several seconds.

---

## v1.4.1 (from v1.4.0) — hotfix

### CWE-400: Uncontrolled Resource Consumption

- **brace-expansion 5.0.7 → 5.0.9** — CVE-2026-14257 (GHSA-mh99-v99m-4gvg) — brace-expansion DoS via unbounded expansion length causing an out-of-memory process crash
- **brace-expansion 5.0.7 → 5.0.9** — CVE-2026-13149 (GHSA-3jxr-9vmj-r5cp) —
- **brace-expansion 5.0.7 → 5.0.9** — CVE-2026-69152 (GHSA-rgw5-rvv9-x895) — brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation

### CWE-407: Inefficient Algorithmic Complexity

- **brace-expansion 5.0.7 → 5.0.9** — CVE-2026-13149 (GHSA-3jxr-9vmj-r5cp) —
- **js-yaml 5.2.1 → 5.2.2** — CVE-2026-73643 (GHSA-pm4m-ph32-ghv5) — js-yaml: Exponential parsing time in the flow collections leads to denial of service

### CWE-436: Interpretation Conflict

- **fast-uri 3.1.3 → 3.1.4** — CVE-2026-16221 (GHSA-v2hh-gcrm-f6hx) — fast-uri vulnerable to host confusion via literal backslash authority delimiter _(devDep)_

### CWE-770: Allocation of Resources Without Limits or Throttling

- **brace-expansion 5.0.7 → 5.0.9** — CVE-2026-14257 (GHSA-mh99-v99m-4gvg) — brace-expansion DoS via unbounded expansion length causing an out-of-memory process crash
- **brace-expansion 5.0.7 → 5.0.9** — CVE-2026-69152 (GHSA-rgw5-rvv9-x895) — brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation
- **body-parser 1.20.5 → 1.20.6** — CVE-2026-12590 (GHSA-v422-hmwv-36x6) — body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement

### CWE-776: Improper Restriction of Recursive Entity References in DTDs ('XML Entity Expansion')

- **fast-xml-parser 5.10.0 → 5.10.1** — CVE-2026-73569 (GHSA-8r6m-32jq-jx6q) — fast-xml-parser: Repeated DOCTYPE declarations reset entity expansion limits

---

## v1.4.2 (from v1.4.1) — hotfix tag off v1.4.1

### CWE-20: Improper Input Validation

- **ip-address 10.2.0 → 10.5.0** — CVE-2026-69192 (GHSA-mwp4-54f8-5fhr) — ip-address: Address4 decodes leading-zero octets as decimal while resolvers decode them as octal, allowing SSRF and trust-boundary bypass
- **ip-address 10.2.0 → 10.5.0** — CVE-2026-54272 (GHSA-22jq-vg5j-6vgg) — ip-address: Misclassification of IPv4-mapped/NAT64 IPv6 addresses can bypass SSRF and trust-boundary checks
- **ip-address 10.2.0 → 10.5.0** — CVE-2026-69198 (GHSA-4xrf-jv44-h6hh) — ip-address: a CIDR suffix on the parsed address suppresses special-use classification and can bypass SSRF and trust-boundary checks
- **socket.io-parser 4.2.6 → 4.2.7** — CVE-2026-69185 (GHSA-2m8v-j782-fhvr) — Socket.IO: Zero-attachment Memory Exhaustion

### CWE-754: Improper Check for Unusual or Exceptional Conditions

- **socket.io-parser 4.2.6 → 4.2.7** — CVE-2026-69185 (GHSA-2m8v-j782-fhvr) — Socket.IO: Zero-attachment Memory Exhaustion

### CWE-918: Server-Side Request Forgery (SSRF)

- **ip-address 10.2.0 → 10.5.0** — CVE-2026-69192 (GHSA-mwp4-54f8-5fhr) — ip-address: Address4 decodes leading-zero octets as decimal while resolvers decode them as octal, allowing SSRF and trust-boundary bypass
- **ip-address 10.2.0 → 10.5.0** — CVE-2026-54272 (GHSA-22jq-vg5j-6vgg) — ip-address: Misclassification of IPv4-mapped/NAT64 IPv6 addresses can bypass SSRF and trust-boundary checks
- **ip-address 10.2.0 → 10.5.0** — CVE-2026-69198 (GHSA-4xrf-jv44-h6hh) — ip-address: a CIDR suffix on the parsed address suppresses special-use classification and can bypass SSRF and trust-boundary checks

---

## v1.6.0 (first published fork release; changes since v1.4.2)

### Production dependencies

#### CWE-20

- **fast-uri** 3.1.4 → 3.1.7 — fixes CVE-2026-75975: fast-uri vulnerable to server-side request forgery via malformed IPv6 normalization
- **undici** 7.28.0 → 6.28.0/8.10.2 — fixes CVE-2026-84947: undici vulnerable to response truncation via oversized chunked responses in the dump interceptor

#### CWE-74

- **axios** 1.18.1 → 1.20.0 — fixes CVE-2026-101900: Axios: Fetch Adapter Header Injection via Inherited FormData getHeaders
- **axios** 1.18.1 → 1.20.0 — fixes CVE-2026-101904: Axios: Header Injection via Inherited headers After Minimal Interceptor
- **undici** 7.28.0 → 6.28.0/8.10.2 — fixes CVE-2026-16729: undici vulnerable to cookie attribute injection via unsanitized domain and unparsed setCookie fields

#### CWE-93

- **undici** 7.28.0 → 6.28.0/8.10.2 — fixes CVE-2026-15157: undici vulnerable to CRLF Injection via blob-like body 'type' property

#### CWE-116

- **fast-uri** 3.1.4 → 3.1.7 — fixes CVE-2026-84292: fast-uri vulnerable to authority injection via an unvalidated port in serialize

#### CWE-174

- **fast-uri** 3.1.4 → 3.1.7 — fixes CVE-2026-75899: fast-uri vulnerable to server-side request forgery via repeated hostname percent-decoding

#### CWE-177

- **fast-uri** 3.1.4 → 3.1.7 — fixes CVE-2026-76172: fast-uri vulnerable to host confusion via percent-encoded scheme normalization

#### CWE-200

- **undici** 7.28.0 → 6.28.0/8.10.2 — fixes CVE-2026-84933: undici vulnerable to cross-user cookie disclosure via Set-Cookie caching in shared caches
- **undici** 7.28.0 → 6.28.0/8.10.2 — fixes CVE-2026-13697: undici vulnerable to cross-user information disclosure and parse-time crash via degenerate private cache directives

#### CWE-248

- **multer** 2.2.0 → 2.4.0 — fixes CVE-2026-77078: multer vulnerable to Denial of Service via crafted multipart field names
- **qs** 6.15.2 → 6.16.0 — fixes CVE-2026-82417: qs: Denial of Service via Attacker Controlled isBuffer
- **undici** 7.28.0 → 6.28.0/8.10.2 — fixes CVE-2026-84947: undici vulnerable to response truncation via oversized chunked responses in the dump interceptor
- **undici** 7.28.0 → 6.28.0/8.10.2 — fixes CVE-2026-13697: undici vulnerable to cross-user information disclosure and parse-time crash via degenerate private cache directives
- **undici** 7.28.0 → 6.28.0/8.10.2 — fixes CVE-2026-85014: undici vulnerable to Denial of Service via WebSocketStream unclean close

#### CWE-295

- **undici** 7.28.0 → 6.28.0/8.10.2 — fixes CVE-2026-84961: undici vulnerable to TLS certificate validation bypass via dropped connect options in BalancedPool

#### CWE-345

- **undici** 7.28.0 → 6.28.0/8.10.2 — fixes CVE-2026-85008: undici vulnerable to caching and replay of unsafe HTTP method responses

#### CWE-362

- **multer** 2.2.0 → 2.4.0 — fixes CVE-2026-77063: multer vulnerable to file size limit bypass via async fileFilter race condition

#### CWE-400

- **axios** 1.18.1 → 1.20.0 — fixes CVE-2026-101901: Axios: Denial of Service via Unhandled 'error' Event in HTTP/2 ClientHttp2Session Initialization
- **axios** 1.18.1 → 1.20.0 — fixes CVE-2026-101906: Axios: ReDoS (O(N²)) in shouldBypassProxy host normalization, reachable via untrusted redirect Location
- **ip-address** 10.5.0 → 10.7.2 — fixes CVE-2026-101911: ip-address: Address6 builds a parse diagnostic proportional to the input with no length bound, allowing a single long string to stall or crash the process
- **js-yaml** 4.3.0/5.2.2 → 4.3.2/5.4.2 — fixes CVE-2026-84375: js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources
- **js-yaml** 4.3.0/5.2.2 → 4.3.2/5.4.2 — fixes GHSA-r3ph-w7gj-g6xm: js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources
- **multer** 2.2.0 → 2.4.0 — fixes CVE-2026-88932: multer vulnerable to Denial of Service via orphaned disk writes on aborted uploads
- **multer** 2.2.0 → 2.4.0 — fixes CVE-2026-82333: multer vulnerable to Denial of Service via oversized array index in field names
- **multer** 2.2.0 → 2.4.0 — fixes CVE-2026-77037: multer vulnerable to Denial of Service via file descriptor leak on aborted uploads

#### CWE-407

- **js-yaml** 4.3.0/5.2.2 → 4.3.2/5.4.2 — fixes CVE-2026-84375: js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources
- **js-yaml** 4.3.0/5.2.2 → 4.3.2/5.4.2 — fixes GHSA-5p4m-2wfm-xmqj: JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported
- **js-yaml** 4.3.0/5.2.2 → 4.3.2/5.4.2 — fixes GHSA-r3ph-w7gj-g6xm: js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources

#### CWE-436

- **fast-uri** 3.1.4 → 3.1.7 — fixes CVE-2026-75931: fast-uri vulnerable to host confusion via skipped IDN canonicalization on scheme-relative references
- **fast-uri** 3.1.4 → 3.1.7 — fixes CVE-2026-18446: fast-uri vulnerable to host confusion via backslash authority introducer
- **undici** 7.28.0 → 6.28.0/8.10.2 — fixes CVE-2026-14643: undici vulnerable to cross-user information disclosure via whitespace around equals in Cache-Control directives

#### CWE-441

- **axios** 1.18.1 → 1.20.0 — fixes CVE-2026-101905: Axios: Node HTTP adapter prototype-pollution gadget allows request socket hijack via inherited createConnection
- **axios** 1.18.1 → 1.20.0 — fixes CVE-2026-101907: Axios: maxRedirects: 0 is not enforced by the fetch adapter, allowing redirect-based SSRF

#### CWE-444

- **undici** 7.28.0 → 6.28.0/8.10.2 — fixes CVE-2026-16728: undici vulnerable to downstream response desynchronization via retry interceptor

#### CWE-459

- **multer** 2.2.0 → 2.4.0 — fixes CVE-2026-88932: multer vulnerable to Denial of Service via orphaned disk writes on aborted uploads
- **multer** 2.2.0 → 2.4.0 — fixes CVE-2026-77037: multer vulnerable to Denial of Service via file descriptor leak on aborted uploads

#### CWE-524

- **undici** 7.28.0 → 6.28.0/8.10.2 — fixes CVE-2026-84933: undici vulnerable to cross-user cookie disclosure via Set-Cookie caching in shared caches
- **undici** 7.28.0 → 6.28.0/8.10.2 — fixes CVE-2026-14643: undici vulnerable to cross-user information disclosure via whitespace around equals in Cache-Control directives

#### CWE-525

- **undici** 7.28.0 → 6.28.0/8.10.2 — fixes CVE-2026-13697: undici vulnerable to cross-user information disclosure and parse-time crash via degenerate private cache directives

#### CWE-601

- **axios** 1.18.1 → 1.20.0 — fixes CVE-2026-101907: Axios: maxRedirects: 0 is not enforced by the fetch adapter, allowing redirect-based SSRF

#### CWE-693

- **axios** 1.18.1 → 1.20.0 — fixes CVE-2026-101899: Axios: CIDR-form NO_PROXY entries are ignored, causing proxy exclusion bypass for internal IP ranges
- **axios** 1.18.1 → 1.20.0 — fixes CVE-2026-101900: Axios: Fetch Adapter Header Injection via Inherited FormData getHeaders

#### CWE-697

- **ip-address** 10.5.0 → 10.7.2 — fixes CVE-2026-101912: ip-address: isInSubnet() and isHostInSubnet() compare addresses of different families as if they shared an address space, allowing an allowlist check to admit an address outside its range
- **ip-address** 10.5.0 → 10.7.2 — fixes CVE-2026-101913: ip-address: Address6.isLinkLocal() recognizes fe80::/64 rather than fe80::/10, allowing SSRF and trust-boundary bypass to on-link hosts

#### CWE-703

- **qs** 6.15.2 → 6.16.0 — fixes CVE-2026-82417: qs: Denial of Service via Attacker Controlled isBuffer

#### CWE-754

- **undici** 7.28.0 → 6.28.0/8.10.2 — fixes CVE-2026-85014: undici vulnerable to Denial of Service via WebSocketStream unclean close

#### CWE-770

- **ip-address** 10.5.0 → 10.7.2 — fixes CVE-2026-101911: ip-address: Address6 builds a parse diagnostic proportional to the input with no length bound, allowing a single long string to stall or crash the process
- **qs** 6.15.2 → 6.16.0 — fixes CVE-2026-82562: qs array-limit bypass via bracket-key comma parsing
- **undici** 7.28.0 → 6.28.0/8.10.2 — fixes CVE-2026-84890: undici vulnerable to Denial of Service via unbounded decompression of compressed responses

#### CWE-772

- **undici** 7.28.0 → 6.28.0/8.10.2 — fixes CVE-2026-18149: undici vulnerable to Denial of Service via orphaned RetryHandler response body

#### CWE-835

- **nanoid** 6.0.0/3.3.12 → 6.0.1/3.3.18 — fixes CVE-2026-67214: nanoid: non-secure generators can loop indefinitely with negative size
- **nanoid** 6.0.0/3.3.12 → 6.0.1/3.3.18 — fixes CVE-2026-67213: nanoid: custom generators can loop indefinitely when size is zero

#### CWE-843

- **ip-address** 10.5.0 → 10.7.2 — fixes CVE-2026-101912: ip-address: isInSubnet() and isHostInSubnet() compare addresses of different families as if they shared an address space, allowing an allowlist check to admit an address outside its range

#### CWE-918

- **axios** 1.18.1 → 1.20.0 — fixes CVE-2026-101898: Axios: HTTP/2 adapter bypasses configured DNS lookup and proxy controls
- **fast-uri** 3.1.4 → 3.1.7 — fixes CVE-2026-75975: fast-uri vulnerable to server-side request forgery via malformed IPv6 normalization
- **fast-uri** 3.1.4 → 3.1.7 — fixes CVE-2026-75899: fast-uri vulnerable to server-side request forgery via repeated hostname percent-decoding
- **ip-address** 10.5.0 → 10.7.2 — fixes CVE-2026-101910: ip-address: no classifier recognizes the NAT64 local-use range 64:ff9b:1::/48, allowing SSRF and trust-boundary bypass
- **ip-address** 10.5.0 → 10.7.2 — fixes CVE-2026-101913: ip-address: Address6.isLinkLocal() recognizes fe80::/64 rather than fe80::/10, allowing SSRF and trust-boundary bypass to on-link hosts

#### CWE-1321

- **axios** 1.18.1 → 1.20.0 — fixes CVE-2026-101900: Axios: Fetch Adapter Header Injection via Inherited FormData getHeaders
- **axios** 1.18.1 → 1.20.0 — fixes CVE-2026-101902: Axios: Prototype-Pollution Gadget in the Default Instance Allows Inherited Object.prototype.method to Override HTTP Method
- **axios** 1.18.1 → 1.20.0 — fixes CVE-2026-101904: Axios: Header Injection via Inherited headers After Minimal Interceptor
- **axios** 1.18.1 → 1.20.0 — fixes CVE-2026-101905: Axios: Node HTTP adapter prototype-pollution gadget allows request socket hijack via inherited createConnection
- **axios** 1.18.1 → 1.20.0 — fixes CVE-2026-101908: Axios: Prototype pollution gadget in fetch adapter can alter outbound requests
- **axios** 1.18.1 → 1.20.0 — fixes CVE-2026-101909: Axios: Prototype Pollution Gadget in axios toFormData Options

#### CWE-1333

- **axios** 1.18.1 → 1.20.0 — fixes CVE-2026-101903: Axios: ReDoS in fromDataURI data: URL parser freezes the Node event loop (DoS)
- **axios** 1.18.1 → 1.20.0 — fixes CVE-2026-101906: Axios: ReDoS (O(N²)) in shouldBypassProxy host normalization, reachable via untrusted redirect Location

### Development dependencies

#### CWE-22

- **@vitest/mocker** 4.1.10 → 5.0.0 — fixes CVE-2026-84373: Vitest: Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock
- **postcss** 8.5.18 → 8.5.28 — fixes CVE-2026-69153: PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset
- **vitest** 4.1.10 → 5.0.0 — fixes CVE-2026-84373: Vitest: Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock

#### CWE-200

- **postcss** 8.5.18 → 8.5.28 — fixes CVE-2026-69153: PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset

#### CWE-248

- **browserslist** 4.28.4 → 4.28.9 — fixes CVE-2026-73088: Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats)

#### CWE-705

- **baseline-browser-mapping** 2.10.40 → 2.11.21 — fixes CVE-2026-45819: baseline-browser-mapping process termination on invalid input causes denial of service

#### CWE-770

- **browserslist** 4.28.4 → 4.28.9 — fixes CVE-2026-73089: Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM

#### CWE-1321

- **browserslist** 4.28.4 → 4.28.9 — fixes CVE-2026-73088: Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats)

457 other packages bumped in this range with no known CWE fix.

### Additional v1.6.0 fixes outside the npm/OSV report

`proxy-addr` 2.0.7 → 2.0.8 fixed **CVE-2026-90711** (CRITICAL), but OSV.dev had no CWE classification for that advisory when checked. Patched Alpine `openssl` and `expat` packages are operating-system fixes and are outside this npm dependency report.

## v1.6.0 → v1.6.1

No dependency version changes.

## v1.6.1 → v1.7.0

No dependency version changes.

## v1.7.0 → v1.7.1

No dependency version changes.

## v1.7.1 → v1.7.2

### Production dependencies

#### CWE-178

- **fast-uri** 3.1.7 → 3.1.8 — fixes CVE-2026-86472: fast-uri vulnerable to inconsistent host case normalization via percent-encoded octets

#### CWE-248

- **engine.io** 6.6.9 → 6.6.11 — fixes CVE-2026-102599: Socket.IO: Engine.IO Protocol Revision Mismatch DoS
- **undici** 6.28.0/8.10.2 → 6.29.0/8.11.2 — fixes CVE-2026-85024: undici vulnerable to Denial of Service via unhandled error in WebSocket permessage-deflate decompression
- **undici** 6.28.0/8.10.2 → 6.29.0/8.11.2 — fixes CVE-2026-19534: undici vulnerable to Denial of Service via unrequested WebSocket subprotocol

#### CWE-252

- **undici** 6.28.0/8.10.2 → 6.29.0/8.11.2 — fixes CVE-2026-19534: undici vulnerable to Denial of Service via unrequested WebSocket subprotocol

#### CWE-400

- **brace-expansion** 5.0.9 → 5.0.12 — fixes CVE-2026-102276: brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion
- **brace-expansion** 5.0.9 → 5.0.12 — fixes CVE-2026-102277: brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service
- **brace-expansion** 5.0.9 → 5.0.12 — fixes CVE-2026-102278: brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion

#### CWE-407

- **brace-expansion** 5.0.9 → 5.0.12 — fixes CVE-2026-102277: brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service

#### CWE-444

- **undici** 6.28.0/8.10.2 → 6.29.0/8.11.2 — fixes CVE-2026-18540: undici vulnerable to downstream response splitting via retry interceptor

#### CWE-674

- **brace-expansion** 5.0.9 → 5.0.12 — fixes CVE-2026-102276: brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion
- **brace-expansion** 5.0.9 → 5.0.12 — fixes CVE-2026-102278: brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion

100 other packages bumped in this range with no known CWE fix.

## v1.7.2 → v1.7.3

### Production dependencies

#### CWE-347

- **node-forge** 1.4.0 → (removed) — fixes CVE-2026-33894, CVE-2026-85393: node-forge RSA PKCS#1 v1.5 signature verification accepts extra nested DigestAlgorithm elements

1 other package bumped in this range with no known CWE fix.

## v1.7.3 → v1.8.0

No dependency version changes.

## v1.8.0 → v1.8.1

No dependency version changes.

## v1.8.1 → v1.8.2

No dependency version changes.

## v1.8.2 → v1.8.3

### Development dependencies

#### CWE-524

- **http-cache-semantics** 4.2.0 → (removed) — fixes CVE-2026-93748: http-cache-semantics max-stale handling can disclose cross-user cached responses

96 other packages bumped in this range with no known CWE fix.

## v1.8.3 → v1.9.0

No dependency version changes.

## v1.9.0 → v1.9.1

### CWE-1333 — Inefficient Regular Expression Complexity

- Replaced the whitespace-delimited regular expression in the vendored HTTP cache header parser with comma splitting and token trimming, avoiding polynomial work on untrusted header values.

### CWE-250 — Execution with Unnecessary Privileges

- The production Docker image now defaults to the dedicated `questarr` user. Compose and home-server definitions pass through the configured UID/GID so mounted data remains writable.
