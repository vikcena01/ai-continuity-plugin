---
id: rk6m3
type: risk
title: >-
  The published v1.0.0 tag is stale and the version is ambiguous — autonomous
  capture keeps committing after a tag is cut
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T06:25:10.058Z'
supersedes: []
superseded_by: null
depends_on: []
tags: []
reason: >-
  This will recur on every release of this project specifically, because the
  Stop hook writes a capture commit at the end of most turns: any tag cut
  mid-session is stale within a turn or two, and unlike a normal repo nobody has
  to run `git commit` for that drift to happen.
---

Found 2026-08-26, after the push. Tag v1.0.0 -> 0e560a5 predates the entire logo effort: assets/ does not exist at the tag, so there is no mark, no icon, no lockups, and the README there has no hero image. Fourteen commits landed on main afterwards, including the monogram redesign and the q6f8 corruption fix.

The sharper half of the defect: package.json declares "version": "1.0.0" at BOTH the tag and on main, so two different trees claim the same version and anyone pinning the tag gets an unbranded, pre-fix build.

Release rule to adopt: cut the tag LAST, after the final capture commit of the session, and verify with `git diff --stat <tag>..main` before pushing — not just that tests pass. Pairs with c4nc (rebuild and diff dist/ before releasing).
