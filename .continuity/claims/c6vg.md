---
id: c6vg
type: constraint
title: >-
  Once submitted to the community marketplace, git history is frozen — no more
  rewrites or force-pushes
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T06:52:18.541Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Approved plugins are pinned to a specific commit SHA in the
  anthropics/claude-plugins-community catalogue and Anthropic's CI tracks the
  repo's commits. A rewrite changes every SHA, so it would break that pin from
  their side rather than ours — an externally visible failure we cannot fix by
  remapping our own references.
---

This history has already been rewritten TWICE (the work-email purge, then the author attribution pass), each time costing a remap of the SHA references inside claim bodies. That was affordable only because nothing external depended on the hashes. From submission onwards it is not: fix problems with new commits, never by rewriting.

Corollary for anything that still needs changing — the manifest description wording, for instance — do it BEFORE submitting, not after.
