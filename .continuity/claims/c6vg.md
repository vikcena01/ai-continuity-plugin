---
schema: 1
id: c6vg
type: constraint
title: >-
  Once submitted to the community marketplace, git history is frozen — no more
  rewrites or force-pushes
status: superseded
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T06:52:18.541Z'
supersedes: []
superseded_by: c9fv
depends_on: []
tags: []
superseded_reason: >-
  The original constraint said no rewrites once submitted. One was then
  performed anyway, on the user's explicit instruction, to purge personal
  infrastructure and a third-party name from published claim bodies and one
  commit subject. Recording the override rather than pretending the rule held
  keeps the constraint credible — and the window it relied on is now spent.
reason: >-
  Approved plugins are pinned to a specific commit SHA in the
  anthropics/claude-plugins-community catalogue and Anthropic's CI tracks the
  repo's commits. A rewrite changes every SHA, so it would break that pin from
  their side rather than ours — an externally visible failure we cannot fix by
  remapping our own references.
---

This history has already been rewritten TWICE (the work-email purge, then the author attribution pass), each time costing a remap of the SHA references inside claim bodies. That was affordable only because nothing external depended on the hashes. From submission onwards it is not: fix problems with new commits, never by rewriting.

Corollary for anything that still needs changing — the manifest description wording, for instance — do it BEFORE submitting, not after.
