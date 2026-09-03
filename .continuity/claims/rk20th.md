---
schema: 1
id: rk20th
type: risk
title: >-
  The individual record_* tools bypass the reconciler, so they can create
  duplicate claims
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T09:29:09.649Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Documenting it in 1.4.0 made it visible but did not decide whether it is
  correct; the reconciler exists to prevent exactly this, so a tool that skips
  it is arguably a defect rather than a feature.
---

Verified: record_decision twice with the same title creates two claims, where capture skips it as a duplicate. Same for record_constraint, record_rejection, record_open — they call Store.record directly, so they get neither dedupe nor the frozen-conflict guard. True since 1.0; disclosed in the tool descriptions in 1.4.0.

The open question is whether to route them through the reconciler. For: duplicates are pure noise, and the frozen guard silently does not apply on the most-used path. Against: the record_* tools are the simple single-claim path, and reconciling one op adds a read of the whole claim set per call.

Middle option worth considering: dedupe only, without the supersession machinery. Do not just delete these tools — capture requires the model to build an ops array, which is a higher bar for a single obvious claim.
