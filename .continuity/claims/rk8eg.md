---
schema: 1
id: rk8eg
type: risk
title: >-
  The resume context is already heavy at ~45 claims, and verbose next_action
  bodies inflate the header worst
status: resolved
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T07:13:47.175Z'
  updated: '2026-08-26T14:59:45.026Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Measured on this project rather than projected: the resume renders ~45 bullets
  and every open claim's full body is inlined, so the context injected into
  every single session grows without bound as the claim set does. A state layer
  whose own output crowds out the work it is meant to support fails at its
  purpose.
resolution: >-
  Same fix as rk12j6 (duplicate finding, captured twice before the reconciler
  could dedupe them by title). Closed together.
---

DESIGN.md already anticipates token budgeting with tiered inclusion (§5) and asks whether progressive summarisation of active claims is acceptable (open question 4), so the direction exists — this claim records that the threshold is now observable, not theoretical, and identifies the specific aggravating factor.

The worst offender is structural: renderResumeContext prints `**Resume at:** <title> — <body>` for the open next_action, and this project's next_action bodies have grown to multi-paragraph status reports with commands, verified facts and numbered to-dos. That single claim can outweigh every frozen constraint combined, right at the top of the context where it is most expensive.

Two cheap mitigations before the designed tiering is needed: cap or omit the body in the header (the id is right there for a follow-up `why`), and keep next_action bodies to the next step rather than a session log. Note the tension with d10 — the reason must travel with a decision — which argues for trimming the HEADER specifically rather than the bodies of decisions and rejections, where the reasoning is the whole value.
