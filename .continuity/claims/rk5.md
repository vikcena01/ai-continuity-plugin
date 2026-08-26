---
id: rk5
type: risk
title: >-
  Central mode silently breaks sharing — state lands in ~/.continuity outside
  the project repo and never reaches teammates
status: resolved
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T05:20:16.931Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  d6 establishes both modes exist but not that the choice is made silently, and
  picking the wrong one costs a teammate the entire state with no error.
---

Store.resolve (src/core/store.ts:97) picks a mode automatically: explicit project name → central, else a repo with .continuity/ above cwd → repo mode, else if exactly ONE central project exists → that one. Consequence: work done in central mode writes to ~/.continuity/projects/<name>/, a separate git repo in the developer's home directory that is invisible to the project repo, so a teammate cloning the project gets no state at all. Because resolution is automatic and silent, a developer can be in central mode without knowing it — note this machine already has four central projects (ctv-consolidation, es-query-gateway, ottoin, rm-stream-platform). The third resolution branch is the sharpest edge: a single central project becomes the fallback even when the user meant the repo. Rule to surface in docs/UX: for shared work .continuity/ must live in the repo; central mode is for solo/Desktop use where there is no project cwd.

FIXED in cb00387: Store.resolve refuses the lone-central-project fallback inside a git work tree (directing the user to `continuity init` instead), and central mode now states outright in resume that its state will not reach anyone who clones.
