---
schema: 1
id: rk22bb
type: risk
title: >-
  We dogfooded v1.1.1 for six weeks — every fix since 1.1.1 was unvalidated in
  our own use
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-18T08:29:29.792Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
---

The locally installed plugin was a cache snapshot at ~/.claude/plugins/cache/continuity-marketplace/continuity/1.1.1, pinned to commit e6935264 which no longer exists (the history rewrites orphaned it). A directory-source marketplace does NOT track the working copy: it snapshots, and only `claude plugin update` re-snapshots. So the running MCP server exposed 11 tools, not 13 — no record_mission, no search_claims — had no in-place amend for next_action (a3kw), and still carried the frozen-guard fail-open that 1.5.0 fixed. Found on 2026-09-18 when a supersede of n31qe spawned n33pl instead of amending, and the same op amended correctly against dist/ in a scratch repo. Now updated to 1.5.1; takes effect on session restart. CONSEQUENCE: the capture audit (rk16it, 25% direction churn) measured 1.1.1's reconciler, not the shipped one — the 1.2.0 capture-policy fix and a3kw were never in the measured path, so the churn number is a pre-fix baseline, and no post-fix number exists yet.
