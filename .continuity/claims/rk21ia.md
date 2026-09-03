---
schema: 1
id: rk21ia
type: risk
title: >-
  Every defect that reached users this session was in prose or metadata, not
  logic — code has tests, documentation has nothing
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T10:58:16.439Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Four instances in one session is a pattern rather than bad luck, and it points
  at a specific cheap fix: the claims documentation makes about the system are
  mechanically checkable but unchecked.
---

The four: a badge asserting 'tests: failing' while 186 assertions passed; rk2 recording the wrong MECHANISM for a real bug (silent duplication, when it was an add/add conflict); the record_* reconciler bypass true since 1.0 and undisclosed until 1.4.0; and three stale README claims found only by being asked to check again — a test count off by 117, an MCP tool list naming 11 of 13, and a CLI loop missing two shipped commands.

None was caught by CI, because CI checks that code works, not that prose about the code is true.

Proposed fix, not yet decided: assert the checkable claims. The README's tool list must match tools/list; its assertion count must match the suite total; the CLI commands it documents must match the CLI's own usage output. All three are mechanical — the same three checks that found these defects by hand.

Note the asymmetry: a wrong line of code fails a test, a wrong line of prose ships and is read by every new user first.
