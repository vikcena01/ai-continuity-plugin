---
schema: 1
id: rk24du
type: risk
title: We publicly claim Cursor support and have never run it there
status: resolved
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-18T09:12:23.748Z'
  updated: '2026-09-18T09:15:51.936Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
resolution: >-
  Tested. The server works in a foreign MCP client; the product does not carry
  over — see the new risk on MCP-only degradation.
---

README line 22 says 'in Claude Code, Cursor, or anything that speaks MCP', and a third party (@Pakgowithai, 18 Sep 2026) is now repeating 'Works in Cursor' publicly. It is a plain stdio MCP server so it should work, but nobody has verified it — q8w6 covers Cowork only. A first-time Cursor user hitting a config or path problem is a first impression we do not get back. Verify, or soften the line.
