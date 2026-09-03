---
schema: 1
id: rk19rn
type: risk
title: >-
  Claims cannot be listed or searched over MCP — only the resume projection is
  reachable
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T09:20:42.605Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Found the same way as the mission gap: an external coherence scan naming it,
  not us. The CLI has `continuity list` but no MCP tool exposes it, so an agent
  can see the budgeted projection and nothing else.
---

Glama's Completeness note changed after v1.3.0 from 'no explicit mission-setting tool' to 'no general claim search or project deletion'. The first half is real: the 12 tools cover create/list PROJECTS, record, freeze, resolve and why — nothing lists or searches CLAIMS.

Consequence: an agent that needs a claim it cannot see in the projection has no route to it. The projection is budgeted (16KB, tiered), so at level 1 or higher some claims are titles-only and at level 3 open questions are omitted entirely — exactly when a search would matter most. `why` needs an id or title substring the agent must already know.

The second half of their note, project deletion, is NOT a gap: nothing is ever deleted (d1). Do not add it.
