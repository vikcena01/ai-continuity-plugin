---
schema: 1
id: c25fo
type: constraint
title: >-
  Route external bug reports through GitHub Issues — support handled off-GitHub
  is invisible to Glama's maintenance grade
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-18T09:05:55.156Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
---

Glama grades maintenance on Activity + Responsiveness, and Responsiveness reads the issue tracker. Carl's report came by email and was fixed in v1.5.0 in days; that counts for nothing because 0 issues have ever been opened or closed. bug.yml exists and is unused. When someone reports off-GitHub, ask them to file it, then close it citing the fix commit.
