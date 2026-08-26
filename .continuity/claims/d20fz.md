---
id: d20fz
type: decision
title: Accepting a claim parked against a FROZEN claim requires an explicit unfreeze
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T05:38:39.830Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Freezing is the single human act in the model, so overriding one must be a
  second deliberate act — otherwise clearing a conflict queue could dissolve an
  invariant as a side effect, and freeze would stop meaning anything.
---

resolveClaim refuses --accept when the parked claim conflicts_with a frozen claim, and points the caller at --reject instead; only an explicit unfreeze proceeds, and the MCP tool description tells the model to ask the user first. This is the one place the resolve verb is deliberately not ergonomic. Do not 'simplify' it into an automatic supersede: d4 makes freeze the single human gate, and a queue-clearing flow that can silently break it defeats c1/d4 together. Covered by test/resolve.sh (accept over FROZEN is refused; the frozen claim survives untouched).
