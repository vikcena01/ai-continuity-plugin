---
id: d24oo
type: decision
title: >-
  History was rewritten before the first push — every commit hash predating
  b27cb64 is invalid
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T05:50:08.023Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  The old work email sat in the CONTENT of 3 commits; changing the manifests
  would not have removed it from a public `git log -p`, and pre-push was the
  only moment a rewrite was free.
---

Rewrote with `git filter-branch --tree-filter` (git-filter-repo was not installed) replacing the address across all 59 commits, then remapped the four commit hashes cited in claim bodies by matching subjects. Any SHA quoted in an external note, issue, or older session transcript from before 2026-08-26 no longer exists — resolve them by commit SUBJECT, not hash.

Operational lesson worth keeping: filter-branch leaves the pre-rewrite history in refs/original/, so a naive grep of `git log --all -p` still finds the purged string and looks like failure. The refs must be deleted, the reflog expired, and `gc --prune=now` run before the objects are actually unreachable. Verify with `git grep <secret> $(git rev-list --all)` rather than by inspecting working-tree files.
