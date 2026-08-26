---
id: d29ka
type: decision
title: >-
  This repo pushes via a repo-local core.sshCommand, because the default SSH key
  authenticates as the wrong principal
  This repo pushes with the personal-account key via a repo-local core.sshCommand —
  the default key is a deploy key that hijacks GitHub auth
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T06:22:04.776Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Set repo-locally rather than globally because ~/.ssh is shared across several
  unrelated identities and changing the global default could break the user's
  other repos; a repo-local pointer to an existing key is reversible and touches
  no credentials.
---

Set repo-locally rather than globally because ~/.ssh holds several unrelated identities and changing
the global default could break other repos; a repo-local pointer to an existing key is reversible and
touches no credentials. Undo with `git config --local --unset core.sshCommand`.

The failure it fixes is subtle and worth recognising again: with several keys on disk and no
`Host github.com` block in ~/.ssh/config, ssh offers them in its own order, GitHub ACCEPTS the first
valid one, and authentication then succeeds as the WRONG principal. When that first key is a deploy
key — which is scoped to a single repository — every push to any other repo is refused with
'denied to deploy key', which reads like a missing key rather than a wrong one.

Diagnose by asking each key who it is:
  ssh -i <key> -o IdentitiesOnly=yes -T git@github.com
Read the greeting: `Hi owner/repo` means a deploy key (single repo only); `Hi user` means a user
account with that user's access. Key filenames are not reliable evidence of which account a key
belongs to — check, do not assume.

Also note `git ls-remote` against a PUBLIC repo succeeds with ANY valid key, so it proves nothing
about write access. Do not use it as an access test.
