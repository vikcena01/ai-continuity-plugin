---
schema: 1
id: d36jr
type: decision
title: Amend an unconsumed version rather than cutting a patch on top of it
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T08:57:39.744Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  The owner's call on 1.3.1: a patch release fixing an unreleased version is
  bookkeeping noise, not information, and it inflates the version history with
  numbers nobody ever ran.
---

Test for 'unconsumed' — all three must hold: no GitHub Release object exists for it, no directory is serving it (Glama's score page names the version it has), and nothing pins that version number. If any fails, cut the patch instead.

Done on 2026-09-03: 1.3.1's fixes were folded into 1.3.0, the tag moved to the folded commit, and v1.3.1 was deleted from the remote.

Why this is safe where a history rewrite is not: only version fields and the tag target change. Every commit SHA is intact, so the marketplace pin c6vg protects is untouched. Do not confuse the two — retagging is cheap and reversible, rewriting history is neither.
