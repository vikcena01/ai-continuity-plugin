---
schema: 1
id: c12eu
type: constraint
title: >-
  package.json must keep main and exports pointing at dist/mcp.js — bin entries
  are not an entry point
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T04:23:39.890Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Removing them looks harmless because nothing imports this package, but the
  failure lands in someone else's container as a missing file nobody ever wrote.
---

A package with bin entries but no main and no exports has no resolvable entry point, so anything that guesses one — `node .`, tsx, a container CMD with no args — falls back to Node's default of index.js. Glama's runtime failed exactly this way: ERR_MODULE_NOT_FOUND for /app/index.js, a file that has never existed in this repo.

main and exports both point at dist/mcp.js because this package exposes no library API; the most useful thing an entry-point resolution can do here is start the MCP server. Verified with `node .` and `npx tsx .`, both of which initialize and list 11 tools.
