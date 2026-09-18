---
schema: 1
id: n31qe
type: next_action
title: >-
  HN is account-filtered, not content-rejected — stop commenting, the real work
  is the external tester
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T09:21:48.317Z'
  updated: '2026-09-18T07:22:11.120Z'
supersedes:
  - n30lb
superseded_by: null
depends_on: []
tags: []
---

HN STATE 2026-09-18: story 49750016 ALIVE, score 3, zero visible comments. Comments 49750022 (03:57) and 49751150 (07:20) both dead — two different comments, hours apart, one without links, from a 15-day-old 2-karma account. That is an account-level filter; the story rising while comments die rules out the community disliking the project.

DO NOT post a third comment, repost the story, or use another account. Repeated posting after kills reads as filter evasion and risks the story, which is currently the only surviving asset. Follow up once on the existing moderator email naming both killed comment ids, say you will stop posting until they reply, then stop.

Check restoration by API, not the page: curl -s https://hacker-news.firebaseio.com/v0/item/49751150.json | grep -c dead — 1 still killed, 0 restored.

The higher-value thread is elsewhere: reply to Carl Sowers (EuphoricDoom) and request the full report. One cold-read external test produced a real fail-open plus two provenance defects; HN has produced none.

Also pending: deploy v1.5.0 (70071ab) — a security fix should not sit behind 1.4.0; q8w6 via the Cowork app; and the review baseline, 139 claims with no marker.
