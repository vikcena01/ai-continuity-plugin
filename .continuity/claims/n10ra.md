---
id: n10ra
type: next_action
title: >-
  Confirm the plugin installs from the public marketplace, then decide on commit
  attribution
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T06:22:04.781Z'
supersedes:
  - n9pi
superseded_by: null
depends_on: []
tags: []
---

1. From a FRESH Claude Code session (this one's MCP server still runs a pre-fix bundle): `/plugin marketplace add vikcena01/ai-continuity-plugin` then `/plugin install continuity@continuity-marketplace`, and confirm auto-resume fires and resolve_claim appears as a tool.
2. Eyeball the GitHub-rendered README: the <picture> light/dark switch and the align=left float around the mark only reveal themselves once rendered.
3. Decide the commit-attribution question — leave v1.0.0 authorless or rewrite again.
4. Optional, user's own file: add a `Host github.com` block to ~/.ssh/config pinning the personal-account key, so the an unrelated private repo deploy key stops winning by default across all repos.
