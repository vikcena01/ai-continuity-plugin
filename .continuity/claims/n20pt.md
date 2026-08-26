---
schema: 1
id: n20pt
type: next_action
title: >-
  Claude submission stands and is waiting on review; OpenAI is closed — verify
  install from a fresh session
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T09:41:06.343Z'
supersedes:
  - n19j9
superseded_by: null
depends_on: []
tags: []
---

RESOLVED 2026-08-26: the 'verified developer identity' prompt was OpenAI's. The Claude community submission was never affected — treat it as in review and simply wait. Do not resubmit.

OpenAI is closed on architecture (x9nq), and the gates encountered in order were: payment method, then credits, then verified developer identity. All three sit in front of the same wall — no publicly reachable HTTPS MCP endpoint exists, because the server is local stdio by design (d5, d6). Reopening this needs the hosted tier x1 deferred, not a packaging change. Never enter payment details or identity documents on the user's behalf.

Outstanding, in priority order:
  1. FRESH SESSION: exercise the public install path — remove the directory-source marketplace first, the name collides (a2qj). Also the first chance to confirm resolve_claim is exposed, since the server here runs a pre-fix bundle.
  2. POLL, do not infer: curl the community marketplace.json and grep for '"name": "continuity"'. It lists only APPROVED plugins, so absence means nothing on its own.
  3. COWORK APP: answer q8w6 by installing there rather than reasoning about it.
  4. When convenient: document the claim-file format contract in the README, and add CI running npm test on push so the tests badge stops being a hand-maintained claim (rk9cg).
  5. Optional, the user's own file: a `Host github.com` block in ~/.ssh/config pinning the right key (d29ka).

Shipped state: remote main and tag v1.0.0 both at abb6230, 85 assertions across five suites, dist/ in sync.
