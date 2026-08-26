---
id: rk2
type: risk
title: >-
  Concurrent capture across clones produces duplicate claim ids — git merges
  them silently
status: resolved
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

CORRECTED 2026-08-26 — the original text of this claim said git "merges them silently"
into duplicate ids. That is wrong, and the correction matters because it changes the
severity: both developers write the SAME path, .continuity/claims/d16.md, so git raises
an add/add merge CONFLICT. Verified by driving two real clones through a concurrent
capture. The damage was never silent duplication; it was (a) a merge conflict in a file
neither developer consciously wrote, on every concurrent capture, and (b) the natural
resolution — keep one side — silently discarding the other developer's claim, which
violates the append-only guarantee in d1.

nextId (src/core/store.ts) allocated ids by scanning only the LOCAL claims directory,
so two people each recording the Nth decision both landed on dN.

FIXED in cb00387: ids are now `<prefix><n><2-char suffix>`, e.g. d16k3. The sequence
number keeps them readable and ordered; the suffix is letter-first so it can never be
absorbed by the `^prefix(\d+)` parse. Two concurrent writers get d16k3 and d16m9 — two
files, clean merge, both claims preserved. Collision now needs the same sequence number
AND the same 2 of 936 suffixes. Covered by test/risks.sh, which merges two real clones.
