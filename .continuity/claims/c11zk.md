---
schema: 1
id: c11zk
type: constraint
title: >-
  Test harnesses must not assume machine defaults, fixed cross-process keys, or
  ordered MCP responses
status: superseded
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T04:18:03.515Z'
supersedes:
  - c10ir
superseded_by: c16vw
depends_on: []
tags: []
superseded_reason: >-
  Third occurrence of the same class, which is the threshold I set for
  generalising the rule. Each instance passed locally and failed elsewhere, or
  passed by hand and failed in the suite — the most expensive kind of test bug
  because it looks like broken code.
---

Three rules, each from a real failure that looked like broken code:

- Pin what git would otherwise take from the machine. `git init --bare` gives the fixture a HEAD following the runner's init.defaultBranch; use `init --bare -b main`.
- Never key shared on-disk state to a constant. A fixed session id plus a tmpdir throttle marker made two suite runs inside the window throttle each other.
- Do not assume MCP responses arrive in request order. The server answers concurrently, so piping a batch of JSON-RPC calls into it can return resume_context BEFORE the writes it was meant to read — which looks exactly like an empty-state bug. Sequence dependent calls in separate invocations.

And assert the fixture itself: five assertions once failed downstream of a fixture that never reported its own failure.
