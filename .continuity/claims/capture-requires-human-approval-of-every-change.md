---
id: capture-requires-human-approval-of-every-change
type: decision
title: Capture requires human approval of every change
status: superseded
confidence: confirmed
provenance:
  origin: manual
  created: '2026-08-04T07:41:18.788Z'
supersedes: []
superseded_by: capture-is-fully-autonomous-with-no-approval-gate
depends_on: []
tags: []
superseded_reason: >-
  an approval gate is synchronous+destructive — a snap human reject at capture
  time loses valuable state; event-sourcing already makes capture
  non-destructive, so the gate only added loss risk
---

AI proposes; human approves/edits/rejects before anything commits
