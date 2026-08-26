---
id: rk10gu
type: risk
title: >-
  The claim file format becomes an unversioned public schema the moment users
  have .continuity/ directories
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T07:26:46.986Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  It gets strictly more expensive to retrofit with every user who accumulates
  state, and this project has already changed the format twice in one week — so
  the cost is demonstrated, not hypothetical.
---

Claim frontmatter (id, type, status, confidence, provenance, supersedes, superseded_by, depends_on, resolution, conflicts_with) and the id shape are a de-facto contract as soon as anyone else's repo holds claims. There is currently NO version field on a claim and NO migration path.

Evidence the format moves: the id scheme changed to add the collision-safe suffix (d17), a `resolution` field was added for the resolve verb (d21lp), and the status default per type changed (a1) — all within days. Any of those would have broken third-party state silently, because parseClaim tolerates missing fields rather than failing loudly, so an old claim read by new code degrades quietly instead of erroring.

Fix while it is still cheap: add a schema version to each claim (or a single .continuity/VERSION), and a documented upgrade path that reads older shapes. This is the one item on the pre-scale list that gets harder the longer it waits — CI and SECURITY.md can be added at any time; a migration story cannot be retrofitted onto state that already exists in the wild.
