---
schema: 1
id: c19xy
type: constraint
title: >-
  To check which release Glama is actually serving, count its tools — its
  version field is not a version
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-16T07:08:02.341Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Its 'Latest release' field renders the README's status line verbatim, so it
  reports whatever the README says rather than what was deployed; this produced
  one wrong conclusion in conversation and nearly a second.
---

Glama shows 'Latest release: v1.4 — deterministic core + CLI + MCP server + Claude Code plugin', which is this repo's README status line, not a release number. Grepping the page for /v1\.[0-9]/ therefore matches the README text and reports whatever version that line claims.

Reliable signal: the TOOL COUNT and tool names on the server page, which come from the deployed server rather than the README. 11 tools = 1.1.x, 12 = 1.3.0, 13 = 1.4.0 with search_claims.

Same family as c14iq, but distinct: there the summariser invented a finding; here the page's own field is misleading.
