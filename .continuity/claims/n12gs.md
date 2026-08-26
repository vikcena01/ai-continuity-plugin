---
id: n12gs
type: next_action
title: >-
  Restart the session, then exercise the public install path — everything else
  for v1.0.0 is done
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T06:46:33.685Z'
supersedes:
  - n11zg
superseded_by: null
depends_on: []
tags: []
---

Shipped state: remote main and remote tag v1.0.0 both at 765fe1d, all 77 commits authored Vikash Singh <vikcena01@gmail.com>, zero continuity@local in history, dist/ verified in sync, 69 assertions green.

Remaining:
  1. Start a FRESH session — the MCP server in the session that did this work still runs a pre-fix bundle, so resolve_claim is not exposed and captures there produced ids without collision-safe suffixes.
  2. Exercise the public install path, remembering the marketplace-name collision: remove the directory-source marketplace before adding the GitHub one.
  3. Look at the GitHub-rendered README — the <picture> light/dark switch and the align=left float around the mark only reveal themselves once rendered.
  4. Optional, the user's own file: add a `Host github.com` block to ~/.ssh/config pinning the personal-account key, so the an unrelated private repo deploy key stops winning by default (see d29ka).
q2 and q3 remain the known open limits, stated in the README.
