---
schema: 1
id: c16vw
type: constraint
title: >-
  Tests must not depend on the shell environment: pin git defaults, avoid fixed
  shared keys, and never background a process that reads stdin
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T07:53:37.957Z'
supersedes:
  - c11zk
superseded_by: null
depends_on: []
tags: []
---

Four rules, each from a real failure:

1. Pin what git would take from the machine. `git init --bare` gives the fixture a HEAD following the runner's init.defaultBranch; use `-b main`. (Cost: five cascading CI failures.)

2. Never key shared on-disk state to a constant. The dedupe test used a fixed session id and the throttle marker lives in tmpdir, so two suite runs inside the window throttled each other. Use a per-run id.

3. Never background a process that reads stdin. In a NON-INTERACTIVE script job control is off, so `cmd &` gets stdin from /dev/null and sees nothing — while the same line works by hand, where job control is on. The stdio server exits on EOF, so a plain pipe is correct and simpler. (Cost: four false failures and a near-misdiagnosis of the tool.)

4. Assert the fixture itself, so a broken fixture names itself instead of cascading into confusing symptoms downstream.

Also recurring, not environment-specific: with `set -o pipefail`, `cmd | grep -q` fails the pipeline when cmd exits non-zero or gets SIGPIPE. Capture to a variable first.
