---
id: ope2
type: open_question
title: >-
  Parked needs_review claims have no resolution path anywhere in the codebase —
  the frozen-guard is a one-way door
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-25T15:49:39.184Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Confirms the already-planned resolve-conflict flow is genuinely absent rather
  than partially built, and pins down the exact call sites and required
  semantics so the next session does not have to re-derive them.
---

Verified 2026-08-25 across the whole surface: the reconciler CREATES needs_review claims (src/core/reconcile.ts) and resume RENDERS them (src/core/resume.ts:33), but nothing resolves them. Store exposes only freeze() and supersede() — no status transition off needs_review. None of the CLI's 14 commands accept or discard a parked claim, and there is no MCP tool for it. So parked conflicts accumulate forever and the resume header nags indefinitely. The resolve verb needs two outcomes: accept the newcomer (an explicit human act, since it implies unfreezing or superseding a frozen claim — consistent with d4 making freeze the one human gate), or reject it into the x* set with a reason so it is never re-proposed.
