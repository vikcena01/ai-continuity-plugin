---
schema: 1
id: c15np
type: constraint
title: >-
  A capture audit must compare source conversations against captured claims —
  reviewing persisted claims measures precision only
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T07:26:27.090Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Reviewing what was stored is structurally blind to what was never stored, so
  an audit built only on `continuity review` would report a clean bill of health
  while missing the most damaging failure class.
---

Four labels, and only two are visible from the claim files alone:

  CORRECT          captured, and it deserved to be
  FALSE_POSITIVE   captured, but it was discussion not commitment
  MISCLASSIFIED    right content, wrong type/status/authority
  FALSE_NEGATIVE   should have become durable state, captured nothing  <- INVISIBLE to review

The denominator problem: if a durable constraint was never captured, no claim exists to review. Recall therefore requires going back to the source session and asking what SHOULD have been captured, independently of what was.

Separately check lifecycle on the claims that should exist: status, supersession, freeze state, lineage.
