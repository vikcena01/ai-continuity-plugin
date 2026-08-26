---
schema: 1
id: c9fv
type: constraint
title: >-
  History is frozen — one rewrite was taken deliberately after submission, and
  that was the last one
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T08:27:55.002Z'
supersedes:
  - c6vg
superseded_by: null
depends_on: []
tags: []
---

The rewrite is done and force-pushed: remote main and tag v1.0.0 both at abb6230, all sensitive names gone from contents AND from the one affected commit subject, claim SHA references remapped a third time, 85 assertions green. It was safe only because the plugin had not yet been approved, so no catalogue entry pinned a SHA.

From here treat history as immutable. Approved plugins are pinned to a commit SHA in the community catalogue and Anthropic's CI tracks new commits, so a rewrite breaks that pin from their side — a failure no remapping on ours can repair. Fix problems with new commits. If something absolutely must leave the history after approval, that is a conversation with the user about deleting and re-submitting the listing, not a rewrite.
