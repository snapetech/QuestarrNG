# OpenSSF Best Practices Evidence for QuestarrNG

This document records repository evidence for the [OpenSSF Best Practices Badge](https://www.bestpractices.dev/)
criteria relevant to QuestarrNG. It describes the `snapetech/QuestarrNG` fork as
it stood on **2026-10-07**. It is an evidence ledger, not a submitted OpenSSF
profile or a claim that every criterion is met.

QuestarrNG is derived from [Doezer/Questarr](https://github.com/Doezer/Questarr),
but the two repositories have separate maintainers, issue trackers, release
histories, and review records. Upstream activity is not counted as QuestarrNG
evidence here.

## [report_responses]

**Status: Not yet assessable from QuestarrNG history.**

The fork was created on 2026-09-25. At this assessment, its issue tracker has no
issues, and the repository has not existed for the full 2-to-12-month response
window. There are no QuestarrNG bug reports in that window from which to measure
acknowledgement. The response statistics previously recorded for Doezer/Questarr
are upstream-only and do not apply to this criterion for QuestarrNG.

Evidence: [QuestarrNG issue tracker](https://github.com/snapetech/QuestarrNG/issues)
and [repository](https://github.com/snapetech/QuestarrNG).

## [enhancement_responses]

**Status: Not yet assessable from QuestarrNG history.**

The fork has no issue history covering the criterion's 2-to-12-month window, so
there are no QuestarrNG enhancement requests on which to assess responses. The
enhancement statistics previously recorded for Doezer/Questarr are upstream-only
and are not attributed to this fork.

Evidence: [QuestarrNG issue tracker](https://github.com/snapetech/QuestarrNG/issues).

## [warnings_strict]

**Status: Met.**

- [`tsconfig.json`](../tsconfig.json) enables TypeScript `strict` mode and the
  additional checks `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch`, `noImplicitReturns`,
  `exactOptionalPropertyTypes`, and `noUncheckedIndexedAccess`.
- [`eslint.config.js`](../eslint.config.js) includes recommended JavaScript and
  TypeScript rules plus project-specific rules. Some rules are warnings, but
  `npm run lint` invokes ESLint with `--max-warnings 0`, so a warning fails the
  command.
- [`package.json`](../package.json) defines `check` as `tsc` and `lint` as the
  zero-warning ESLint command. The CI workflow runs both as blocking checks for
  pushes and pull requests.

Evidence: [`ci.yml`](../.github/workflows/ci.yml),
[`tsconfig.json`](../tsconfig.json),
[`eslint.config.js`](../eslint.config.js), and
[`package.json`](../package.json).

## [dynamic_analysis]

**Status: Routine analysis is active; release-specific timing is recorded below.**

[`dast.yml`](../.github/workflows/dast.yml) builds and starts the production
server, waits for its health endpoint, and runs the OWASP ZAP baseline scan
against that live instance. It runs on pushes to `main` and `release/*`, weekly,
and by manual dispatch. `fail_action: true` makes unignored scan alerts fail the
workflow; accepted rule IDs and their rationale are recorded in
[`.zap/rules.tsv`](../.zap/rules.tsv).

The successful DAST run on the `main` commit for v1.9.1 is
[run 37546640378](https://github.com/snapetech/QuestarrNG/actions/runs/37546640378).
The v1.9.1 release was published at 23:17 UTC on 2026-10-06, and this run
started at 23:27 UTC. It is evidence of routine scanning, not evidence that the
scan completed before that release was published. No major release occurred in
this evidence period.

## [dynamic_analysis_enable_assertions]

**Status: Met.**

The project uses Vitest for unit and integration tests. The CI workflow runs
`npm test -- --coverage`; failing assertions or configured coverage thresholds
fail the job. Vitest is a development dependency, and the production
[`Dockerfile`](../Dockerfile) runs `npm prune --omit=dev` before assembling the
runtime image, keeping the test framework out of the shipped application.

Evidence: [`ci.yml`](../.github/workflows/ci.yml),
[`package.json`](../package.json), [`vitest.config.ts`](../vitest.config.ts),
and [`Dockerfile`](../Dockerfile).

## [dynamic_analysis_fixed]

**Status: Enforcement is active; see the limits below.**

The DAST workflow uses `fail_action: true` and a checked-in ZAP rules file.
[`docs/VULNERABILITY_MANAGEMENT.md`](VULNERABILITY_MANAGEMENT.md) records the
triage process and ZAP rule dispositions. Its initial-scan narrative is dated
before the QuestarrNG repository was created, so it is inherited baseline
history rather than a QuestarrNG-originated finding report. The current fork
also retains the documented limitation that ZAP rule 10055 covers both the
accepted `style-src unsafe-inline` alert and the wildcard-directive check. The
latter has a compensating regression assertion in
[`server/__tests__/security.test.ts`](../server/__tests__/security.test.ts).
The latest successful fork-hosted DAST run is linked under
[`dynamic_analysis`](#dynamic_analysis).

This evidence describes the configured gate and recorded dispositions; it does
not claim that dynamic analysis can discover every exploitable vulnerability.
The rule-level suppression and its compensating test should be reviewed if ZAP
changes its alert IDs or behavior.

## Current OpenSSF Scorecard findings

These repository-level findings are separate from the Badge criteria above.
They were open in GitHub Code Scanning at the assessment date:

| Finding | Fork-specific evidence and status |
| --- | --- |
| [CodeReviewID #10](https://github.com/snapetech/QuestarrNG/security/code-scanning/10) | The latest [Scorecard run](https://github.com/snapetech/QuestarrNG/actions/runs/37551160492) still reports 0/20 reviewed changesets. PRs [#17](https://github.com/snapetech/QuestarrNG/pull/17) and [#18](https://github.com/snapetech/QuestarrNG/pull/18) have maintainer reviews submitted after they merged; those retrospective reviews are recorded transparently and are not pre-merge approvals. The `main` branch currently requires one approving review and enforces the rule for administrators. That protects future pull requests but does not rewrite the review history of already merged changes. |
| [MaintainedID #11](https://github.com/snapetech/QuestarrNG/security/code-scanning/11) | GitHub records the repository creation date as 2026-09-25. The fork published [v1.9.1](https://github.com/snapetech/QuestarrNG/releases/tag/v1.9.1) on 2026-10-06 and has active CI and security workflows, but its public history is less than 90 days old. The age signal is a project-maturity heuristic, not a vulnerability finding. |
| [CIIBestPracticesID #12](https://github.com/snapetech/QuestarrNG/security/code-scanning/12) | No QuestarrNG OpenSSF Best Practices profile was registered as of this assessment. This file gathers repository evidence but does not create or attest to a profile. |

The repository's current branch-protection rule requires one approving review,
enforces that rule for administrators, and requires the 12 status checks emitted
by the current PR workflows. Obsolete check names left over from an earlier CI
layout were removed; the active required checks include CI tests/builds, SCA,
CodeQL, and both Semgrep gates. See [GitHub branch protection
settings](https://github.com/snapetech/QuestarrNG/settings/branches).
The open Code Scanning findings remain visible until Scorecard reports that their
underlying conditions have changed.

## Repository evidence index

- Project identity, fork changes, and user support: [README](../README.md)
- Security reporting and access policy: [SECURITY.md](SECURITY.md)
- Threat model and security risk assessment: [THREAT_MODEL.md](THREAT_MODEL.md),
  [SECURITY_ASSESSMENT.md](SECURITY_ASSESSMENT.md)
- Vulnerability triage and scan policy: [VULNERABILITY_MANAGEMENT.md](VULNERABILITY_MANAGEMENT.md)
- API and integration contract: [API.md](API.md) and
  [OpenAPI contract](contracts/seerrng-v1.openapi.yaml)
- License: [COPYING](../COPYING)
- Current release history: [CHANGELOG.md](CHANGELOG.md) and
  [GitHub releases](https://github.com/snapetech/QuestarrNG/releases)
- CI, CodeQL, SAST, DAST, and Scorecard workflows: [workflow directory](../.github/workflows)

**Update this record** when the repository's public history, CI/security gates,
or the cited criteria evidence changes. Recheck time-window criteria against
QuestarrNG's own issue tracker; do not substitute upstream statistics.
