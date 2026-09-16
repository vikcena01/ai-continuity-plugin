---
schema: 1
id: c21su
type: constraint
title: >-
  Check which release Glama serves on the /schema page, cache-busted — the
  server page renders the README and cached reads lie about freshness
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-16T07:38:26.259Z'
supersedes:
  - c20o4
superseded_by: null
depends_on: []
tags: []
---

Method: GET /mcp/servers/<owner>/<repo>/schema with a cache-busting query param, and count the enumerated tools. 11 = 1.1.x, 12 = 1.3.0, 13 = 1.4.0 with search_claims.

Why each part matters, both learned by getting it wrong:
  - The SERVER page renders this repo's README, so its 'Latest release' field shows the README status line and a name search there matches every tool the README lists, deployed or not. The /schema page carries no README content, so searching IT is safe.
  - Fetches are cached per URL (15 min for the fetch tool), so re-checking the same URL after a deploy can return the pre-deploy copy. Append a changing query param when checking deployment status.

And do not record a deployment as fact until the tool count confirms it. Asserting it from the user's report alone put a falsehood into state once already.
