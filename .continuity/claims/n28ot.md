---
schema: 1
id: n28ot
type: next_action
title: >-
  Glama released at 1.1.0 (67%) — only three things left, all needing a fresh
  session or an app
status: superseded
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T05:31:00.863Z'
supersedes:
  - n27km
superseded_by: n29v0
depends_on: []
tags: []
superseded_reason: >-
  The Glama thread closed completely, so the direction should stop carrying it
  and name only what is actually outstanding.
---

DONE 2026-09-03: Glama deployed at ee8fd85 and released as 1.1.0. Score 25% -> 67%; Glama Release, glama.json and Maintenance (grade B) now pass. Do NOT redeploy or re-release.

One thing to re-check, not act on: Server Coherence and Tool Definition Quality still read 'create a release to enable scoring' despite the release passing. Almost certainly queued — the scan must connect and call tools asynchronously after publish. Re-check the score page after a day; if unchanged, ask Glama, since the stated precondition is visibly met. If they pass, the card badge's blank quality circle fills in and adding that badge to the README becomes worthwhile (held back earlier for exactly that reason).

Not worth chasing: Recent Usage needs invocations through their infrastructure, which local-first design (d5, d6) means will likely never happen; Related Servers is discoverability metadata.

REMAINING WORK:
1. FRESH SESSION — verify the public install path; remove the directory-source marketplace first, the name collides (a2qj).
2. COWORK APP — answer q8w6 by installing, not reasoning.
3. REVIEW BASELINE — 97 claims, no marker. Read `continuity list`, then `continuity review --accept`.

Waiting: Claude community submission in review; CI not scheduling (rk14so); OpenAI closed (x9nq).
