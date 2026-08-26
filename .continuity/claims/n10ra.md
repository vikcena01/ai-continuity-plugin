---
id: n10ra
type: next_action
title: >-
  Confirm the plugin installs from the public marketplace, then decide on commit
  attribution
status: superseded
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T06:22:04.781Z'
supersedes:
  - n9pi
superseded_by: n11zg
depends_on: []
tags: []
superseded_reason: >-
  Two separate defects surfaced after the push (unattributed commits and the
  stale tag) and both require rewriting published history, so they should be one
  operation rather than two force-pushes; the previous next_action listed only
  the install verification.
---

1. From a FRESH Claude Code session (this one's MCP server still runs a pre-fix bundle): `/plugin marketplace add vikcena01/ai-continuity-plugin` then `/plugin install continuity@continuity-marketplace`, and confirm auto-resume fires and resolve_claim appears as a tool.
2. Eyeball the GitHub-rendered README: the <picture> light/dark switch and the align=left float around the mark only reveal themselves once rendered.
3. Decide the commit-attribution question — leave v1.0.0 authorless or rewrite again.
4. Optional, user's own file: add a `Host github.com` block to ~/.ssh/config pinning the right key, so the wrong one stops winning by default.
