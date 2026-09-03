---
schema: 1
id: n25xc
type: next_action
title: >-
  Glama is deployable as-is at a731eb6 — do NOT empty the build steps; then
  install + Cowork checks
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T05:15:35.512Z'
supersedes:
  - n24s0
superseded_by: null
depends_on: []
tags: []
---

GLAMA — deploy the current spec unchanged at a731eb6 or later; index.js (2a88fd6) fixed the ERR_MODULE_NOT_FOUND. Their CMD is mcp-proxy -- tsx index.js.

The build step and the CMD are COUPLED. tsx is a devDependency reached via ENV PATH=/app/node_modules/.bin, so `pnpm install` is what makes the CMD runnable. Either keep both as they are, or change both together to empty steps + CMD node dist/mcp.js. Changing one alone breaks it.

Expect the coherence scan to hit 'No project selected' on a bare resume_context — rk5 behaving correctly. Working sequence: create_project, record, resume. After a clean start, Make Release: it fills the card's blank quality grade and unblocks three of five score checks.

Still open elsewhere: verify the public install path in a fresh session (remove the directory-source marketplace first, a2qj); answer q8w6 in the Cowork app; set the review baseline (97 claims, no marker).

Waiting: Claude submission in review; CI not scheduling (rk14so); OpenAI closed (x9nq).
