---
schema: 1
id: m2hq
type: milestone
title: >-
  v1.0.0 is public — verify the install path end to end, then gather first
  feedback
status: done
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T06:22:04.771Z'
  updated: '2026-09-03T06:07:01.958Z'
supersedes:
  - m1
superseded_by: null
depends_on: []
tags: []
resolution: >-
  Completed and replaced by m3nc: v1.0.0 shipped, and the follow-on work it
  named (install-path verification) is now tracked in the next_action rather
  than as a milestone. Superseding m1 instead of this one was my error — m1 was
  already stale, so the resume header kept showing this.
---

Shipped at main 14cbb71, annotated tag v1.0.0 -> 0e560a5. Verified reachable over raw.githubusercontent (HTTP 200): .claude-plugin/marketplace.json, .claude-plugin/plugin.json, dist/mcp.js, assets/logo-light.svg. What remains is confirmation from outside this session: that `/plugin marketplace add vikcena01/ai-continuity-plugin` followed by `/plugin install continuity@continuity-marketplace` actually works from a fresh Claude Code session, and that the GitHub-rendered README behaves (the <picture> light/dark switch and the align=left float around the mark). q2 and q3 remain the known open limits, stated plainly in the README.
