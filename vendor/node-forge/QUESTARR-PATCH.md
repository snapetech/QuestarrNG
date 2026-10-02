# Questarr node-forge security patch

This vendored package starts from the npm `node-forge` 1.4.0 release. It carries
the nested `DigestAlgorithm` element-count validation proposed in upstream PR
1152 (upstream commit `ceba34402e329f0365134f23fe19898756527d65`) for
CVE-2026-85393 / GHSA-86w9-cpqp-85rv. The upstream change is limited to
RSASSA-PKCS1-v1_5 `DigestInfo` parsing: ASN.1 validation accepts unconsumed
children, so the parser now requires the nested sequence to contain exactly its
OID and, when present, its optional NULL parameter. The existing checks continue
to require NULL parameters for MD2 and MD5.

The fork retains the Node.js `lib` modules used by Questarr. Browser bundles and
Flash assets are omitted so shipped files cannot retain the vulnerable parser.

The fork version `1.4.1-questarr.2` identifies this local, patched copy; it is
not an upstream release. It also replaces PEM parser backtracking with a bounded
linear scan and omits the unused HTTP/XHR modules, whose unrelated CodeQL
findings do not affect Questarr's certificate and key operations. This is an
app-private Node.js subset, not a drop-in replacement for every node-forge API.

Preserve the upstream license and attribution in `LICENSE` and `README.md`.
Reconcile these changes with an upstream release that contains the fixes, then
remove the vendored copy.
