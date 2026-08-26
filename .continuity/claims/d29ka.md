---
id: d29ka
type: decision
title: >-
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

`git config --local core.sshCommand "ssh -i the personal-account key -o IdentitiesOnly=yes"`. Undo with `git config --local --unset core.sshCommand`.

The failure this fixes is subtle: ~/.ssh holds seven keys and there is NO `Host github.com` block in ~/.ssh/config, so ssh offered id_rsa first, GitHub ACCEPTED it, and authentication succeeded as the wrong principal — a deploy key scoped to a single unrelated repo. The error is 'denied to deploy key', which looks like a missing key rather than a wrong one. Key-to-identity map, since the names are actively misleading:
  id_rsa       -> an unrelated private repo  (deploy key, single repo, wins by default)
  id_vikcena   -> the work account (the WORK account, despite the name)
  the personal-account key -> vikcena01         (the personal account that owns this repo)
  v_medialayer -> v-medialayer-ai
Diagnose with `ssh -i <key> -o IdentitiesOnly=yes -T git@github.com` and read the greeting: `Hi owner/repo` means a deploy key, `Hi user` means a user account. Note that `git ls-remote` against a PUBLIC repo succeeds with any valid key, so it proves nothing about write access — do not use it as an access test.
