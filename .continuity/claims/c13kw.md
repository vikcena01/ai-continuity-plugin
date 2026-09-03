---
schema: 1
id: c13kw
type: constraint
title: >-
  Keep index.js AND main/exports — all three look redundant and each is
  load-bearing for a different external runner
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T04:59:19.306Z'
supersedes:
  - c12eu
superseded_by: null
depends_on: []
tags: []
---

Three entry points, three different consumers:

- index.js — a one-line shim importing dist/mcp.js. Glama's build spec ends with CMD ["mcp-proxy","--","tsx","index.js"], a hardcoded FILENAME. It never consults main or exports, so without this file the container dies with ERR_MODULE_NOT_FOUND for /app/index.js.
- main — makes `node .` work.
- exports — modern package resolution.

A package with only bin entries has no resolvable entry point at all: anything that guesses falls back to Node's default of index.js.

General lesson worth more than the specific fix: this was diagnosed twice from the stack trace (tsx's resolveDirectorySync suggested directory resolution) and got the mechanism wrong both times. The answer was one line of config in a file not yet seen. When a runtime failure is in someone else's pipeline, ask for the invocation before theorising about the resolver.
