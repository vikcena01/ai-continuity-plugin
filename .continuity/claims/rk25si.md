---
schema: 1
id: rk25si
type: risk
title: 'In any MCP-only client the product is materially weaker, and nothing says so'
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-18T09:15:52.001Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
---

Verified 2026-09-18 with a Cursor-style launch (env -i, bare node dist/mcp.js, foreign cwd, proto 2025-06-18): the SERVER is clean — 13 tools, exit 0, no stderr, writes auto-committed. But repo-local .continuity/ can only be created by `continuity init`, a CLI inside the Claude Code plugin, so an MCP-only user gets ~/.continuity central state that never ships with the repo — the headline promise. They also get no autonomous capture (Stop hook + skill are plugin-only), and no session-sticky project: create_project then record_decision without project= fails. README names Cursor once with no config. Fix: a Cursor section stating what you get and what you don't, or soften line 22.
