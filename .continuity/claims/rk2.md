---
id: rk2
type: risk
title: >-
  Concurrent capture across clones produces duplicate claim ids — git merges
  them silently
status: accepted
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T05:17:40.521Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  Directly threatens the portable/shared premise of the project: the moment a
  second person captures state, ids silently collide with no conflict marker to
  warn anyone.
---

nextId (src/core/store.ts:205) allocates the next free id by scanning only the LOCAL claims directory. Two people each recording a decision on their own clone both get d16; the files are separate paths, so git merges both without a textual conflict and the state ends up with two d16.md-style claims under one id. `why d16` then becomes ambiguous and resume renders both. File-per-claim is otherwise a strong merge design — independent claims never textually conflict — so id allocation is the single place that assumes a single writer. Candidate fixes: content-hash or timestamp-based id suffixes, or a per-author prefix; either way ids must stay short and typeable (the stated reason for the scheme in store.ts:9).
