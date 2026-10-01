# Release-note fragments

Add one Markdown fragment under this directory for every user-facing change.
The tag workflow adds new fragments to the versioned GitHub release notes and
the Discord announcement. Keep `docs/CHANGELOG.md` as the chronological release
history.

Each fragment has YAML-style frontmatter and one release-ready sentence:

```md
---
category: fixed
audience: users, operators
area: downloads
action: none
breaking: false
---

Download searches now keep their API credentials private when an indexer returns an error.
```

Supported categories are `added`, `changed`, `fixed`, `security`, `removed`,
and `deprecated`. Set `audience` to `users`, `operators`, or both; use a short
lowercase `area` slug; describe any required operator action or use `none`; and
mark whether the change is breaking. Breaking changes must include an action.

Keep the body between 30 and 400 characters, start with a capitalized sentence,
and end with punctuation. Released fragments are immutable: add a new file for
later refinements instead of editing a fragment already shipped in a release.

Preview the notes added between two refs with:

```sh
npm run release-notes:preview -- --base origin/main --head HEAD
```

For internal-only pull requests, write `release-note: none` in the PR body or
select the internal-only release-note option in the pull request template.
