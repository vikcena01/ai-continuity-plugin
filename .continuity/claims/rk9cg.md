---
id: rk9cg
type: risk
title: >-
  The 'tests-69 passing' badge is hardcoded with no CI behind it and will
  silently lie
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T07:17:40.194Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  It asserts a live fact from a static string, so the first change to the suite
  makes the README claim something false — and a stale green test badge is worse
  than no badge, because it actively misleads people evaluating whether to trust
  the plugin.
---

Introduced knowingly in 5ea51d0 alongside the other badges. The count is accurate today (13 smoke + 9 reconcile + 26 risks + 21 resolve = 69) and there is no mechanism keeping it that way.

Two ways out: add a GitHub Actions workflow running `npm test` on push and switch to a real github/actions/workflow/status badge, which also gives outside contributors a signal the suite passes; or delete the badge. Prefer the workflow — the repo is public now and has no CI at all, so nothing currently catches a regression pushed from another machine. The other static badges (Claude Code plugin, MCP server, dependencies zero) are architectural facts that only change if the architecture does, so they carry no equivalent risk.
