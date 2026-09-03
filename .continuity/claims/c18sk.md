---
schema: 1
id: c18sk
type: constraint
title: The npm name 'continuity' is already taken — any npm route needs a scoped name
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T08:57:39.750Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  package.json declares name 'continuity' and could therefore never be published
  as-is; better to know before someone plans an npx-based install path around
  it.
---

registry.npmjs.org/continuity returns 200 to someone else's package (verified 2026-09-03). Nothing depends on this today — distribution is the plugin marketplace, and dist/ is committed so no install step is needed (d13).

It only bites if an npm route is ever wanted, e.g. `npx continuity-mcp` for directories that start servers by command. That would need a scoped name such as @vikcena01/continuity, which also changes the bin names.
