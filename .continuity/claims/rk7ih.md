---
id: rk7ih
type: risk
title: >-
  The community catalogue is crowded with memory tools — a description that
  reads as 'persistent memory' makes this indistinguishable
status: resolved
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T07:01:16.080Z'
  updated: '2026-08-26T07:05:03.573Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Measured, not assumed: of 2282 plugins in the catalogue, 431 mention session,
  memory, continuity, or state. Discovery is by name and first line, so
  positioning is the difference between being found and being lost in that
  group.
resolution: >-
  Mitigated in c11e818: the marketplace.json description now opens on 'Not a
  memory tool' and leads with the deterministic read path (d9), the reconciler
  parking conflicts rather than applying them (d14), and supersessions carrying
  their reason (d10) — instead of describing what it stores, which is what the
  other 431 entries also say. The specific condition this risk named (a
  description reading as persistent memory) no longer holds. Whether that
  actually converts to discovery is unmeasurable from here, so closing on the
  mitigation rather than on the outcome.
---

Direct neighbours include session-continuity, claude-self-reflect, agent-memory, agent-recall, nexo-brain, substrate, handoffkit, three-pillars and product-discovery. Most are memory or recall tools.

The differentiator is real and must lead the copy: this is NOT a memory tool. It answers 'what is true about this project now, and what must not be touched?' rather than 'what did we talk about?'. The defensible specifics are the deterministic resume projection with no model in the read path (d9), frozen claims that cannot be silently contradicted because the reconciler parks conflicts instead of applying them (d14), and supersession that carries the reason a decision was replaced (d10). If the first line says 'persistent memory for Claude', none of that is visible and the plugin reads as one of 431.

Also confirmed empirically while checking: 2274 of 2282 entries are pinned to a commit SHA, which corroborates c6vg from observation rather than only from the docs.
