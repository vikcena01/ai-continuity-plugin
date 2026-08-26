---
schema: 1
id: n18yb
type: next_action
title: >-
  Waiting on Claude community review — nothing else is outstanding that a
  terminal can do
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T08:27:55.012Z'
supersedes:
  - n17mv
superseded_by: null
depends_on: []
tags: []
---

Shipped since: per-claim schema versioning with loud refusal of a newer format and a `continuity migrate` command (rk10gu); personal infrastructure and third-party names removed from published claims (c8ea now forbids putting them there); history purged and force-pushed. Remote main and tag v1.0.0 both at abb6230. 85 assertions across five suites. dist/ verified in sync.

Remaining, none of it doable from a terminal session:
  1. WAIT on review, then poll: curl -s https://raw.githubusercontent.com/anthropics/claude-plugins-community/main/.claude-plugin/marketplace.json | grep -c '"name": "continuity"' — 0 now, 1 once live. No SLA published; the catalogue syncs nightly.
  2. FRESH SESSION: exercise the public install path, removing the directory-source marketplace first because the name collides (a2qj). Also the first chance to confirm resolve_claim is exposed.
  3. COWORK APP: answer q8w6 by installing there rather than reasoning about it.
  4. Worth doing when convenient: document the claim-file format contract in the README, and add CI running npm test on push so the tests badge stops being a hand-maintained claim (rk9cg).
  5. Optional, the user's own file: a `Host github.com` block in ~/.ssh/config pinning the right key, so the wrong one stops winning by default (d29ka).
