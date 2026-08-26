---
id: n5wc
type: next_action
title: >-
  Publish: add a git remote, fix the README install command, drop the stray
  resume_context_v4.md
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T05:38:39.836Z'
supersedes:
  - n4
superseded_by: null
depends_on: []
tags: []
---

Nothing is pushed anywhere: `git remote -v` is empty, so README's documented `/plugin marketplace add vikash/ai-continuity-layer` resolves to a repo that does not exist and the install path fails for everyone. Also delete the tracked 0-byte resume_context_v4.md at the repo root (a POC-era artifact; the real one is in poc/). Worth re-reading q3 before release too — Stop-hook capture is at-most-once-per-10s, which is the last known caveat on the auto-capture story.
