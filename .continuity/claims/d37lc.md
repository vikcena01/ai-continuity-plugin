---
schema: 1
id: d37lc
type: decision
title: >-
  The Claude community submission PASSED REVIEW — distribution no longer depends
  on it
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-16T07:03:38.175Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  This was the longest-open external dependency in the project, and its
  resolution changes what the remaining work is: acceptance is no longer in
  question, only availability.
---

Console shows Continuity as 'Passed review' (submitted Aug 26). Verified 2026-09-16.

BUT it is not yet installable via @claude-community, and the reason is NOT this plugin: the public catalogue's marketplace.json has not been regenerated since 2026-08-24 — two days BEFORE the submission — so nothing at all has been added to it in three weeks. Absence from that file currently says nothing about any individual plugin. Do not read it as a rejection or re-submit.

Meanwhile the direct path works and is unaffected: `claude plugin marketplace add vikcena01/ai-continuity-plugin` then install, verified today at v1.4.0 with all 13 tools live.
