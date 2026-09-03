---
schema: 1
id: n27km
type: next_action
title: >-
  Redeploy Glama at ee8fd85 and release as 1.1.0; then install path, Cowork,
  review baseline
status: superseded
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T05:26:07.195Z'
supersedes:
  - n26i9
superseded_by: n28ot
depends_on: []
tags: []
superseded_reason: >-
  The previous version instructed a redeploy and release that are now complete,
  so it would have sent a future session to redo finished work.
---

GLAMA — the builder failure cleared; a deploy succeeded on 2026-09-03. Two steps: redeploy pinned at ee8fd85 or later (the previously deployed a731eb6 predates the version bump, so releasing from it would still say 1.0.0), then Make Release as 1.1.0 to match the git tag. Do not change the build spec: `pnpm install` and `tsx index.js` are coupled (c13kw).

If it stalls again at 'FROM debian:trixie-slim' with 'no active session', that is their known-flaky builder — three failures earlier the same day, all cleared on retry. Retry once before treating it as broken.

Expect 'No project selected' from a bare resume_context during the coherence scan: rk5 behaving correctly. Working order is create_project, record, resume.

Still open: verify the public install path in a fresh session (remove the directory-source marketplace first, a2qj); answer q8w6 in the Cowork app; set the review baseline (97 claims, no marker). Waiting: Claude submission in review; CI not scheduling (rk14so); OpenAI closed (x9nq).
