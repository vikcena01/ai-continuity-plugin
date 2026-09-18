---
schema: 1
id: c22ed
type: constraint
title: >-
  A fuzzy reference feeding a safety check must fail closed, and its ambiguous
  case must be tested
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-18T07:07:12.367Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  The frozen guard was bypassed for months by exactly this shape, and 186
  assertions never caught it because every one of them tested the guard WORKING
  rather than the guard being evaded.
---

The bug: conflicts_with was resolved with findOne, which returns undefined when a substring matches more than one claim, and `if (target && ...)` then skipped the guard. A claim contradicting a FROZEN one applied silently. Externally reported and reproduced 2026-09-18.

The rule: anywhere a fuzzy handle (id-or-title substring) feeds a guard, ambiguity must be treated as a HIT, not a miss — park or refuse, and name every candidate. Resolving to nothing is a different case and may proceed, but must say so.

The testing corollary, which is the part that actually failed: a guard test that only exercises the unambiguous path proves the guard runs, never that it cannot be evaded. Every guard needs a case that tries to slip past it. The same fuzzy resolution still feeds freeze, why, resolve and supersede — check each for the same shape.
