---
id: rk4
type: risk
title: >-
  Capture commits but never pushes, so teammates silently see stale state until
  someone pushes by hand
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T05:20:16.923Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  The multi-developer story depends on state actually reaching the remote, and
  the one step that makes that happen is manual and unprompted.
---

src/core/git.ts exposes commit/log/revert and no push at all — verified 2026-08-25. Autonomous capture therefore generates commits the developer never consciously made, which means the required push cadence is higher than their code-change cadence would suggest. A developer can have a productive session, not push (nothing in their own workflow prompts it), and a teammate who clones or pulls gets state as of the last push while the newest decisions sit local. Nothing warns about the gap on either side. This is normal git semantics, but it interacts badly with capture being invisible: the user is not aware state was written, so they are not aware it needs pushing. Options: a resume-time nudge when .continuity has unpushed commits, or surfacing unpushed-capture count in the resume header. Do not auto-push — that would be a surprising outbound action.
