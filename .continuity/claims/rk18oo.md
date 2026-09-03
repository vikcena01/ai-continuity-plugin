---
schema: 1
id: rk18oo
type: risk
title: >-
  No MCP tool sets a mission — the first line of every resume context is
  unreachable from the tool surface
status: resolved
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T07:46:31.397Z'
  updated: '2026-09-03T07:53:46.235Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Found by Glama's coherence scan, not by us, and verified: 11 registered tools
  and zero mentions of mission among them. A gap an external scanner catches is
  one real users hit silently.
resolution: >-
  Fixed in v1.3.0: record_mission (MCP tool #12) and 'continuity mission' both
  set or replace the mission. Replacing supersedes with a mandatory reason
  rather than amending in place, since a strategic pivot is exactly what gets
  re-litigated; identical text is a no-op. 19 assertions in test/mission.sh.
---

create_project accepts a mission at creation only, which does not help in repo mode — the normal case — or when a mission changes. record_open covers milestone and next_action; mission is the one lifecycle type with no route.

Workaround exists but is undiscoverable from the tool list: capture accepts type 'mission'. That is precisely why the scan flagged Completeness at 4/5.

The fix is NOT decided — a record_mission tool is the obvious shape, but that is the owner's call.
