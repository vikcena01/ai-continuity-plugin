---
id: c4nc
type: constraint
title: >-
  Before any release, rebuild and diff dist/ — a stale committed bundle ships
  silently broken to every installer
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T06:12:56.683Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  d13 commits dist/ so the plugin installs with zero dependencies, which means
  the bundle is the artefact users actually run. Nothing in git or the test
  suite fails when dist/ lags src/, so a stale bundle is invisible locally and
  only shows up as wrong behaviour on other people's machines.
---

Gate: `npm run bundle && git diff --quiet -- dist` must come back clean before tagging or pushing a release. Verified clean for v1.0.0.

This session already hit the live version of the failure: the MCP server process was started from a pre-fix dist/, so tool calls kept using old code for several turns — ids came out without their collision-safe suffixes and captured risks landed with the wrong status. The CLI, which is invoked fresh each time, was correct throughout. Two consequences worth remembering: an already-running MCP server does NOT pick up a rebuild until the session restarts, and when the two disagree the freshly-invoked CLI is the trustworthy one.

Also settled while checking, so nobody re-investigates at release time: `password` matches in dist/mcp.js are the bundled MCP SDK's own code, not a credential; and the `internal` matches under poc/ come from the fictional demo project ("Snip, an internal URL shortener"), not real company data.
