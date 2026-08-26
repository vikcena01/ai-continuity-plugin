---
id: d23ex
type: decision
title: 'First public release is versioned v1.0.0, not 0.x'
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T05:46:21.193Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  The user's explicit call for the public launch. Flagged at the time that v1.0
  normally signals a stability commitment while q2 and q3 are still open, and
  that with no external users yet the number is a release signal rather than a
  maturity claim; the user chose 1.0 anyway, so treat it as settled.
---

Tagged v1.0.0 (annotated). The version is declared in five places that must move together: package.json, .claude-plugin/plugin.json, BOTH metadata.version and plugins[0].version in .claude-plugin/marketplace.json, and the McpServer constructor in src/mcp.ts — plus the README status line. Scope of v1.0: deterministic resume projection, autonomous Stop-hook capture, the reconciler (dedupe, lineage-preserving supersession, frozen guard), the resolve verb, collision-safe ids for concurrent clones, and self-activation on clone. Do not re-open the 1.0-vs-0.x framing.
