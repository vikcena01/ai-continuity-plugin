---
schema: 1
id: a3kw
type: architecture
title: >-
  In-place amend of next_action is compatible with d1 — git is the log, so the
  claim file need not be the log
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T07:36:52.086Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Store.amend overwrites a claim file, which reads as a direct violation of
  'nothing is ever deleted' to anyone who finds it later; without the
  reconciliation written down, the obvious move is to revert it and reintroduce
  the churn.
---

d1 says state is a projection over an append-only log, git commits ARE the log, and nothing is deleted from it. An in-place rewrite still appends a commit and the previous text stays in `git log -p` — asserted in test/churn.sh, not assumed. So the log remains append-only; what is dropped is a separate CLAIM per revision.

The distinction that makes it correct: lineage matters where something might be re-litigated. A reversed decision needs its predecessor and reason preserved as claims, because someone will ask why it changed. A superseded to-do list does not — nobody argues about last week's next step.

Scoped to next_action ONLY. Decisions, constraints, architecture and rejections still supersede with full lineage, and test/churn.sh asserts a decision supersede is NOT amended, so the shortcut cannot spread by accident.
