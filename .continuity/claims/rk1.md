---
id: rk1
type: risk
title: >-
  capture accepts any type string and silently coins a new claim type instead of
  rejecting it
status: resolved
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-25T15:50:48.469Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  A silent-corruption path in the trust boundary that autonomous capture depends
  on; found by the tool being used normally, so it will recur.
---

Hit for real on 2026-08-25: capture with type 'open_question' (valid type is 'question') produced ids ope1/ope2 rather than q3/q4. Cause: CaptureOp.type is a bare `string` cast with `as ClaimType` in src/core/reconcile.ts, so it bypasses the ClaimType union; store.ts:205 then falls back to `type.replace(/[^a-z]/g,'').slice(0,3)` and invents a prefix. Effect: autonomous capture can silently fork the type vocabulary, so claims stop grouping into the right resume sections and typeable ids (`why q3`) break — the exact 'degrade to flat memory' failure the reconciler exists to prevent, in a dimension its guards (frozen/dupe/lineage) do not cover. Fix: validate op.type against ClaimType and reject unknown types with a message listing the valid set, plus alias obvious near-misses (open_question→question, rejected→rejected_alternative). Malformed ope1/ope2 removed in 8302a39.

FIXED in 09f1a88: CLAIM_TYPES is the runtime source of truth and ClaimType is derived from it; the reconciler aliases obvious near-misses and rejects anything else with a note listing valid types; nextId throws rather than minting a prefix.
