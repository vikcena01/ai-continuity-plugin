---
id: d21lp
type: decision
title: 'One resolve verb closes every claim, and the reason is always mandatory'
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T05:38:39.833Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Parked conflicts and settled risks looked like two problems but were one
  missing operation — move a claim to a terminal status with the reason
  recorded; building two flows would have duplicated the lineage and freeze
  handling.
---

`continuity resolve <claim> [--accept|--reject|--close] --reason` (and the resolve_claim MCP tool) is the ONLY way a claim reaches a terminal status: accept makes a parked claim win by superseding what it conflicted with, reject turns it into a guardrail, close moves a live risk/question to resolved and a next_action/milestone to done. The reason is refused if empty, because a claim that merely disappears from the resume teaches a future session nothing (d10); it is stored in the claim's `resolution` field and printed by `why`. Two consequences worth keeping: accept goes through supersede so nothing is deleted (d1), and a claim rejected this way renders under 'Do NOT revisit' whatever its type — previously only rejected_alternative and hypothesis did, so a rejected constraint would have silently vanished.
