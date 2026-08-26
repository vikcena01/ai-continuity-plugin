---
id: c5hi
type: constraint
title: This project must not be attributed to the work GitHub identity
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T06:17:49.493Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  The work email was deliberately purged from the entire history at the user's
  request, so pushing or authoring under the work account would undo the intent
  of that work through the back door.
---

Concretely: do NOT push, tag, or author commits on this repo using the `the work account` GitHub account, even though it is the account the local `gh` CLI happens to be authenticated as and is therefore the path of least resistance. The repo belongs to `vikcena01` and everything about it — remote, author email in the manifests, commit attribution — should stay on that personal identity. Commit metadata is currently clean: every commit is authored `continuity <continuity@local>`.
