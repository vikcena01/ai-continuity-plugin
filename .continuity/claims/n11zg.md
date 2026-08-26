---
id: n11zg
type: next_action
title: >-
  Awaiting go-ahead on one combined force-push: fix attribution, re-tag v1.0.0,
  then verify the install path
status: open
confidence: confirmed
provenance:
  origin: auto
  created: '2026-08-26T06:25:10.063Z'
supersedes:
  - n10ra
superseded_by: null
depends_on: []
tags: []
---

Proposed, NOT yet approved — do not force-push without a fresh go-ahead:
  1. Patch src/core/git.ts so the forced continuity@local identity is a FALLBACK when git has no configured identity, not an unconditional override. Without this, every future capture commit is unattributed again — and this affects every user of the plugin on a public repo, not just this one.
  2. Rewrite all 72 commit authors to the personal identity with `filter-branch --env-filter` (q7f5). Note --tree-filter does NOT touch author metadata, which is why the earlier email purge left author fields alone.
  3. Remap the claim-body SHA references a second time (see d27c9).
  4. Re-tag v1.0.0 at the final main so the tag includes the branding. The alternative the user may prefer is never moving a published tag: bump all five version sites and cut v1.0.1 instead.
  5. Rerun the 69 assertions, confirm dist/ is in sync (c4nc), then `git push --force-with-lease --follow-tags`.
Then the still-outstanding checks: `/plugin marketplace add vikcena01/ai-continuity-plugin` from a FRESH session, and the GitHub-rendered README (<picture> switch, align=left float).

Repo-local git identity has already been set to the personal address, so hand-written commits attribute from here on — this also stops the work email in the GLOBAL config from leaking into future commits (c5hi).
