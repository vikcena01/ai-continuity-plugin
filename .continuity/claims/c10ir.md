---
schema: 1
id: c10ir
type: constraint
title: >-
  Tests must not depend on the machine's git defaults or on fixed cross-process
  keys
status: superseded
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T15:01:27.526Z'
supersedes: []
superseded_by: c11zk
depends_on: []
tags: []
superseded_reason: >-
  A third instance of the same class appeared — an MCP probe that read as a
  product bug — so the rule belongs in one claim rather than accumulating
  separate ones.
reason: >-
  Both CI failures on the first run were this exact class: they passed locally
  and failed on the runner, which is the most expensive kind of test bug because
  it looks like working code.
---

Two concrete rules, each learned from a real failure:

- Pin what git would otherwise take from the machine. `git init --bare` gives the fixture a HEAD following the runner's init.defaultBranch, so pushing HEAD:main can leave origin/HEAD unborn. Use `init --bare -b main`.
- Never key shared on-disk state to a constant. The dedupe test used session id 'dup-test', and the throttle marker lives in tmpdir, so two suite runs inside the 5s window throttled each other. Use a per-run id.

Also: assert the fixture itself. Five assertions failed downstream of a fixture that never reported its own failure, which turned one bug into five confusing symptoms.
