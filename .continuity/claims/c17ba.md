---
schema: 1
id: c17ba
type: constraint
title: >-
  Every tool annotation must be asserted behaviourally in tests — clients act on
  hints, so a false one is worse than none
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-09-03T08:54:51.040Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  create_project carried idempotentHint: true for two releases while duplicating
  a mission claim on every call, and the duplicate was invisible in the
  projection, so nothing surfaced it until an external directory rendered the
  badge and prompted a check.
---

readOnlyHint, idempotentHint and destructiveHint are a contract, not documentation. A client retries on timeout because a tool is marked idempotent, and warns a user because one is marked destructive.

The failure that produced this rule: Store.init recorded a mission unconditionally, so three create_project calls left three mission claims. renderResumeContext takes the FIRST live mission, so the duplicates never appeared in the resume — silent accumulation behind a hint that said it could not happen. The tool description compounded it by claiming existing claims were left untouched.

So: when adding or changing a tool, assert the annotation's behaviour, not its presence. test/mission.sh does this for init and freeze by calling each repeatedly and counting claims. Do not copy an annotation block from a neighbouring tool without checking it holds.
