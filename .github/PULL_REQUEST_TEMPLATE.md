# Pull Request _Template_

## Description

Please include a summary of the change and which issue is fixed. Please also include relevant motivation and context. List any dependencies that are required for this change.

## Screenshots

For any UI change (`client/src/**`), include a screenshot or short recording of it running. Not required for backend-only changes.

## Type of change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Release notes

Add one validated fragment under `release-notes/` for every user-facing
behavior, security, operational, or documentation change. For internal-only
changes, include `release-note: none` in this description.

- [ ] I added a release-note fragment under `release-notes/`.
- [ ] This change is internal-only and does not need a user-facing release note.
- [ ] I previewed the release text with `npm run release-notes:preview`.

## Checklist:

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] If this PR adds a new actor/integration, external interface, or security-relevant change, I have updated docs/ARCHITECTURE.md, docs/API.md, and/or docs/SECURITY_ASSESSMENT.md accordingly
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] For UI changes, I have included a screenshot or recording of it running
